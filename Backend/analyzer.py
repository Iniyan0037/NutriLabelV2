import re
from db import get_alias_map, get_rules_map

RESTRICTION_PROFILES = {
    "vegan", "vegetarian", "eggetarian", "halal",
    "Jain", "nut-free", "dairy-free", "gluten-free",
}


def normalize_profiles(selected_profiles):
    normalized = []
    for profile in selected_profiles or []:
        if isinstance(profile, str) and profile in RESTRICTION_PROFILES:
            normalized.append(profile)
    return normalized


def split_ingredients(text):
    if not isinstance(text, str) or not text.strip():
        return []
    parts = re.split(r",|;|\.|\n", text)
    return [part.strip().lower() for part in parts if part.strip()]


def extract_e_numbers_from_text(text):
    if not isinstance(text, str):
        return []
    matches = re.findall(r"\be\s*-?\s*(\d{3,4}[a-z]?)\b", text.lower())
    return list(dict.fromkeys([f"e{match.replace(' ', '')}" for match in matches]))


def normalize_additive_tag(tag):
    if not isinstance(tag, str):
        return None
    tag = tag.lower().strip()
    if ":" in tag:
        tag = tag.split(":")[-1]
    tag = tag.replace("-", "").replace("_", "").strip()
    return tag if re.match(r"^e\d{3,4}[a-z]?$", tag) else None


def choose_stronger_status(current_status, new_status):
    order = {"Allowed": 0, "Uncertain": 1, "Restricted": 2}
    return new_status if order[new_status] > order[current_status] else current_status


def evaluate_rule_map(name, selected_profiles, rule_map, default_reason):
    final_status = "Allowed"
    reasons = []
    for profile in selected_profiles:
        if profile in rule_map:
            status, reason = rule_map[profile]
            final_status = choose_stronger_status(final_status, status)
            reasons.append(reason)
            if final_status == "Restricted":
                break
    if not reasons:
        reasons.append(default_reason)
    return {"name": name, "status": final_status, "reason": " ".join(dict.fromkeys(reasons))}


def resolve_term(name, term_type):
    alias_map = get_alias_map(term_type)
    return alias_map.get(name, name)


def evaluate_term(name, selected_profiles, term_type, missing_reason):
    normalized_name = (name or "").strip().lower()
    if not normalized_name:
        return None
    rules_map, defaults_map = get_rules_map(term_type)
    canonical_name = resolve_term(normalized_name, term_type)
    if canonical_name in rules_map or canonical_name in defaults_map:
        default_reason = defaults_map.get(canonical_name, ("Allowed", "No restriction conflict found."))[1]
        return evaluate_rule_map(canonical_name, selected_profiles, rules_map.get(canonical_name, {}), default_reason)
    for known_name in set(list(rules_map.keys()) + list(defaults_map.keys())):
        if known_name in canonical_name or canonical_name in known_name:
            default_reason = defaults_map.get(known_name, ("Allowed", "No restriction conflict found."))[1]
            return evaluate_rule_map(canonical_name, selected_profiles, rules_map.get(known_name, {}), default_reason)
    return {"name": canonical_name, "status": "Uncertain", "reason": missing_reason}


def deduplicate_results(results):
    deduped = {}
    for item in results:
        if not item:
            continue
        key = item["name"].strip().lower()
        if key not in deduped:
            deduped[key] = item
        else:
            existing = deduped[key]
            stronger = choose_stronger_status(existing["status"], item["status"])
            if stronger != existing["status"]:
                deduped[key] = item
            elif item["reason"] not in existing["reason"]:
                existing["reason"] = f"{existing['reason']} {item['reason']}".strip()
    return list(deduped.values())


def get_overall_result(results):
    if any(item["status"] == "Restricted" for item in results):
        return "Restricted"
    if any(item["status"] == "Uncertain" for item in results):
        return "Uncertain"
    return "Safe"


def build_summary(overall_result):
    if overall_result == "Restricted":
        return "This product is not suitable for your selected dietary restrictions."
    if overall_result == "Uncertain":
        return "This product may not be suitable for your selected dietary restrictions."
    if overall_result == "Safe":
        return "This product appears suitable for your selected dietary restrictions."
    return "No ingredients were available for analysis."


def analyze_ingredients(ingredient_text, selected_profiles, additives_tags=None, allergens_tags=None):
    normalized_profiles = normalize_profiles(selected_profiles)
    ingredient_items = split_ingredients(ingredient_text)
    text_e_numbers = extract_e_numbers_from_text(ingredient_text)
    additive_codes = []
    for tag in additives_tags or []:
        normalized = normalize_additive_tag(tag)
        if normalized:
            additive_codes.append(normalized)
    additive_codes.extend(text_e_numbers)
    additive_codes = list(dict.fromkeys(additive_codes))
    allergen_items = [tag for tag in (allergens_tags or []) if isinstance(tag, str)]
    results = []
    for ingredient in ingredient_items:
        evaluated = evaluate_term(ingredient, normalized_profiles, "ingredient", "This ingredient is not currently covered by the ingredient database.")
        if evaluated:
            results.append(evaluated)
    for additive_code in additive_codes:
        evaluated = evaluate_term(additive_code, normalized_profiles, "additive", "This additive is not currently covered by the additive database.")
        if evaluated:
            results.append(evaluated)
    for allergen in allergen_items:
        evaluated = evaluate_term(allergen, normalized_profiles, "allergen", "This allergen tag is not currently covered by the allergen database.")
        if evaluated:
            results.append(evaluated)
    results = deduplicate_results(results)
    if not results:
        overall_result = "Uncertain"
        summary = "No ingredients were available for analysis."
    else:
        overall_result = get_overall_result(results)
        summary = build_summary(overall_result)
    return {"overall_result": overall_result, "summary": summary, "ingredients": results}

import re

from db import lookup_rule


RESTRICTION_PROFILES = {
    "vegan",
    "vegetarian",
    "eggetarian",
    "halal",
    "Jain",
    "nut-free",
    "dairy-free",
    "gluten-free",
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

    parts = re.split(r",|;|\.", text)
    cleaned = []

    for part in parts:
        item = part.strip().lower()
        if item:
            cleaned.append(item)

    return cleaned


def normalize_possible_additive_code(raw):
    if not isinstance(raw, str):
        return None

    value = raw.lower().replace(" ", "").replace("-", "")
    value = value.replace("l", "1")

    if value.endswith("i") and len(value) >= 3 and value[:-1].isdigit():
        value = value[:-1] + "1"

    if value.isdigit() and len(value) in (3, 4):
        return f"e{value}"

    if re.match(r"^e\d{3,4}[a-z]?$", value):
        return value

    return None


def extract_e_numbers_from_text(text):
    if not isinstance(text, str):
        return []

    rough_matches = re.findall(r"\be\s*-?\s*([0-9]{2,4}[a-zil]?)\b", text.lower())
    codes = []

    for match in rough_matches:
        normalized = normalize_possible_additive_code(match)
        if normalized:
            codes.append(normalized)

    return list(dict.fromkeys(codes))


def normalize_additive_tag(tag):
    if not isinstance(tag, str):
        return None

    value = tag.lower().strip()
    if ":" in value:
        value = value.split(":")[-1]

    value = value.replace("_", "").replace("-", "").strip()

    return normalize_possible_additive_code(value)


def choose_stronger_status(current_status, new_status):
    order = {
        "Allowed": 0,
        "Uncertain": 1,
        "Restricted": 2,
    }
    return new_status if order[new_status] > order[current_status] else current_status


def combine_rule_rows(display_name, rows):
    final_status = "Allowed"
    reasons = []

    for row in rows:
        status = row["status"]
        reason = row["reason"]
        final_status = choose_stronger_status(final_status, status)

        if reason not in reasons:
            reasons.append(reason)

        if final_status == "Restricted":
            break

    return {
        "name": display_name,
        "status": final_status,
        "reason": " ".join(reasons) if reasons else "No restriction conflict found.",
    }


def evaluate_ingredient(name, selected_profiles):
    ingredient_name = (name or "").strip().lower()
    if not ingredient_name:
        return None

    rule_rows = lookup_rule("ingredient", ingredient_name, selected_profiles)

    if rule_rows == "__KNOWN_BUT_NO_CONFLICT__":
        return {
            "name": ingredient_name,
            "status": "Allowed",
            "reason": "No restriction conflict found.",
        }

    if rule_rows:
        return combine_rule_rows(ingredient_name, rule_rows)

    return {
        "name": ingredient_name,
        "status": "Uncertain",
        "reason": "This ingredient is not currently covered by the database rules.",
    }


def evaluate_additive(code, selected_profiles):
    additive_code = (code or "").strip().lower()
    if not additive_code:
        return None

    rule_rows = lookup_rule("additive", additive_code, selected_profiles)

    if rule_rows == "__KNOWN_BUT_NO_CONFLICT__":
        return {
            "name": additive_code,
            "status": "Allowed",
            "reason": "No restriction conflict found for this additive.",
        }

    if rule_rows:
        return combine_rule_rows(additive_code, rule_rows)

    return {
        "name": additive_code,
        "status": "Uncertain",
        "reason": "This additive is not currently covered by the database rules.",
    }


def evaluate_allergen(tag, selected_profiles):
    allergen_tag = (tag or "").strip().lower()
    if not allergen_tag:
        return None

    rule_rows = lookup_rule("allergen", allergen_tag, selected_profiles)

    if rule_rows == "__KNOWN_BUT_NO_CONFLICT__":
        return {
            "name": allergen_tag,
            "status": "Allowed",
            "reason": "No restriction conflict found for this allergen tag.",
        }

    if rule_rows:
        return combine_rule_rows(allergen_tag, rule_rows)

    return {
        "name": allergen_tag,
        "status": "Uncertain",
        "reason": "This allergen tag is not currently covered by the database rules.",
    }


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
        evaluated = evaluate_ingredient(ingredient, normalized_profiles)
        if evaluated:
            results.append(evaluated)

    for additive_code in additive_codes:
        evaluated = evaluate_additive(additive_code, normalized_profiles)
        if evaluated:
            results.append(evaluated)

    for allergen in allergen_items:
        evaluated = evaluate_allergen(allergen, normalized_profiles)
        if evaluated:
            results.append(evaluated)

    results = deduplicate_results(results)

    if not results:
        overall_result = "Uncertain"
        summary = "No ingredients were available for analysis."
    else:
        overall_result = get_overall_result(results)
        summary = build_summary(overall_result)

    return {
        "overall_result": overall_result,
        "summary": summary,
        "ingredients": results,
    }

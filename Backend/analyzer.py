import re

from db import SessionLocal, Rule, Alias, ENumber, Allergen

VALID_PROFILES = {
    "vegan",
    "vegetarian",
    "eggetarian",
    "halal",
    "Jain",
    "nut-free",
    "dairy-free",
    "gluten-free",
}

STATUS_PRIORITY = {
    "Allowed": 0,
    "Uncertain": 1,
    "Restricted": 2,
}


def normalize_profile(profile):
    if str(profile).strip().lower() == "jain":
        return "Jain"
    return str(profile).strip()


def normalize_profiles(selected_profiles):
    profiles = []

    for profile in selected_profiles or []:
        normalized = normalize_profile(profile)

        if normalized in VALID_PROFILES and normalized not in profiles:
            profiles.append(normalized)

    return profiles


def clean_ingredient_text(text):
    text = text or ""
    text = text.lower()

    text = re.sub(r"\bingredients?\s*:", "", text)
    text = re.sub(r"\bcontains\s*:", ", contains ", text)
    text = re.sub(r"\btotal milk solids\s*:", ", total milk solids ", text)
    text = re.sub(r"\btotal cocoa solids\s*:", ", total cocoa solids ", text)

    text = re.sub(r"\d+(\.\d+)?\s*%", " ", text)
    text = re.sub(r"\([^)]*\)", " ", text)

    text = text.replace(".", ",")
    text = text.replace(";", ",")

    text = re.sub(r"[^a-z0-9,\- ]+", " ", text)
    text = re.sub(r"\s+", " ", text)

    return text.strip()


def split_ingredients(text):
    cleaned = clean_ingredient_text(text)

    if not cleaned:
        return []

    raw_parts = [part.strip() for part in cleaned.split(",")]
    ingredients = []

    junk_prefixes = [
        "contains ",
        "may contain ",
        "total ",
    ]

    for part in raw_parts:
        item = part.strip()

        for prefix in junk_prefixes:
            if item.startswith(prefix):
                item = item.replace(prefix, "", 1).strip()

        if not item:
            continue

        if len(item) < 2:
            continue

        if item not in ingredients:
            ingredients.append(item)

    return ingredients


def extract_e_numbers(text):
    if not text:
        return []

    matches = re.findall(r"\be\s*-?\s*(\d{3,4}[a-z]?)\b", text.lower())
    return list(dict.fromkeys([f"e{match}".replace(" ", "").replace("-", "") for match in matches]))


def stronger_status(current, new):
    return new if STATUS_PRIORITY.get(new, 0) > STATUS_PRIORITY.get(current, 0) else current


def get_all_aliases_sorted(db):
    aliases = db.query(Alias).all()

    return sorted(
        aliases,
        key=lambda alias: len(alias.alias_name or ""),
        reverse=True,
    )


def resolve_alias(db, ingredient):
    normalized = ingredient.lower().strip()

    exact_alias = db.query(Alias).filter(Alias.alias_name == normalized).first()

    if exact_alias:
        return exact_alias.actual_name.lower().strip(), "alias_exact"

    exact_rule = db.query(Rule).filter(Rule.ingredient_name == normalized).first()

    if exact_rule:
        return normalized, "rule_exact"

    aliases = get_all_aliases_sorted(db)

    for alias in aliases:
        alias_name = (alias.alias_name or "").lower().strip()

        if not alias_name:
            continue

        if len(alias_name) < 3:
            continue

        pattern = r"(^|[^a-z0-9])" + re.escape(alias_name) + r"([^a-z0-9]|$)"

        if re.search(pattern, normalized):
            return alias.actual_name.lower().strip(), "alias_partial"

    all_rules = db.query(Rule).all()
    all_rules = sorted(
        all_rules,
        key=lambda rule: len(rule.ingredient_name or ""),
        reverse=True,
    )

    for rule in all_rules:
        rule_name = (rule.ingredient_name or "").lower().strip()

        if not rule_name:
            continue

        if len(rule_name) < 3:
            continue

        pattern = r"(^|[^a-z0-9])" + re.escape(rule_name) + r"([^a-z0-9]|$)"

        if re.search(pattern, normalized):
            return rule_name, "rule_partial"

    singular = normalized[:-1] if normalized.endswith("s") else normalized

    if singular != normalized:
        alias = db.query(Alias).filter(Alias.alias_name == singular).first()

        if alias:
            return alias.actual_name.lower().strip(), "alias_singular"

        rule = db.query(Rule).filter(Rule.ingredient_name == singular).first()

        if rule:
            return singular, "rule_singular"

    return normalized, "none"


def get_rules_for_name(db, name, selected_profiles):
    return (
        db.query(Rule)
        .filter(
            Rule.ingredient_name == name,
            Rule.profile.in_(selected_profiles),
        )
        .all()
    )


def get_e_number_info(db, name):
    return db.query(ENumber).filter(ENumber.e_number == name.lower()).first()


def get_allergen_matches(db, name, selected_profiles):
    return (
        db.query(Allergen)
        .filter(
            Allergen.ingredient_name == name,
            Allergen.allergen_type.in_(selected_profiles),
        )
        .all()
    )


def evaluate_single_ingredient(db, original_ingredient, selected_profiles):
    canonical_name, match_type = resolve_alias(db, original_ingredient)

    final_status = "Allowed"
    reasons = []
    matched_profiles = []

    rules = get_rules_for_name(db, canonical_name, selected_profiles)

    for rule in rules:
        final_status = stronger_status(final_status, rule.status)
        reasons.append(rule.reason)
        matched_profiles.append(rule.profile)

    allergen_matches = get_allergen_matches(db, canonical_name, selected_profiles)

    for allergen in allergen_matches:
        final_status = stronger_status(final_status, "Restricted")
        reasons.append(
            f"{canonical_name} conflicts with the selected {allergen.allergen_type} profile."
        )
        matched_profiles.append(allergen.allergen_type)

        if match_type == "none":
            match_type = "allergen"

    e_number_info = get_e_number_info(db, canonical_name)

    if e_number_info:
        if match_type == "none":
            match_type = "e_number"

        if not rules:
            if "halal" in selected_profiles and e_number_info.halal_status:
                halal_status = e_number_info.halal_status.lower()

                if "haram" in halal_status or "not halal" in halal_status:
                    final_status = stronger_status(final_status, "Restricted")
                    reasons.append(
                        f"{canonical_name.upper()} ({e_number_info.name}) is marked as not halal in the additives dataset."
                    )
                    matched_profiles.append("halal")

                elif (
                    "mushbooh" in halal_status
                    or "doubt" in halal_status
                    or "unknown" in halal_status
                    or "questionable" in halal_status
                ):
                    final_status = stronger_status(final_status, "Uncertain")
                    reasons.append(
                        f"{canonical_name.upper()} ({e_number_info.name}) may require halal verification."
                    )
                    matched_profiles.append("halal")

            if final_status == "Allowed":
                reasons.append(
                    f"{canonical_name.upper()} ({e_number_info.name}) was found in the additives dataset with no selected-profile restriction."
                )

    if not rules and not allergen_matches and not e_number_info:
        final_status = "Uncertain"
        reasons.append(
            "No matching rule was found in the database, so this ingredient is marked as uncertain."
        )

    if rules and not reasons:
        reasons.append("A matching dietary rule was found in the database.")

    return {
        "ingredient": original_ingredient,
        "matched_name": canonical_name,
        "status": final_status,
        "matched_profiles": list(dict.fromkeys(matched_profiles)),
        "reason": " ".join(dict.fromkeys(reasons)),
        "match_type": match_type,
    }


def evaluate_external_tags(db, tags, selected_profiles, tag_type):
    results = []

    for tag in tags or []:
        if not isinstance(tag, str):
            continue

        cleaned = tag.lower().strip()

        if ":" in cleaned:
            cleaned = cleaned.split(":")[-1]

        cleaned = cleaned.replace("_", " ").strip()

        if not cleaned:
            continue

        result = evaluate_single_ingredient(db, cleaned, selected_profiles)
        result["source"] = tag_type
        results.append(result)

    return results


def calculate_overall_status(items):
    status = "Allowed"

    for item in items:
        status = stronger_status(status, item.get("status", "Allowed"))

    return status


def analyze_ingredients(
    ingredient_text,
    selected_profiles,
    additives_tags=None,
    allergens_tags=None,
):
    profiles = normalize_profiles(selected_profiles)

    if not profiles:
        return {
            "status": "Uncertain",
            "selected_profiles": [],
            "ingredients_analysis": [],
            "additives_analysis": [],
            "allergens_analysis": [],
            "summary": "No dietary profile was selected.",
        }

    ingredient_list = split_ingredients(ingredient_text)
    e_numbers = extract_e_numbers(ingredient_text)

    for e_number in e_numbers:
        if e_number not in ingredient_list:
            ingredient_list.append(e_number)

    db = SessionLocal()

    try:
        ingredient_results = [
            evaluate_single_ingredient(db, ingredient, profiles)
            for ingredient in ingredient_list
        ]

        additive_results = evaluate_external_tags(
            db,
            additives_tags or [],
            profiles,
            "open_food_facts_additive",
        )

        allergen_results = evaluate_external_tags(
            db,
            allergens_tags or [],
            profiles,
            "open_food_facts_allergen",
        )

        all_results = ingredient_results + additive_results + allergen_results
        overall_status = calculate_overall_status(all_results)

        return {
            "status": overall_status,
            "selected_profiles": profiles,
            "ingredients_analysis": ingredient_results,
            "additives_analysis": additive_results,
            "allergens_analysis": allergen_results,
            "summary": build_summary(overall_status, profiles),
        }

    finally:
        db.close()


def build_summary(status, selected_profiles):
    profile_text = ", ".join(selected_profiles)

    if status == "Restricted":
        return f"This product is not suitable for the selected profile(s): {profile_text}."

    if status == "Uncertain":
        return f"This product needs further checking for the selected profile(s): {profile_text}."

    return f"No restriction conflict was found for the selected profile(s): {profile_text}."

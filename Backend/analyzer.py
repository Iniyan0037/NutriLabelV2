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
    if profile == "jain":
        return "Jain"
    return profile


def normalize_profiles(selected_profiles):
    profiles = []

    for profile in selected_profiles or []:
        if not isinstance(profile, str):
            continue

        normalized = normalize_profile(profile.strip())

        if normalized in VALID_PROFILES and normalized not in profiles:
            profiles.append(normalized)

    return profiles


def clean_ingredient_text(text):
    text = text or ""
    text = text.lower()
    text = re.sub(r"ingredients?:", "", text)
    text = re.sub(r"may contain.*", "", text)
    text = re.sub(r"\([^)]*\)", " ", text)
    text = re.sub(r"\d+(\.\d+)?\s*%", " ", text)
    text = re.sub(r"[^a-z0-9,\- ]+", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def split_ingredients(text):
    cleaned = clean_ingredient_text(text)

    if not cleaned:
        return []

    parts = re.split(r",|;", cleaned)
    ingredients = []

    for part in parts:
        item = part.strip()
        if item and item not in ingredients:
            ingredients.append(item)

    return ingredients


def extract_e_numbers(text):
    if not text:
        return []

    matches = re.findall(r"\be\s*-?\s*(\d{3,4}[a-z]?)\b", text.lower())
    return list(dict.fromkeys([f"e{match}".replace(" ", "").replace("-", "") for match in matches]))


def stronger_status(current, new):
    return new if STATUS_PRIORITY.get(new, 0) > STATUS_PRIORITY.get(current, 0) else current


def resolve_alias(db, ingredient):
    normalized = ingredient.lower().strip()

    alias = db.query(Alias).filter(Alias.alias_name == normalized).first()

    if alias:
        return alias.actual_name.lower().strip()

    return normalized


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
    canonical_name = resolve_alias(db, original_ingredient)

    final_status = "Allowed"
    reasons = []
    matched_profiles = []
    match_type = "direct"

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
        match_type = "allergen"

    e_number_info = get_e_number_info(db, canonical_name)

    if e_number_info:
        match_type = "e_number"

        if not rules:
            if e_number_info.halal_status and "halal" in selected_profiles:
                halal_status = e_number_info.halal_status.lower()

                if "haram" in halal_status or "not halal" in halal_status:
                    final_status = stronger_status(final_status, "Restricted")
                    reasons.append(
                        f"{canonical_name.upper()} ({e_number_info.name}) is marked as not halal in the additives dataset."
                    )
                    matched_profiles.append("halal")
                elif "mushbooh" in halal_status or "doubt" in halal_status or "unknown" in halal_status:
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

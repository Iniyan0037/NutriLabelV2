import os
from sqlalchemy import create_engine, text

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is not set")

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    future=True,
)


DEFAULT_RULES = [
    # Common safe ingredients
    ("ingredient", "sugar", "*", "Allowed", "Sugar does not conflict with the selected dietary profiles."),
    ("ingredient", "salt", "*", "Allowed", "Salt does not conflict with the selected dietary profiles."),
    ("ingredient", "water", "*", "Allowed", "Water does not conflict with the selected dietary profiles."),
    ("ingredient", "rice flour", "*", "Allowed", "Rice flour does not conflict with the selected dietary profiles."),
    ("ingredient", "corn flour", "*", "Allowed", "Corn flour does not conflict with the selected dietary profiles."),
    ("ingredient", "maize starch", "*", "Allowed", "Maize starch does not conflict with the selected dietary profiles."),
    ("ingredient", "cocoa powder", "*", "Allowed", "Cocoa powder does not conflict with the selected dietary profiles."),
    ("ingredient", "vegetable oil", "*", "Allowed", "Vegetable oil does not conflict with the selected dietary profiles."),
    ("ingredient", "sunflower oil", "*", "Allowed", "Sunflower oil does not conflict with the selected dietary profiles."),
    ("ingredient", "canola oil", "*", "Allowed", "Canola oil does not conflict with the selected dietary profiles."),
    ("ingredient", "soy lecithin", "*", "Allowed", "Soy lecithin does not directly conflict with the selected dietary profiles."),
    ("ingredient", "flavour", "*", "Uncertain", "Flavour is too generic and may require further verification."),
    ("ingredient", "flavor", "*", "Uncertain", "Flavor is too generic and may require further verification."),
    ("ingredient", "natural flavour", "*", "Uncertain", "Natural flavour is too generic and may require further verification."),
    ("ingredient", "natural flavor", "*", "Uncertain", "Natural flavor is too generic and may require further verification."),

    # Dairy / animal-derived / egg
    ("ingredient", "milk", "vegan", "Restricted", "Milk is animal-derived and not suitable for vegan diets."),
    ("ingredient", "milk", "dairy-free", "Restricted", "Milk conflicts with dairy-free diets."),
    ("ingredient", "milk solids", "vegan", "Restricted", "Milk solids are animal-derived and not suitable for vegan diets."),
    ("ingredient", "milk solids", "dairy-free", "Restricted", "Milk solids conflict with dairy-free diets."),
    ("ingredient", "cheese", "vegan", "Restricted", "Cheese is dairy and not suitable for vegan diets."),
    ("ingredient", "cheese", "dairy-free", "Restricted", "Cheese conflicts with dairy-free diets."),
    ("ingredient", "butter", "vegan", "Restricted", "Butter is dairy and not suitable for vegan diets."),
    ("ingredient", "butter", "dairy-free", "Restricted", "Butter conflicts with dairy-free diets."),
    ("ingredient", "cream", "vegan", "Restricted", "Cream is dairy and not suitable for vegan diets."),
    ("ingredient", "cream", "dairy-free", "Restricted", "Cream conflicts with dairy-free diets."),
    ("ingredient", "whey", "vegan", "Restricted", "Whey is dairy-derived and not suitable for vegan diets."),
    ("ingredient", "whey", "dairy-free", "Restricted", "Whey conflicts with dairy-free diets."),
    ("ingredient", "casein", "vegan", "Restricted", "Casein is milk-derived and not suitable for vegan diets."),
    ("ingredient", "casein", "dairy-free", "Restricted", "Casein conflicts with dairy-free diets."),
    ("ingredient", "egg", "vegan", "Restricted", "Egg is not suitable for vegan diets."),
    ("ingredient", "egg", "Jain", "Restricted", "Egg conflicts with Jain dietary restrictions."),
    ("ingredient", "egg powder", "vegan", "Restricted", "Egg powder is not suitable for vegan diets."),
    ("ingredient", "egg powder", "Jain", "Restricted", "Egg powder conflicts with Jain dietary restrictions."),
    ("ingredient", "gelatin", "vegan", "Restricted", "Gelatin is animal-derived and not suitable for vegan diets."),
    ("ingredient", "gelatin", "vegetarian", "Restricted", "Gelatin is not suitable for vegetarian diets."),
    ("ingredient", "gelatin", "eggetarian", "Restricted", "Gelatin is not suitable for eggetarian diets."),
    ("ingredient", "gelatin", "Jain", "Restricted", "Gelatin conflicts with Jain dietary restrictions."),
    ("ingredient", "gelatin", "halal", "Uncertain", "Gelatin source may require halal verification."),
    ("ingredient", "gelatine", "vegan", "Restricted", "Gelatine is animal-derived and not suitable for vegan diets."),
    ("ingredient", "gelatine", "vegetarian", "Restricted", "Gelatine is not suitable for vegetarian diets."),
    ("ingredient", "gelatine", "eggetarian", "Restricted", "Gelatine is not suitable for eggetarian diets."),
    ("ingredient", "gelatine", "Jain", "Restricted", "Gelatine conflicts with Jain dietary restrictions."),
    ("ingredient", "gelatine", "halal", "Uncertain", "Gelatine source may require halal verification."),
    ("ingredient", "honey", "vegan", "Restricted", "Honey is generally not considered suitable for vegan diets."),

    # Gluten
    ("ingredient", "wheat flour", "gluten-free", "Restricted", "Wheat flour contains gluten and conflicts with gluten-free diets."),
    ("ingredient", "barley malt", "gluten-free", "Restricted", "Barley malt contains gluten and conflicts with gluten-free diets."),
    ("ingredient", "rye flour", "gluten-free", "Restricted", "Rye flour contains gluten and conflicts with gluten-free diets."),

    # Nuts
    ("ingredient", "almond", "nut-free", "Restricted", "Almond conflicts with nut-free diets."),
    ("ingredient", "peanut", "nut-free", "Restricted", "Peanut conflicts with nut-free diets."),
    ("ingredient", "cashew", "nut-free", "Restricted", "Cashew conflicts with nut-free diets."),
    ("ingredient", "hazelnut", "nut-free", "Restricted", "Hazelnut conflicts with nut-free diets."),
    ("ingredient", "walnut", "nut-free", "Restricted", "Walnut conflicts with nut-free diets."),
    ("ingredient", "pistachio", "nut-free", "Restricted", "Pistachio conflicts with nut-free diets."),

    # Jain-sensitive
    ("ingredient", "garlic", "Jain", "Restricted", "Garlic conflicts with Jain dietary restrictions."),
    ("ingredient", "onion", "Jain", "Restricted", "Onion conflicts with Jain dietary restrictions."),
    ("ingredient", "potato", "Jain", "Restricted", "Potato conflicts with Jain dietary restrictions."),
    ("ingredient", "beetroot", "Jain", "Restricted", "Beetroot conflicts with Jain dietary restrictions."),
    ("ingredient", "carrot", "Jain", "Restricted", "Carrot may conflict with strict Jain dietary restrictions."),

    # Additives
    ("additive", "e120", "vegan", "Restricted", "E120 is cochineal/carmine and is insect-derived."),
    ("additive", "e120", "vegetarian", "Restricted", "E120 is insect-derived."),
    ("additive", "e120", "eggetarian", "Restricted", "E120 is insect-derived."),
    ("additive", "e120", "Jain", "Restricted", "E120 is insect-derived and conflicts with Jain dietary restrictions."),
    ("additive", "e120", "halal", "Uncertain", "E120 source and certification may require halal verification."),

    ("additive", "e441", "vegan", "Restricted", "E441 is gelatin and is animal-derived."),
    ("additive", "e441", "vegetarian", "Restricted", "E441 is gelatin and is not suitable for vegetarian diets."),
    ("additive", "e441", "eggetarian", "Restricted", "E441 is gelatin and is not suitable for eggetarian diets."),
    ("additive", "e441", "Jain", "Restricted", "E441 is gelatin and conflicts with Jain dietary restrictions."),
    ("additive", "e441", "halal", "Uncertain", "E441 source may require halal verification."),

    ("additive", "e471", "vegan", "Uncertain", "E471 may be derived from plant or animal sources."),
    ("additive", "e471", "halal", "Uncertain", "E471 origin may require halal verification."),

    ("additive", "e472", "vegan", "Uncertain", "E472 may be derived from plant or animal sources."),
    ("additive", "e472", "halal", "Uncertain", "E472 origin may require halal verification."),

    ("additive", "e322", "vegan", "Uncertain", "E322 lecithin source may vary depending on formulation."),
    ("additive", "e322", "halal", "Uncertain", "E322 source may require halal verification."),

    ("additive", "e542", "vegan", "Restricted", "E542 is bone phosphate and is animal-derived."),
    ("additive", "e542", "vegetarian", "Restricted", "E542 is animal-derived."),
    ("additive", "e542", "eggetarian", "Restricted", "E542 is animal-derived."),
    ("additive", "e542", "Jain", "Restricted", "E542 conflicts with Jain dietary restrictions."),
    ("additive", "e542", "halal", "Uncertain", "E542 source may require halal verification."),

    ("additive", "e631", "vegan", "Uncertain", "E631 may be produced from animal or plant sources."),
    ("additive", "e631", "vegetarian", "Uncertain", "E631 source may require verification."),
    ("additive", "e631", "eggetarian", "Uncertain", "E631 source may require verification."),
    ("additive", "e631", "halal", "Uncertain", "E631 source may require halal verification."),
    ("additive", "e631", "Jain", "Uncertain", "E631 source may require verification."),

    ("additive", "e627", "vegan", "Uncertain", "E627 may be produced from animal or plant sources."),
    ("additive", "e627", "vegetarian", "Uncertain", "E627 source may require verification."),
    ("additive", "e627", "eggetarian", "Uncertain", "E627 source may require verification."),
    ("additive", "e627", "halal", "Uncertain", "E627 source may require halal verification."),
    ("additive", "e627", "Jain", "Uncertain", "E627 source may require verification."),

    # Allergens
    ("allergen", "en:milk", "vegan", "Restricted", "Milk allergen indicates dairy content, which is not suitable for vegan diets."),
    ("allergen", "en:milk", "dairy-free", "Restricted", "Milk allergen conflicts with dairy-free diets."),
    ("allergen", "en:nuts", "nut-free", "Restricted", "Nut allergen conflicts with nut-free diets."),
    ("allergen", "en:peanuts", "nut-free", "Restricted", "Peanut allergen conflicts with nut-free diets."),
    ("allergen", "en:gluten", "gluten-free", "Restricted", "Gluten allergen conflicts with gluten-free diets."),
    ("allergen", "en:wheat", "gluten-free", "Restricted", "Wheat allergen conflicts with gluten-free diets."),
    ("allergen", "en:eggs", "vegan", "Restricted", "Egg allergen conflicts with vegan diets."),
    ("allergen", "en:eggs", "Jain", "Restricted", "Egg allergen conflicts with Jain dietary restrictions."),
]

DEFAULT_ALIASES = [
    ("e44i", "e441", "additive"),
    ("e47i", "e471", "additive"),
    ("e47l", "e471", "additive"),
    ("e32z", "e322", "additive"),
]


def init_db():
    with engine.begin() as conn:
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS rules (
                id SERIAL PRIMARY KEY,
                rule_type TEXT NOT NULL,
                name TEXT NOT NULL,
                profile_name TEXT NOT NULL,
                status TEXT NOT NULL,
                reason TEXT NOT NULL,
                UNIQUE(rule_type, name, profile_name)
            )
        """))

        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS aliases (
                alias TEXT PRIMARY KEY,
                canonical_name TEXT NOT NULL,
                rule_type TEXT NOT NULL
            )
        """))

        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_rules_type_name
            ON rules(rule_type, name)
        """))

        rules_count = conn.execute(text("SELECT COUNT(*) FROM rules")).scalar_one()
        aliases_count = conn.execute(text("SELECT COUNT(*) FROM aliases")).scalar_one()

        if rules_count == 0:
            for rule_type, name, profile_name, status, reason in DEFAULT_RULES:
                conn.execute(
                    text("""
                        INSERT INTO rules (rule_type, name, profile_name, status, reason)
                        VALUES (:rule_type, :name, :profile_name, :status, :reason)
                    """),
                    {
                        "rule_type": rule_type,
                        "name": name,
                        "profile_name": profile_name,
                        "status": status,
                        "reason": reason,
                    },
                )

        if aliases_count == 0:
            for alias, canonical_name, rule_type in DEFAULT_ALIASES:
                conn.execute(
                    text("""
                        INSERT INTO aliases (alias, canonical_name, rule_type)
                        VALUES (:alias, :canonical_name, :rule_type)
                    """),
                    {
                        "alias": alias,
                        "canonical_name": canonical_name,
                        "rule_type": rule_type,
                    },
                )


def resolve_alias(name, rule_type):
    normalized_name = (name or "").strip().lower()
    if not normalized_name:
        return normalized_name

    with engine.begin() as conn:
        row = conn.execute(
            text("""
                SELECT canonical_name
                FROM aliases
                WHERE alias = :alias AND rule_type = :rule_type
            """),
            {
                "alias": normalized_name,
                "rule_type": rule_type,
            },
        ).mappings().first()

    if row:
        return row["canonical_name"]

    return normalized_name


def lookup_rule(rule_type, name, selected_profiles):
    normalized_name = (name or "").strip().lower()
    if not normalized_name:
        return None

    canonical_name = resolve_alias(normalized_name, rule_type)

    with engine.begin() as conn:
        exact_rows = conn.execute(
            text("""
                SELECT name, profile_name, status, reason
                FROM rules
                WHERE rule_type = :rule_type
                  AND name = :name
            """),
            {
                "rule_type": rule_type,
                "name": canonical_name,
            },
        ).mappings().all()

        partial_rows = []
        if not exact_rows:
            partial_rows = conn.execute(
                text("""
                    SELECT name, profile_name, status, reason
                    FROM rules
                    WHERE rule_type = :rule_type
                      AND :candidate LIKE '%' || name || '%'
                    ORDER BY LENGTH(name) DESC
                """),
                {
                    "rule_type": rule_type,
                    "candidate": canonical_name,
                },
            ).mappings().all()

    rows = exact_rows if exact_rows else partial_rows

    if not rows:
        return None

    matched_rows = [
        row for row in rows
        if row["profile_name"] in selected_profiles or row["profile_name"] == "*"
    ]

    if matched_rows:
        return matched_rows

    return "__KNOWN_BUT_NO_CONFLICT__"


def get_db_status():
    with engine.begin() as conn:
        rules_count = conn.execute(text("SELECT COUNT(*) FROM rules")).scalar_one()
        aliases_count = conn.execute(text("SELECT COUNT(*) FROM aliases")).scalar_one()

    return {
        "rules_count": rules_count,
        "aliases_count": aliases_count,
    }

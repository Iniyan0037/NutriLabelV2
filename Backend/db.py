import os
import sqlite3
from pathlib import Path

DB_PATH = os.getenv("NUTRILABEL_DB_PATH") or str(Path(__file__).with_name("nutrilabel.db"))

SEED_RULES = [
    ("sugar", "ingredient", None, "Allowed", "Sugar does not conflict with the selected dietary profiles."),
    ("salt", "ingredient", None, "Allowed", "Salt does not conflict with the selected dietary profiles."),
    ("water", "ingredient", None, "Allowed", "Water does not conflict with the selected dietary profiles."),
    ("rice flour", "ingredient", None, "Allowed", "Rice flour does not conflict with the selected dietary profiles."),
    ("corn flour", "ingredient", None, "Allowed", "Corn flour does not conflict with the selected dietary profiles."),
    ("maize flour", "ingredient", None, "Allowed", "Maize flour does not conflict with the selected dietary profiles."),
    ("cocoa butter", "ingredient", None, "Allowed", "Cocoa butter does not conflict with the selected dietary profiles."),
    ("cocoa mass", "ingredient", None, "Allowed", "Cocoa mass does not conflict with the selected dietary profiles."),
    ("glucose syrup", "ingredient", None, "Allowed", "Glucose syrup does not conflict with the selected dietary profiles."),
    ("dextrose", "ingredient", None, "Allowed", "Dextrose does not conflict with the selected dietary profiles."),
    ("starch", "ingredient", None, "Allowed", "Starch does not conflict with the selected dietary profiles unless another source is specified."),
    ("tapioca starch", "ingredient", None, "Allowed", "Tapioca starch does not conflict with the selected dietary profiles."),
    ("canola oil", "ingredient", None, "Allowed", "Canola oil does not conflict with the selected dietary profiles."),
    ("sunflower oil", "ingredient", None, "Allowed", "Sunflower oil does not conflict with the selected dietary profiles."),
    ("vegetable oil", "ingredient", None, "Allowed", "Vegetable oil does not conflict with the selected dietary profiles unless another source is specified."),
    ("soy lecithin", "ingredient", None, "Allowed", "Soy lecithin does not conflict with the selected dietary profiles."),
    ("milk", "ingredient", "vegan", "Restricted", "Milk is animal-derived and not suitable for vegan diets."),
    ("milk", "ingredient", "dairy-free", "Restricted", "Milk conflicts with dairy-free diets."),
    ("milk solids", "ingredient", "vegan", "Restricted", "Milk solids are animal-derived and not suitable for vegan diets."),
    ("milk solids", "ingredient", "dairy-free", "Restricted", "Milk solids conflict with dairy-free diets."),
    ("whey", "ingredient", "vegan", "Restricted", "Whey is dairy-derived and not suitable for vegan diets."),
    ("whey", "ingredient", "dairy-free", "Restricted", "Whey conflicts with dairy-free diets."),
    ("butter", "ingredient", "vegan", "Restricted", "Butter is dairy-derived and not suitable for vegan diets."),
    ("butter", "ingredient", "dairy-free", "Restricted", "Butter conflicts with dairy-free diets."),
    ("cheese", "ingredient", "vegan", "Restricted", "Cheese is dairy-derived and not suitable for vegan diets."),
    ("cheese", "ingredient", "dairy-free", "Restricted", "Cheese conflicts with dairy-free diets."),
    ("cream", "ingredient", "vegan", "Restricted", "Cream is dairy-derived and not suitable for vegan diets."),
    ("cream", "ingredient", "dairy-free", "Restricted", "Cream conflicts with dairy-free diets."),
    ("casein", "ingredient", "vegan", "Restricted", "Casein is dairy-derived and not suitable for vegan diets."),
    ("casein", "ingredient", "dairy-free", "Restricted", "Casein conflicts with dairy-free diets."),
    ("lactose", "ingredient", "vegan", "Restricted", "Lactose is dairy-derived and not suitable for vegan diets."),
    ("lactose", "ingredient", "dairy-free", "Restricted", "Lactose conflicts with dairy-free diets."),
    ("egg", "ingredient", "vegan", "Restricted", "Egg is not suitable for vegan diets."),
    ("egg", "ingredient", "Jain", "Restricted", "Egg conflicts with Jain dietary restrictions."),
    ("eggs", "ingredient", "vegan", "Restricted", "Eggs are not suitable for vegan diets."),
    ("eggs", "ingredient", "Jain", "Restricted", "Eggs conflict with Jain dietary restrictions."),
    ("gelatin", "ingredient", "vegan", "Restricted", "Gelatin is animal-derived and not suitable for vegan diets."),
    ("gelatin", "ingredient", "vegetarian", "Restricted", "Gelatin is not suitable for vegetarian diets."),
    ("gelatin", "ingredient", "eggetarian", "Restricted", "Gelatin is not suitable for eggetarian diets."),
    ("gelatin", "ingredient", "Jain", "Restricted", "Gelatin conflicts with Jain dietary restrictions."),
    ("gelatin", "ingredient", "halal", "Uncertain", "Gelatin source may require halal verification."),
    ("honey", "ingredient", "vegan", "Restricted", "Honey is not suitable for vegan diets."),
    ("onion", "ingredient", "Jain", "Restricted", "Onion conflicts with Jain dietary restrictions."),
    ("garlic", "ingredient", "Jain", "Restricted", "Garlic conflicts with Jain dietary restrictions."),
    ("wheat flour", "ingredient", "gluten-free", "Restricted", "Wheat flour contains gluten and conflicts with gluten-free diets."),
    ("wheat starch", "ingredient", "gluten-free", "Restricted", "Wheat starch conflicts with gluten-free diets unless explicitly certified gluten-free."),
    ("barley malt", "ingredient", "gluten-free", "Restricted", "Barley malt contains gluten and conflicts with gluten-free diets."),
    ("almond", "ingredient", "nut-free", "Restricted", "Almond conflicts with nut-free diets."),
    ("peanut", "ingredient", "nut-free", "Restricted", "Peanut conflicts with nut-free diets."),
    ("cashew", "ingredient", "nut-free", "Restricted", "Cashew conflicts with nut-free diets."),
    ("hazelnut", "ingredient", "nut-free", "Restricted", "Hazelnut conflicts with nut-free diets."),
    ("pistachio", "ingredient", "nut-free", "Restricted", "Pistachio conflicts with nut-free diets."),
    ("walnut", "ingredient", "nut-free", "Restricted", "Walnut conflicts with nut-free diets."),
    ("e120", "additive", "vegan", "Restricted", "E120 is cochineal/carmine and is insect-derived."),
    ("e120", "additive", "vegetarian", "Restricted", "E120 is insect-derived."),
    ("e120", "additive", "eggetarian", "Restricted", "E120 is insect-derived."),
    ("e120", "additive", "Jain", "Restricted", "E120 is insect-derived and conflicts with Jain dietary restrictions."),
    ("e120", "additive", "halal", "Uncertain", "E120 source and certification may require halal verification."),
    ("e441", "additive", "vegan", "Restricted", "E441 is gelatin and is animal-derived."),
    ("e441", "additive", "vegetarian", "Restricted", "E441 is gelatin and is not suitable for vegetarian diets."),
    ("e441", "additive", "eggetarian", "Restricted", "E441 is gelatin and is not suitable for eggetarian diets."),
    ("e441", "additive", "Jain", "Restricted", "E441 is gelatin and conflicts with Jain dietary restrictions."),
    ("e441", "additive", "halal", "Uncertain", "E441 source may require halal verification."),
    ("e471", "additive", "vegan", "Uncertain", "E471 may be derived from plant or animal sources."),
    ("e471", "additive", "halal", "Uncertain", "E471 origin may require halal verification."),
    ("e472", "additive", "vegan", "Uncertain", "E472 may be derived from plant or animal sources."),
    ("e472", "additive", "halal", "Uncertain", "E472 origin may require halal verification."),
    ("e322", "additive", "vegan", "Uncertain", "E322 source may vary depending on formulation."),
    ("e322", "additive", "halal", "Uncertain", "E322 source may require halal verification."),
    ("e542", "additive", "vegan", "Restricted", "E542 is bone phosphate and is animal-derived."),
    ("e542", "additive", "vegetarian", "Restricted", "E542 is animal-derived."),
    ("e542", "additive", "eggetarian", "Restricted", "E542 is animal-derived."),
    ("e542", "additive", "Jain", "Restricted", "E542 conflicts with Jain dietary restrictions."),
    ("e542", "additive", "halal", "Uncertain", "E542 source may require halal verification."),
    ("e627", "additive", "vegan", "Uncertain", "E627 may be produced from animal or plant sources."),
    ("e627", "additive", "vegetarian", "Uncertain", "E627 source may require verification."),
    ("e627", "additive", "eggetarian", "Uncertain", "E627 source may require verification."),
    ("e627", "additive", "halal", "Uncertain", "E627 source may require halal verification."),
    ("e627", "additive", "Jain", "Uncertain", "E627 source may require verification."),
    ("e631", "additive", "vegan", "Uncertain", "E631 may be produced from animal or plant sources."),
    ("e631", "additive", "vegetarian", "Uncertain", "E631 source may require verification."),
    ("e631", "additive", "eggetarian", "Uncertain", "E631 source may require verification."),
    ("e631", "additive", "halal", "Uncertain", "E631 source may require halal verification."),
    ("e631", "additive", "Jain", "Uncertain", "E631 source may require verification."),
    ("en:milk", "allergen", "vegan", "Restricted", "Milk allergen indicates dairy content, which is not suitable for vegan diets."),
    ("en:milk", "allergen", "dairy-free", "Restricted", "Milk allergen conflicts with dairy-free diets."),
    ("en:nuts", "allergen", "nut-free", "Restricted", "Nut allergen conflicts with nut-free diets."),
    ("en:peanuts", "allergen", "nut-free", "Restricted", "Peanut allergen conflicts with nut-free diets."),
    ("en:gluten", "allergen", "gluten-free", "Restricted", "Gluten allergen conflicts with gluten-free diets."),
    ("en:wheat", "allergen", "gluten-free", "Restricted", "Wheat allergen conflicts with gluten-free diets."),
    ("en:eggs", "allergen", "vegan", "Restricted", "Egg allergen conflicts with vegan diets."),
    ("en:eggs", "allergen", "Jain", "Restricted", "Egg allergen conflicts with Jain dietary restrictions."),
]

SEED_ALIASES = [
    ("sucrose", "sugar", "ingredient"),
    ("cane sugar", "sugar", "ingredient"),
    ("sea salt", "salt", "ingredient"),
    ("lecithin", "e322", "additive"),
    ("mono- and diglycerides of fatty acids", "e471", "additive"),
    ("mono and diglycerides of fatty acids", "e471", "additive"),
    ("e44i", "e441", "additive"),
]


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db(force_reseed=False):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS rules (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            term TEXT NOT NULL,
            term_type TEXT NOT NULL,
            profile TEXT,
            status TEXT NOT NULL,
            reason TEXT NOT NULL
        )
        """
    )
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS aliases (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            alias TEXT NOT NULL,
            canonical TEXT NOT NULL,
            term_type TEXT NOT NULL
        )
        """
    )
    cur.execute("SELECT COUNT(*) AS count FROM rules")
    count = cur.fetchone()["count"]
    if force_reseed or count == 0:
        cur.execute("DELETE FROM rules")
        cur.execute("DELETE FROM aliases")
        cur.executemany("INSERT INTO rules (term, term_type, profile, status, reason) VALUES (?, ?, ?, ?, ?)", SEED_RULES)
        cur.executemany("INSERT INTO aliases (alias, canonical, term_type) VALUES (?, ?, ?)", SEED_ALIASES)
    conn.commit()
    conn.close()


def get_alias_map(term_type):
    conn = get_connection()
    rows = conn.execute("SELECT alias, canonical FROM aliases WHERE term_type = ?", (term_type,)).fetchall()
    conn.close()
    return {row["alias"]: row["canonical"] for row in rows}


def get_rules_map(term_type):
    conn = get_connection()
    rows = conn.execute("SELECT term, profile, status, reason FROM rules WHERE term_type = ?", (term_type,)).fetchall()
    conn.close()
    mapping = {}
    defaults = {}
    for row in rows:
        term = row["term"]
        profile = row["profile"]
        entry = (row["status"], row["reason"])
        if profile is None:
            defaults[term] = entry
        else:
            mapping.setdefault(term, {})[profile] = entry
    return mapping, defaults

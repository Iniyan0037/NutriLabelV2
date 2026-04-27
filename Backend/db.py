import csv
import os
from pathlib import Path
from datetime import datetime, timezone

from sqlalchemy import (
    create_engine,
    Column,
    Integer,
    String,
    Text,
    DateTime,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB, insert
from sqlalchemy.orm import declarative_base, sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is not set. Add it in Render environment variables.")

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()


class Rule(Base):
    __tablename__ = "rules"

    id = Column(Integer, primary_key=True)
    ingredient_name = Column(String(255), nullable=False)
    profile = Column(String(100), nullable=False)
    status = Column(String(50), nullable=False)
    reason = Column(Text, nullable=False)

    __table_args__ = (
        UniqueConstraint("ingredient_name", "profile", name="uq_rule_ingredient_profile"),
    )


class Alias(Base):
    __tablename__ = "aliases"

    id = Column(Integer, primary_key=True)
    alias_name = Column(String(255), nullable=False, unique=True)
    actual_name = Column(String(255), nullable=False)


class ENumber(Base):
    __tablename__ = "e_numbers"

    id = Column(Integer, primary_key=True)
    e_number = Column(String(20), nullable=False, unique=True)
    name = Column(String(255), nullable=False)
    origin = Column(String(255), nullable=True)
    notes = Column(Text, nullable=True)
    e_type = Column(String(100), nullable=True)
    halal_status = Column(String(100), nullable=True)


class Allergen(Base):
    __tablename__ = "allergens"

    id = Column(Integer, primary_key=True)
    ingredient_name = Column(String(255), nullable=False)
    allergen_type = Column(String(100), nullable=False)

    __table_args__ = (
        UniqueConstraint("ingredient_name", "allergen_type", name="uq_allergen_ingredient_type"),
    )


class Profile(Base):
    __tablename__ = "profiles"

    id = Column(Integer, primary_key=True)
    profile_name = Column(String(255), nullable=False)
    restrictions = Column(JSONB, nullable=False)
    explanation = Column(JSONB, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class History(Base):
    __tablename__ = "history"

    id = Column(Integer, primary_key=True)
    product_name = Column(String(255), nullable=False)
    ingredients = Column(Text, nullable=False)
    result = Column(String(50), nullable=False)
    analysis_json = Column(JSONB, nullable=False)
    profile_used = Column(JSONB, nullable=False)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))


SEED_RULES = [
    # Common generally acceptable plant-based items
    ("sugar", "vegan", "Allowed", "Sugar has no direct vegan restriction in the current rules."),
    ("sugar", "vegetarian", "Allowed", "Sugar has no direct vegetarian restriction in the current rules."),
    ("salt", "vegan", "Allowed", "Salt has no direct vegan restriction in the current rules."),
    ("water", "vegan", "Allowed", "Water has no direct vegan restriction in the current rules."),
    ("vegetable oil", "vegan", "Allowed", "Vegetable oil is plant-derived."),
    ("sunflower oil", "vegan", "Allowed", "Sunflower oil is plant-derived."),
    ("canola oil", "vegan", "Allowed", "Canola oil is plant-derived."),
    ("rapeseed oil", "vegan", "Allowed", "Rapeseed oil is plant-derived."),
    ("palm oil", "vegan", "Allowed", "Palm oil is plant-derived."),
    ("olive oil", "vegan", "Allowed", "Olive oil is plant-derived."),
    ("cocoa powder", "vegan", "Allowed", "Cocoa powder has no direct vegan restriction in the current rules."),
    ("cocoa mass", "vegan", "Allowed", "Cocoa mass has no direct vegan restriction in the current rules."),
    ("cocoa butter", "vegan", "Allowed", "Cocoa butter is plant-derived and has no direct vegan restriction."),
    ("flavouring", "vegan", "Uncertain", "Flavouring may require source verification."),
    ("natural flavouring", "vegan", "Uncertain", "Natural flavouring may require source verification."),
    ("artificial flavouring", "vegan", "Uncertain", "Artificial flavouring may require source verification."),
    ("vanilla", "vegan", "Allowed", "Vanilla has no direct vegan restriction in the current rules."),
    ("vanillin", "vegan", "Uncertain", "Vanillin source may require verification."),
    ("corn starch", "vegan", "Allowed", "Corn starch is plant-derived."),
    ("maize starch", "vegan", "Allowed", "Maize starch is plant-derived."),
    ("rice flour", "vegan", "Allowed", "Rice flour is plant-derived."),
    ("soy", "vegan", "Allowed", "Soy is plant-derived."),
    ("soy", "nut-free", "Allowed", "Soy is not a tree nut, but users with soy allergy should verify separately."),
    ("soybean", "vegan", "Allowed", "Soybean is plant-derived."),
    ("soybean", "nut-free", "Allowed", "Soybean is not a tree nut, but users with soy allergy should verify separately."),

    # Dairy / animal-derived
    ("milk", "vegan", "Restricted", "Milk is animal-derived and not suitable for vegan diets."),
    ("milk", "dairy-free", "Restricted", "Milk conflicts with dairy-free diets."),
    ("milk", "vegetarian", "Allowed", "Milk is usually accepted in vegetarian diets unless the user avoids dairy."),
    ("skim milk", "vegan", "Restricted", "Skim milk is dairy-derived and not suitable for vegan diets."),
    ("skim milk", "dairy-free", "Restricted", "Skim milk conflicts with dairy-free diets."),
    ("milk powder", "vegan", "Restricted", "Milk powder is dairy-derived and not suitable for vegan diets."),
    ("milk powder", "dairy-free", "Restricted", "Milk powder conflicts with dairy-free diets."),
    ("skim milk powder", "vegan", "Restricted", "Skim milk powder is dairy-derived and not suitable for vegan diets."),
    ("skim milk powder", "dairy-free", "Restricted", "Skim milk powder conflicts with dairy-free diets."),
    ("whey", "vegan", "Restricted", "Whey is dairy-derived and not suitable for vegan diets."),
    ("whey", "dairy-free", "Restricted", "Whey conflicts with dairy-free diets."),
    ("casein", "vegan", "Restricted", "Casein is dairy-derived and not suitable for vegan diets."),
    ("casein", "dairy-free", "Restricted", "Casein conflicts with dairy-free diets."),
    ("lactose", "vegan", "Restricted", "Lactose is dairy-derived and not suitable for vegan diets."),
    ("lactose", "dairy-free", "Restricted", "Lactose conflicts with dairy-free diets."),
    ("cream", "vegan", "Restricted", "Cream is dairy-derived and not suitable for vegan diets."),
    ("cream", "dairy-free", "Restricted", "Cream conflicts with dairy-free diets."),
    ("butter", "vegan", "Restricted", "Butter is dairy-derived and not suitable for vegan diets."),
    ("butter", "dairy-free", "Restricted", "Butter conflicts with dairy-free diets."),
    ("cheese", "vegan", "Restricted", "Cheese is dairy-derived and not suitable for vegan diets."),
    ("cheese", "dairy-free", "Restricted", "Cheese conflicts with dairy-free diets."),
    ("yoghurt", "vegan", "Restricted", "Yoghurt is dairy-derived and not suitable for vegan diets."),
    ("yoghurt", "dairy-free", "Restricted", "Yoghurt conflicts with dairy-free diets."),
    ("yogurt", "vegan", "Restricted", "Yogurt is dairy-derived and not suitable for vegan diets."),
    ("yogurt", "dairy-free", "Restricted", "Yogurt conflicts with dairy-free diets."),
    ("ghee", "vegan", "Restricted", "Ghee is dairy-derived and not suitable for vegan diets."),
    ("ghee", "dairy-free", "Restricted", "Ghee conflicts with dairy-free diets."),

    # Eggs
    ("egg", "vegan", "Restricted", "Egg is not suitable for vegan diets."),
    ("egg", "Jain", "Restricted", "Egg conflicts with Jain dietary restrictions."),
    ("eggs", "vegan", "Restricted", "Eggs are not suitable for vegan diets."),
    ("eggs", "Jain", "Restricted", "Eggs conflict with Jain dietary restrictions."),
    ("albumen", "vegan", "Restricted", "Albumen is egg-derived and not suitable for vegan diets."),
    ("albumen", "Jain", "Restricted", "Albumen is egg-derived and conflicts with Jain dietary restrictions."),
    ("egg white", "vegan", "Restricted", "Egg white is not suitable for vegan diets."),
    ("egg yolk", "vegan", "Restricted", "Egg yolk is not suitable for vegan diets."),

    # Meat / animal products
    ("beef", "vegan", "Restricted", "Beef is animal-derived and not suitable for vegan diets."),
    ("beef", "vegetarian", "Restricted", "Beef is not suitable for vegetarian diets."),
    ("beef", "Jain", "Restricted", "Beef conflicts with Jain dietary restrictions."),
    ("pork", "vegan", "Restricted", "Pork is animal-derived and not suitable for vegan diets."),
    ("pork", "vegetarian", "Restricted", "Pork is not suitable for vegetarian diets."),
    ("pork", "halal", "Restricted", "Pork is not suitable for halal diets."),
    ("chicken", "vegan", "Restricted", "Chicken is animal-derived and not suitable for vegan diets."),
    ("chicken", "vegetarian", "Restricted", "Chicken is not suitable for vegetarian diets."),
    ("fish", "vegan", "Restricted", "Fish is animal-derived and not suitable for vegan diets."),
    ("fish", "vegetarian", "Restricted", "Fish is not suitable for vegetarian diets."),
    ("shellfish", "vegan", "Restricted", "Shellfish is animal-derived and not suitable for vegan diets."),
    ("shellfish", "vegetarian", "Restricted", "Shellfish is not suitable for vegetarian diets."),
    ("lard", "vegan", "Restricted", "Lard is animal-derived and not suitable for vegan diets."),
    ("lard", "vegetarian", "Restricted", "Lard is not suitable for vegetarian diets."),
    ("lard", "halal", "Restricted", "Lard is usually pork-derived and not suitable for halal diets."),
    ("tallow", "vegan", "Restricted", "Tallow is animal-derived and not suitable for vegan diets."),
    ("tallow", "vegetarian", "Restricted", "Tallow is not suitable for vegetarian diets."),

    # Gelatin / honey
    ("gelatin", "vegan", "Restricted", "Gelatin is animal-derived and not suitable for vegan diets."),
    ("gelatin", "vegetarian", "Restricted", "Gelatin is not suitable for vegetarian diets."),
    ("gelatin", "eggetarian", "Restricted", "Gelatin is not suitable for eggetarian diets."),
    ("gelatin", "Jain", "Restricted", "Gelatin conflicts with Jain dietary restrictions."),
    ("gelatin", "halal", "Uncertain", "Gelatin source may require halal certification verification."),
    ("collagen", "vegan", "Restricted", "Collagen is animal-derived and not suitable for vegan diets."),
    ("collagen", "vegetarian", "Restricted", "Collagen is not suitable for vegetarian diets."),
    ("honey", "vegan", "Restricted", "Honey is animal-derived and not suitable for vegan diets."),
    ("beeswax", "vegan", "Restricted", "Beeswax is animal-derived and not suitable for vegan diets."),

    # Jain restrictions
    ("onion", "Jain", "Restricted", "Onion conflicts with Jain dietary restrictions."),
    ("garlic", "Jain", "Restricted", "Garlic conflicts with Jain dietary restrictions."),
    ("potato", "Jain", "Restricted", "Potato is a root vegetable and conflicts with Jain dietary restrictions."),
    ("carrot", "Jain", "Restricted", "Carrot is a root vegetable and may conflict with Jain dietary restrictions."),
    ("beetroot", "Jain", "Restricted", "Beetroot is a root vegetable and may conflict with Jain dietary restrictions."),
    ("radish", "Jain", "Restricted", "Radish is a root vegetable and may conflict with Jain dietary restrictions."),
    ("turnip", "Jain", "Restricted", "Turnip is a root vegetable and may conflict with Jain dietary restrictions."),
    ("ginger", "Jain", "Restricted", "Ginger is a root vegetable and may conflict with Jain dietary restrictions."),

    # Gluten
    ("wheat", "gluten-free", "Restricted", "Wheat contains gluten and conflicts with gluten-free diets."),
    ("wheat flour", "gluten-free", "Restricted", "Wheat flour contains gluten and conflicts with gluten-free diets."),
    ("barley", "gluten-free", "Restricted", "Barley contains gluten and conflicts with gluten-free diets."),
    ("rye", "gluten-free", "Restricted", "Rye contains gluten and conflicts with gluten-free diets."),
    ("malt", "gluten-free", "Restricted", "Malt is often barley-derived and may contain gluten."),
    ("gluten", "gluten-free", "Restricted", "Gluten conflicts with gluten-free diets."),

    # Nuts
    ("peanut", "nut-free", "Restricted", "Peanut conflicts with nut-free diets."),
    ("hazelnut", "nut-free", "Restricted", "Hazelnut conflicts with nut-free diets."),
    ("almond", "nut-free", "Restricted", "Almond conflicts with nut-free diets."),
    ("cashew", "nut-free", "Restricted", "Cashew conflicts with nut-free diets."),
    ("walnut", "nut-free", "Restricted", "Walnut conflicts with nut-free diets."),
    ("pistachio", "nut-free", "Restricted", "Pistachio conflicts with nut-free diets."),
    ("pecan", "nut-free", "Restricted", "Pecan conflicts with nut-free diets."),
    ("macadamia", "nut-free", "Restricted", "Macadamia conflicts with nut-free diets."),
    ("brazil nut", "nut-free", "Restricted", "Brazil nut conflicts with nut-free diets."),
    ("tree nut", "nut-free", "Restricted", "Tree nuts conflict with nut-free diets."),

    # Additives / E-numbers with known concern
    ("e120", "vegan", "Restricted", "E120 is cochineal/carmine and is insect-derived."),
    ("e120", "vegetarian", "Restricted", "E120 is insect-derived."),
    ("e120", "Jain", "Restricted", "E120 is insect-derived and conflicts with Jain dietary restrictions."),
    ("e120", "halal", "Uncertain", "E120 source and certification may require halal verification."),

    ("e322", "vegan", "Uncertain", "E322/lecithin may be plant or animal derived depending on source."),
    ("e322", "halal", "Uncertain", "E322 source may require halal verification."),

    ("e441", "vegan", "Restricted", "E441 is gelatin and is animal-derived."),
    ("e441", "vegetarian", "Restricted", "E441 is gelatin and is not suitable for vegetarian diets."),
    ("e441", "Jain", "Restricted", "E441 conflicts with Jain dietary restrictions."),
    ("e441", "halal", "Uncertain", "E441 source may require halal verification."),

    ("e471", "vegan", "Uncertain", "E471 may be derived from plant or animal sources."),
    ("e471", "halal", "Uncertain", "E471 origin may require halal verification."),
    ("e472", "vegan", "Uncertain", "E472 may be derived from plant or animal sources."),
    ("e472", "halal", "Uncertain", "E472 origin may require halal verification."),
    ("e473", "vegan", "Uncertain", "E473 may require source verification."),
    ("e473", "halal", "Uncertain", "E473 origin may require halal verification."),
    ("e475", "vegan", "Uncertain", "E475 may require source verification."),
    ("e475", "halal", "Uncertain", "E475 origin may require halal verification."),
    ("e476", "vegan", "Uncertain", "E476 may require source verification."),
    ("e476", "halal", "Uncertain", "E476 origin may require halal verification."),
]


SEED_ALIASES = [
    # Sugar / salt / common plant ingredients
    ("sucrose", "sugar"),
    ("cane sugar", "sugar"),
    ("white sugar", "sugar"),
    ("raw sugar", "sugar"),
    ("brown sugar", "sugar"),
    ("glucose syrup", "sugar"),
    ("fructose syrup", "sugar"),
    ("dextrose", "sugar"),
    ("sea salt", "salt"),
    ("sodium chloride", "salt"),

    # Oils
    ("vegetable oils", "vegetable oil"),
    ("palm oil", "vegetable oil"),
    ("sunflower oil", "vegetable oil"),
    ("canola oil", "vegetable oil"),
    ("rapeseed oil", "vegetable oil"),
    ("olive oil", "vegetable oil"),
    ("coconut oil", "vegetable oil"),

    # Dairy aliases
    ("skim milk powder", "milk"),
    ("skimmed milk powder", "milk"),
    ("milk powder", "milk"),
    ("whole milk powder", "milk"),
    ("full cream milk powder", "milk"),
    ("fat reduced milk powder", "milk"),
    ("fat-reduced milk powder", "milk"),
    ("nonfat milk powder", "milk"),
    ("non-fat milk powder", "milk"),
    ("milk solids", "milk"),
    ("total milk solids", "milk"),
    ("dairy solids", "milk"),
    ("milk protein", "milk"),
    ("milk proteins", "milk"),
    ("milk fat", "milk"),
    ("butter milk", "milk"),
    ("buttermilk", "milk"),
    ("cream powder", "cream"),
    ("whey powder", "whey"),
    ("whey protein", "whey"),
    ("whey protein concentrate", "whey"),
    ("caseinate", "casein"),
    ("sodium caseinate", "casein"),
    ("calcium caseinate", "casein"),

    # Eggs
    ("egg powder", "egg"),
    ("dried egg", "egg"),
    ("egg albumen", "albumen"),
    ("albumin", "albumen"),
    ("egg whites", "egg white"),
    ("egg yolks", "egg yolk"),

    # Meat/animal aliases
    ("beef fat", "beef"),
    ("chicken fat", "chicken"),
    ("fish oil", "fish"),
    ("anchovy", "fish"),
    ("anchovies", "fish"),
    ("pork fat", "pork"),
    ("animal fat", "tallow"),
    ("animal fats", "tallow"),
    ("beef tallow", "tallow"),

    # Gelatin / animal products
    ("gelatine", "gelatin"),
    ("hydrolysed collagen", "collagen"),
    ("hydrolyzed collagen", "collagen"),
    ("cochineal", "e120"),
    ("carmine", "e120"),
    ("carminic acid", "e120"),
    ("bees wax", "beeswax"),

    # Jain aliases
    ("onions", "onion"),
    ("garlic powder", "garlic"),
    ("onion powder", "onion"),
    ("potatoes", "potato"),
    ("carrots", "carrot"),
    ("beets", "beetroot"),
    ("beet", "beetroot"),

    # Gluten aliases
    ("wheat flour", "wheat"),
    ("whole wheat flour", "wheat"),
    ("plain flour", "wheat"),
    ("white flour", "wheat"),
    ("semolina", "wheat"),
    ("durum wheat", "wheat"),
    ("barley malt", "malt"),
    ("malt extract", "malt"),
    ("rye flour", "rye"),

    # Nuts aliases
    ("hazelnuts", "hazelnut"),
    ("hazelnut pieces", "hazelnut"),
    ("roasted hazelnuts", "hazelnut"),
    ("almonds", "almond"),
    ("cashews", "cashew"),
    ("walnuts", "walnut"),
    ("peanuts", "peanut"),
    ("pistachios", "pistachio"),
    ("pecans", "pecan"),
    ("macadamias", "macadamia"),
    ("brazil nuts", "brazil nut"),
    ("tree nuts", "tree nut"),

    # Soy / lecithin
    ("soya", "soy"),
    ("soybeans", "soybean"),
    ("soy bean", "soybean"),
    ("soy beans", "soybean"),
    ("soy lecithin", "e322"),
    ("soya lecithin", "e322"),
    ("lecithin", "e322"),
    ("emulsifier soy lecithin", "e322"),
    ("emulsifier soya lecithin", "e322"),
    ("emulsifier lecithin", "e322"),
    ("emulsifier e322", "e322"),

    # E471 style aliases
    ("mono- and diglycerides of fatty acids", "e471"),
    ("mono and diglycerides of fatty acids", "e471"),
    ("mono-diglycerides of fatty acids", "e471"),
    ("monoglycerides and diglycerides", "e471"),
    ("emulsifier e471", "e471"),

    # Chocolate / flavouring common terms
    ("fat reduced cocoa powder", "cocoa powder"),
    ("fat-reduced cocoa powder", "cocoa powder"),
    ("cocoa", "cocoa powder"),
    ("cocoa solids", "cocoa powder"),
    ("total cocoa solids", "cocoa powder"),
    ("vanillin", "flavouring"),
    ("flavoring", "flavouring"),
    ("flavour", "flavouring"),
    ("flavor", "flavouring"),
    ("natural flavour", "natural flavouring"),
    ("natural flavor", "natural flavouring"),
    ("artificial flavour", "artificial flavouring"),
    ("artificial flavor", "artificial flavouring"),

    # Starches / flours
    ("cornflour", "corn starch"),
    ("corn flour", "corn starch"),
    ("maize starch", "corn starch"),
    ("modified starch", "corn starch"),
    ("rice starch", "rice flour"),
]


SEED_ALLERGENS = [
    ("milk", "dairy-free"),
    ("skim milk", "dairy-free"),
    ("milk powder", "dairy-free"),
    ("skim milk powder", "dairy-free"),
    ("whey", "dairy-free"),
    ("casein", "dairy-free"),
    ("lactose", "dairy-free"),
    ("cream", "dairy-free"),
    ("butter", "dairy-free"),
    ("cheese", "dairy-free"),
    ("yoghurt", "dairy-free"),
    ("yogurt", "dairy-free"),
    ("ghee", "dairy-free"),

    ("peanut", "nut-free"),
    ("hazelnut", "nut-free"),
    ("almond", "nut-free"),
    ("cashew", "nut-free"),
    ("walnut", "nut-free"),
    ("pistachio", "nut-free"),
    ("pecan", "nut-free"),
    ("macadamia", "nut-free"),
    ("brazil nut", "nut-free"),
    ("tree nut", "nut-free"),

    ("wheat", "gluten-free"),
    ("wheat flour", "gluten-free"),
    ("barley", "gluten-free"),
    ("rye", "gluten-free"),
    ("malt", "gluten-free"),
    ("gluten", "gluten-free"),

    ("egg", "vegan"),
    ("eggs", "vegan"),
    ("albumen", "vegan"),
    ("egg white", "vegan"),
    ("egg yolk", "vegan"),
]


def clean_value(value):
    return str(value or "").strip()


def clean_lower(value):
    return clean_value(value).lower()


def init_db():
    Base.metadata.create_all(bind=engine)
    seed_core_data()
    seed_e_numbers_from_csv()


def seed_core_data():
    db = SessionLocal()

    try:
        for ingredient_name, profile, status, reason in SEED_RULES:
            statement = insert(Rule).values(
                ingredient_name=ingredient_name.lower(),
                profile=profile,
                status=status,
                reason=reason,
            )
            statement = statement.on_conflict_do_update(
                constraint="uq_rule_ingredient_profile",
                set_={
                    "status": status,
                    "reason": reason,
                },
            )
            db.execute(statement)

        for alias_name, actual_name in SEED_ALIASES:
            statement = insert(Alias).values(
                alias_name=alias_name.lower(),
                actual_name=actual_name.lower(),
            )
            statement = statement.on_conflict_do_update(
                index_elements=["alias_name"],
                set_={"actual_name": actual_name.lower()},
            )
            db.execute(statement)

        for ingredient_name, allergen_type in SEED_ALLERGENS:
            statement = insert(Allergen).values(
                ingredient_name=ingredient_name.lower(),
                allergen_type=allergen_type,
            )
            statement = statement.on_conflict_do_nothing(
                constraint="uq_allergen_ingredient_type"
            )
            db.execute(statement)

        db.commit()

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()


def seed_e_numbers_from_csv():
    csv_path = Path(__file__).parent / "data" / "additives.csv"

    if not csv_path.exists():
        return

    db = SessionLocal()

    try:
        with csv_path.open("r", encoding="utf-8-sig", newline="") as file:
            reader = csv.DictReader(file)

            for row in reader:
                e_number = clean_lower(row.get("e_code"))
                name = clean_value(row.get("title"))
                notes = clean_value(row.get("info"))
                e_type = clean_value(row.get("e_type"))
                halal_status = clean_value(row.get("halal_status"))

                if not e_number or not name:
                    continue

                e_number_statement = insert(ENumber).values(
                    e_number=e_number,
                    name=name,
                    origin=None,
                    notes=notes,
                    e_type=e_type,
                    halal_status=halal_status,
                )
                e_number_statement = e_number_statement.on_conflict_do_update(
                    index_elements=["e_number"],
                    set_={
                        "name": name,
                        "notes": notes,
                        "e_type": e_type,
                        "halal_status": halal_status,
                    },
                )
                db.execute(e_number_statement)

                alias_name = name.lower().strip()

                if alias_name:
                    alias_statement = insert(Alias).values(
                        alias_name=alias_name,
                        actual_name=e_number,
                    )
                    alias_statement = alias_statement.on_conflict_do_nothing(
                        index_elements=["alias_name"]
                    )
                    db.execute(alias_statement)

        db.commit()

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()


def db_status_counts():
    db = SessionLocal()

    try:
        return {
            "rules_count": db.query(Rule).count(),
            "aliases_count": db.query(Alias).count(),
            "e_numbers_count": db.query(ENumber).count(),
            "allergens_count": db.query(Allergen).count(),
            "profiles_count": db.query(Profile).count(),
            "history_count": db.query(History).count(),
        }

    finally:
        db.close()

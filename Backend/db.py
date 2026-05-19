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
    Float,
    inspect,
    text,
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


class UserAccount(Base):
    __tablename__ = "user_accounts"

    id = Column(Integer, primary_key=True)
    family_name = Column(String(255), nullable=False, unique=True)
    pin_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class Profile(Base):
    __tablename__ = "profiles"

    id = Column(Integer, primary_key=True)
    account_id = Column(Integer, nullable=True)
    profile_name = Column(String(255), nullable=False)
    restrictions = Column(JSONB, nullable=False)
    explanation = Column(JSONB, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class History(Base):
    __tablename__ = "history"

    id = Column(Integer, primary_key=True)
    account_id = Column(Integer, nullable=True)
    profile_id = Column(Integer, nullable=True)
    product_name = Column(String(255), nullable=False)
    ingredients = Column(Text, nullable=False)
    result = Column(String(50), nullable=False)
    analysis_json = Column(JSONB, nullable=False)
    profile_used = Column(JSONB, nullable=False)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class AllergenInfo(Base):
    __tablename__ = "allergen_info"

    id = Column(Integer, primary_key=True)
    allergen_name = Column(String(100), nullable=False, unique=True)
    category = Column(String(100), nullable=False)          # e.g. "Dairy", "Nuts", "Cereals"
    description = Column(Text, nullable=False)
    common_foods = Column(Text, nullable=False)              # comma-separated
    prevalence_percent = Column(String(50), nullable=False)  # e.g. "2-3% children, <1% adults"
    severity = Column(String(50), nullable=False)            # "Mild", "Moderate", "Severe"
    fsanz_mandatory = Column(String(10), default="Yes")      # "Yes" or "No"
    icon_label = Column(String(50), nullable=True)           # short label for chart


class AwarenessTip(Base):
    __tablename__ = "awareness_tips"

    id = Column(Integer, primary_key=True)
    tip_text = Column(Text, nullable=False)
    category = Column(String(100), nullable=False)       # "Label Reading", "Allergens", "Additives", "Dietary", "General"
    relevant_profiles = Column(JSONB, default=[])         # e.g. ["vegan", "halal"] — empty means general
    priority = Column(Integer, default=10)                # lower = higher priority
    source = Column(String(255), nullable=True)           # attribution e.g. "FSANZ"

    __table_args__ = (
        UniqueConstraint("tip_text", name="uq_tip_text"),
    )


class RecallYearly(Base):
    __tablename__ = "awareness_recall_yearly"

    id = Column(Integer, primary_key=True)
    year = Column(Integer, nullable=False, unique=True)
    recalls = Column(Integer, nullable=False)
    percent_of_total = Column(Float, nullable=True)
    source = Column(String(255), nullable=False)
    source_url = Column(Text, nullable=False)


class RecallDetectionMethod(Base):
    __tablename__ = "awareness_recall_detection_methods"

    id = Column(Integer, primary_key=True)
    year = Column(Integer, nullable=False, unique=True)
    customer_complaint = Column(Integer, default=0)
    distributor_or_retailer_complaint = Column(Integer, default=0)
    routine_government_testing = Column(Integer, default=0)
    routine_testing_by_company = Column(Integer, default=0)
    other = Column(Integer, default=0)
    source = Column(String(255), nullable=False)
    source_url = Column(Text, nullable=False)


class RecallFoodType(Base):
    __tablename__ = "awareness_recall_food_types"

    id = Column(Integer, primary_key=True)
    category = Column(String(255), nullable=False, unique=True)
    recalls = Column(Integer, nullable=False)
    percent = Column(Float, nullable=True)
    source = Column(String(255), nullable=False)
    source_url = Column(Text, nullable=False)


class FoodLog(Base):
    __tablename__ = "food_logs"

    id = Column(Integer, primary_key=True)
    account_id = Column(Integer, nullable=False)
    profile_id = Column(Integer, nullable=True)
    food_name = Column(String(255), nullable=False)
    serving_size = Column(String(100), nullable=True)
    calories = Column(Float, default=0.0)
    protein = Column(Float, default=0.0)
    carbs = Column(Float, default=0.0)
    fat = Column(Float, default=0.0)
    log_date = Column(String(20), nullable=False)
    source = Column(String(50), default="manual")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class NutritionGoal(Base):
    __tablename__ = "nutrition_goals"

    id = Column(Integer, primary_key=True)
    account_id = Column(Integer, nullable=False)
    profile_id = Column(Integer, nullable=True)
    calories = Column(Float, default=2000.0)
    protein = Column(Float, default=80.0)
    carbs = Column(Float, default=250.0)
    fat = Column(Float, default=70.0)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        UniqueConstraint("account_id", "profile_id", name="uq_nutrition_goal_account_profile"),
    )

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

    # Kosher restrictions / certification checks
    ("pork", "kosher", "Restricted", "Pork is not suitable for kosher diets."),
    ("lard", "kosher", "Restricted", "Lard is usually pork-derived and not suitable for kosher diets."),
    ("shellfish", "kosher", "Restricted", "Shellfish is not suitable for kosher diets."),
    ("shrimp", "kosher", "Restricted", "Shrimp is shellfish and is not suitable for kosher diets."),
    ("prawn", "kosher", "Restricted", "Prawn is shellfish and is not suitable for kosher diets."),
    ("gelatin", "kosher", "Uncertain", "Gelatin source may require kosher certification verification."),
    ("beef", "kosher", "Uncertain", "Beef may require kosher certification verification."),
    ("chicken", "kosher", "Uncertain", "Chicken may require kosher certification verification."),
    ("rennet", "kosher", "Uncertain", "Rennet source may require kosher certification verification."),
    ("e120", "kosher", "Uncertain", "E120/carmine may require kosher certification verification."),
    ("e441", "kosher", "Uncertain", "E441/gelatin source may require kosher certification verification."),
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


SEED_ALLERGEN_INFO = [
    {
        "allergen_name": "Milk",
        "category": "Dairy",
        "description": "Milk allergy is one of the most common food allergies in children. It involves an immune reaction to proteins found in cow's milk, including casein and whey. Not the same as lactose intolerance, which is a digestive issue.",
        "common_foods": "Cheese, yoghurt, butter, cream, ice cream, milk chocolate, whey protein, casein, custard, ghee",
        "prevalence_percent": "2-3% of children, <1% of adults",
        "severity": "Moderate to Severe",
        "fsanz_mandatory": "Yes",
        "icon_label": "Milk",
    },
    {
        "allergen_name": "Eggs",
        "category": "Animal Product",
        "description": "Egg allergy is most common in young children and is usually outgrown. Reactions are typically caused by proteins in egg whites, though yolks can also trigger responses. Eggs can appear in many processed foods under different names.",
        "common_foods": "Cakes, pasta, mayonnaise, meringue, battered foods, quiche, custard, marshmallows, some sauces",
        "prevalence_percent": "1-2% of children, <0.5% of adults",
        "severity": "Mild to Severe",
        "fsanz_mandatory": "Yes",
        "icon_label": "Eggs",
    },
    {
        "allergen_name": "Peanuts",
        "category": "Legumes",
        "description": "Peanut allergy is one of the most common causes of severe allergic reactions (anaphylaxis). Peanuts are legumes, not tree nuts, but cross-reactivity can occur. This allergy is rarely outgrown and often lifelong.",
        "common_foods": "Peanut butter, satay sauce, mixed nuts, some Asian cuisines, granola bars, chocolate bars, baked goods",
        "prevalence_percent": "3% of children, 1.5% of adults",
        "severity": "Severe",
        "fsanz_mandatory": "Yes",
        "icon_label": "Peanuts",
    },
    {
        "allergen_name": "Tree Nuts",
        "category": "Nuts",
        "description": "Tree nut allergy covers almonds, cashews, walnuts, hazelnuts, pistachios, pecans, macadamias, and brazil nuts. Cross-contamination between different tree nuts is common in manufacturing. This allergy is usually lifelong.",
        "common_foods": "Almond milk, Nutella, marzipan, pesto, praline, nougat, nut oils, trail mix, baklava",
        "prevalence_percent": "1-2% of children, ~1% of adults",
        "severity": "Severe",
        "fsanz_mandatory": "Yes",
        "icon_label": "Tree Nuts",
    },
    {
        "allergen_name": "Wheat",
        "category": "Cereals",
        "description": "Wheat allergy involves an immune response to wheat proteins. It is different from coeliac disease (autoimmune reaction to gluten) and non-coeliac gluten sensitivity. Wheat is one of the most common ingredients in processed foods.",
        "common_foods": "Bread, pasta, cereals, biscuits, cakes, soy sauce, couscous, semolina, some sauces and gravies",
        "prevalence_percent": "~1% coeliac, up to 6% gluten sensitivity",
        "severity": "Moderate to Severe",
        "fsanz_mandatory": "Yes",
        "icon_label": "Wheat",
    },
    {
        "allergen_name": "Soybeans",
        "category": "Legumes",
        "description": "Soy allergy is common in infants and young children and is often outgrown. Soy is widely used in processed foods as soy lecithin, soy protein, and soybean oil. It appears in many products where it may not be expected.",
        "common_foods": "Tofu, soy sauce, tempeh, edamame, soy milk, miso, soy lecithin (in chocolate), some bread and baked goods",
        "prevalence_percent": "~0.4% of population",
        "severity": "Mild to Moderate",
        "fsanz_mandatory": "Yes",
        "icon_label": "Soy",
    },
    {
        "allergen_name": "Fish",
        "category": "Seafood",
        "description": "Fish allergy can cause severe reactions and is more common in adults than children. People allergic to one type of fish are often advised to avoid all fish. Fish proteins can become airborne during cooking, triggering reactions.",
        "common_foods": "Fish sauce, Worcestershire sauce, Caesar dressing, fish oil supplements, some Asian cuisines, fish stock",
        "prevalence_percent": "~0.5% of population",
        "severity": "Moderate to Severe",
        "fsanz_mandatory": "Yes",
        "icon_label": "Fish",
    },
    {
        "allergen_name": "Crustaceans",
        "category": "Seafood",
        "description": "Crustacean allergy covers prawns, shrimp, crab, lobster, and crayfish. It is more common in adults and is usually lifelong. Cross-reactivity between different crustaceans is common. This is one of the more common triggers of anaphylaxis.",
        "common_foods": "Prawn crackers, seafood platters, paella, laksa, tom yum soup, shrimp paste, some Asian sauces",
        "prevalence_percent": "~2% of adults",
        "severity": "Severe",
        "fsanz_mandatory": "Yes",
        "icon_label": "Shellfish",
    },
    {
        "allergen_name": "Sesame",
        "category": "Seeds",
        "description": "Sesame allergy is increasing in prevalence, particularly in Australia. Sesame can appear as seeds, oil, paste (tahini), or flour. Cross-contamination in bakeries and restaurants is a significant concern.",
        "common_foods": "Hummus, tahini, sesame oil, bread rolls, sushi, falafel, halva, some Asian stir-fry dishes",
        "prevalence_percent": "~0.1-0.2% of population",
        "severity": "Moderate to Severe",
        "fsanz_mandatory": "Yes",
        "icon_label": "Sesame",
    },
    {
        "allergen_name": "Lupin",
        "category": "Legumes",
        "description": "Lupin allergy is relatively uncommon but can cause severe reactions. Lupin flour is increasingly used as a gluten-free alternative in baked goods. People with peanut allergy may have cross-reactivity with lupin.",
        "common_foods": "Some gluten-free breads and pastries, lupin flour products, some European-style baked goods",
        "prevalence_percent": "<0.1% of population",
        "severity": "Moderate to Severe",
        "fsanz_mandatory": "Yes",
        "icon_label": "Lupin",
    },
    {
        "allergen_name": "Molluscs",
        "category": "Seafood",
        "description": "Mollusc allergy covers oysters, mussels, clams, squid (calamari), octopus, and snails. Added to FSANZ mandatory declarations in the 2024 allergen labelling update. Cross-reactivity with crustaceans can occur.",
        "common_foods": "Calamari, oyster sauce, squid ink pasta, mussels, clam chowder, some Asian sauces",
        "prevalence_percent": "<0.5% of population",
        "severity": "Moderate to Severe",
        "fsanz_mandatory": "Yes",
        "icon_label": "Molluscs",
    },
]


SEED_AWARENESS_TIPS = [
    # ── Label Reading Tips ──
    {
        "tip_text": "Always check the 'Contains' statement below the ingredients list — it summarises the major allergens present in the product.",
        "category": "Label Reading",
        "relevant_profiles": [],
        "priority": 1,
        "source": "FSANZ",
    },
    {
        "tip_text": "Ingredients are listed in descending order by weight. The first few ingredients make up the largest portion of the product.",
        "category": "Label Reading",
        "relevant_profiles": [],
        "priority": 2,
        "source": "FSANZ",
    },
    {
        "tip_text": "'May contain' warnings are voluntary in Australia. A product without this warning could still have traces of allergens from shared manufacturing lines.",
        "category": "Label Reading",
        "relevant_profiles": ["nut-free", "dairy-free", "gluten-free"],
        "priority": 3,
        "source": "FSANZ",
    },
    {
        "tip_text": "Since February 2026, the Health Star Rating is mandatory on all packaged foods in Australia. Higher stars indicate a healthier overall nutritional profile.",
        "category": "Label Reading",
        "relevant_profiles": [],
        "priority": 4,
        "source": "FSANZ",
    },
    {
        "tip_text": "New FSANZ allergen labelling rules (effective February 2024) require allergens to be declared in plain English using their common names, making labels easier to read.",
        "category": "Label Reading",
        "relevant_profiles": [],
        "priority": 5,
        "source": "FSANZ",
    },

    # ── Allergen Tips ──
    {
        "tip_text": "Undeclared allergens are the number one reason for food recalls in Australia. Always read the label even on products you have bought before — formulations can change.",
        "category": "Allergens",
        "relevant_profiles": [],
        "priority": 1,
        "source": "FSANZ Recall Statistics",
    },
    {
        "tip_text": "Sesame allergy is increasing in prevalence in Australia. Sesame can appear as tahini, sesame oil, or hummus, and cross-contamination in bakeries is common.",
        "category": "Allergens",
        "relevant_profiles": [],
        "priority": 6,
        "source": "ASCIA",
    },
    {
        "tip_text": "Peanuts are legumes, not tree nuts. However, some people with peanut allergy also react to tree nuts or lupin due to cross-reactivity.",
        "category": "Allergens",
        "relevant_profiles": ["nut-free"],
        "priority": 3,
        "source": "ASCIA",
    },
    {
        "tip_text": "Molluscs (squid, octopus, oysters, mussels) were added to FSANZ mandatory allergen declarations in 2024. Check labels if you have a shellfish allergy.",
        "category": "Allergens",
        "relevant_profiles": [],
        "priority": 7,
        "source": "FSANZ",
    },

    # ── Additive Tips ──
    {
        "tip_text": "E120 (Cochineal / Carmine) is a red food colouring derived from insects. It is restricted for vegan, vegetarian, and Jain diets.",
        "category": "Additives",
        "relevant_profiles": ["vegan", "vegetarian", "Jain"],
        "priority": 2,
        "source": "FSANZ Additive Database",
    },
    {
        "tip_text": "E441 (Gelatin) is derived from animal bones and skin. It is restricted for vegan, vegetarian, Jain, and potentially halal diets unless certified.",
        "category": "Additives",
        "relevant_profiles": ["vegan", "vegetarian", "Jain", "halal"],
        "priority": 2,
        "source": "FSANZ Additive Database",
    },
    {
        "tip_text": "E471 (Mono- and diglycerides of fatty acids) can be derived from either plant or animal sources. Without a specific origin declaration, it is uncertain for vegan and halal diets.",
        "category": "Additives",
        "relevant_profiles": ["vegan", "halal"],
        "priority": 4,
        "source": "FSANZ Additive Database",
    },
    {
        "tip_text": "E904 (Shellac) is a glazing agent derived from the lac insect. It is commonly used on confectionery and fruit coatings, and is restricted for vegan and Jain diets.",
        "category": "Additives",
        "relevant_profiles": ["vegan", "Jain"],
        "priority": 5,
        "source": "FSANZ Additive Database",
    },
    {
        "tip_text": "Not all E-numbers are harmful. Many are naturally occurring substances — for example, E300 is vitamin C (ascorbic acid) and E330 is citric acid found in citrus fruits.",
        "category": "Additives",
        "relevant_profiles": [],
        "priority": 3,
        "source": "FSANZ",
    },

    # ── Dietary-Specific Tips ──
    {
        "tip_text": "For halal diets, look for certified halal logos on packaging. Ingredients like gelatin, glycerin, and emulsifiers may be derived from non-halal animal sources.",
        "category": "Dietary",
        "relevant_profiles": ["halal"],
        "priority": 1,
        "source": "MUIS Guidelines",
    },
    {
        "tip_text": "Jain dietary restrictions go beyond vegetarianism — root vegetables (onion, garlic, potato, carrot) and ingredients derived from them are also restricted.",
        "category": "Dietary",
        "relevant_profiles": ["Jain"],
        "priority": 1,
        "source": "Jain Dietary Guidelines",
    },
    {
        "tip_text": "Many products labelled 'plant-based' may still contain traces of dairy or egg due to shared manufacturing facilities. Always check the full ingredients list.",
        "category": "Dietary",
        "relevant_profiles": ["vegan", "dairy-free"],
        "priority": 3,
        "source": "ACCC",
    },
    {
        "tip_text": "'Gluten-free' products in Australia must contain no detectable gluten (less than 3 parts per million) under FSANZ Standard 1.2.7.",
        "category": "Dietary",
        "relevant_profiles": ["gluten-free"],
        "priority": 2,
        "source": "FSANZ",
    },
    {
        "tip_text": "Whey, casein, and lactose are all dairy-derived. They frequently appear in processed foods, protein bars, and medications as inactive ingredients.",
        "category": "Dietary",
        "relevant_profiles": ["vegan", "dairy-free"],
        "priority": 4,
        "source": "ASCIA",
    },

    # ── General Tips ──
    {
        "tip_text": "When dining out, always inform the staff about your dietary restrictions. In Australia, food service businesses must provide allergen information upon request.",
        "category": "General",
        "relevant_profiles": [],
        "priority": 5,
        "source": "FSANZ",
    },

    {
        "tip_text": "For kosher diets, look for reliable kosher certification. Shellfish, pork-derived ingredients, gelatin, rennet and meat/dairy combinations may require extra checking.",
        "category": "Kosher",
        "relevant_profiles": ["kosher"],
        "priority": 2,
        "source": "Kosher dietary guidelines",
    },
    {
        "tip_text": "If you experience symptoms like hives, swelling, or difficulty breathing after eating, seek medical attention immediately. Severe allergic reactions (anaphylaxis) can be life-threatening.",
        "category": "General",
        "relevant_profiles": [],
        "priority": 1,
        "source": "ASCIA",
    },
]

def clean_value(value):
    return str(value or "").strip()


def clean_lower(value):
    return clean_value(value).lower()


def ensure_iteration3_columns():
    inspector = inspect(engine)

    def add_column_if_missing(table_name, column_name, ddl):
        try:
            existing = [col["name"] for col in inspector.get_columns(table_name)]
        except Exception:
            return
        if column_name not in existing:
            with engine.begin() as connection:
                connection.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {ddl}"))

    add_column_if_missing("profiles", "account_id", "account_id INTEGER")
    add_column_if_missing("history", "account_id", "account_id INTEGER")
    add_column_if_missing("history", "profile_id", "profile_id INTEGER")


def init_db():
    Base.metadata.create_all(bind=engine)
    ensure_iteration3_columns()
    seed_core_data()
    seed_e_numbers_from_csv()
    seed_allergen_info()
    seed_awareness_tips()
    seed_fsanz_awareness_data()


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


def seed_allergen_info():
    db = SessionLocal()

    try:
        for info in SEED_ALLERGEN_INFO:
            statement = insert(AllergenInfo).values(**info)
            statement = statement.on_conflict_do_update(
                index_elements=["allergen_name"],
                set_={
                    "category": info["category"],
                    "description": info["description"],
                    "common_foods": info["common_foods"],
                    "prevalence_percent": info["prevalence_percent"],
                    "severity": info["severity"],
                    "fsanz_mandatory": info["fsanz_mandatory"],
                    "icon_label": info["icon_label"],
                },
            )
            db.execute(statement)

        db.commit()

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()

def seed_awareness_tips():
    db = SessionLocal()

    try:
        for tip in SEED_AWARENESS_TIPS:
            statement = insert(AwarenessTip).values(**tip)
            statement = statement.on_conflict_do_update(
                constraint="uq_tip_text",
                set_={
                    "category": tip["category"],
                    "relevant_profiles": tip["relevant_profiles"],
                    "priority": tip["priority"],
                    "source": tip["source"],
                },
            )
            db.execute(statement)

        db.commit()

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()


def _safe_int(value, default=0):
    try:
        if value in [None, ""]:
            return default
        return int(float(str(value).strip()))
    except (TypeError, ValueError):
        return default


def _safe_float(value, default=None):
    try:
        if value in [None, ""]:
            return default
        return float(str(value).strip())
    except (TypeError, ValueError):
        return default


def seed_fsanz_awareness_data():
    """Seed Australia-specific FSANZ recall statistics from CSV files.

    These files are kept in Backend/data so the frontend does not hardcode graph values.
    The backend imports them into PostgreSQL and serves graph-ready JSON through the API.
    """
    data_dir = Path(__file__).parent / "data"
    db = SessionLocal()

    try:
        yearly_path = data_dir / "fsanz_undeclared_allergen_recalls_yearly.csv"
        if yearly_path.exists():
            with yearly_path.open("r", encoding="utf-8-sig", newline="") as file:
                for row in csv.DictReader(file):
                    year = _safe_int(row.get("year"), None)
                    if year is None:
                        continue
                    statement = insert(RecallYearly).values(
                        year=year,
                        recalls=_safe_int(row.get("recalls")),
                        percent_of_total=_safe_float(row.get("percent_of_total")),
                        source=clean_value(row.get("source")) or "FSANZ Australian food recall statistics",
                        source_url=clean_value(row.get("source_url")) or "https://www.foodstandards.gov.au/food-recalls/recallstats",
                    ).on_conflict_do_update(
                        index_elements=["year"],
                        set_={
                            "recalls": _safe_int(row.get("recalls")),
                            "percent_of_total": _safe_float(row.get("percent_of_total")),
                            "source": clean_value(row.get("source")) or "FSANZ Australian food recall statistics",
                            "source_url": clean_value(row.get("source_url")) or "https://www.foodstandards.gov.au/food-recalls/recallstats",
                        },
                    )
                    db.execute(statement)

        detection_path = data_dir / "fsanz_detection_methods.csv"
        if detection_path.exists():
            with detection_path.open("r", encoding="utf-8-sig", newline="") as file:
                for row in csv.DictReader(file):
                    year = _safe_int(row.get("year"), None)
                    if year is None:
                        continue
                    values = {
                        "year": year,
                        "customer_complaint": _safe_int(row.get("customer_complaint")),
                        "distributor_or_retailer_complaint": _safe_int(row.get("distributor_or_retailer_complaint")),
                        "routine_government_testing": _safe_int(row.get("routine_government_testing")),
                        "routine_testing_by_company": _safe_int(row.get("routine_testing_by_company")),
                        "other": _safe_int(row.get("other")),
                        "source": clean_value(row.get("source")) or "FSANZ Australian food recall statistics",
                        "source_url": clean_value(row.get("source_url")) or "https://www.foodstandards.gov.au/food-recalls/recallstats",
                    }
                    statement = insert(RecallDetectionMethod).values(**values).on_conflict_do_update(
                        index_elements=["year"],
                        set_={key: value for key, value in values.items() if key != "year"},
                    )
                    db.execute(statement)

        food_types_path = data_dir / "fsanz_allergen_food_types.csv"
        if food_types_path.exists():
            with food_types_path.open("r", encoding="utf-8-sig", newline="") as file:
                for row in csv.DictReader(file):
                    category = clean_value(row.get("category"))
                    if not category:
                        continue
                    statement = insert(RecallFoodType).values(
                        category=category,
                        recalls=_safe_int(row.get("recalls")),
                        percent=_safe_float(row.get("percent")),
                        source=clean_value(row.get("source")) or "FSANZ Australian food recall statistics",
                        source_url=clean_value(row.get("source_url")) or "https://www.foodstandards.gov.au/food-recalls/recallstats",
                    ).on_conflict_do_update(
                        index_elements=["category"],
                        set_={
                            "recalls": _safe_int(row.get("recalls")),
                            "percent": _safe_float(row.get("percent")),
                            "source": clean_value(row.get("source")) or "FSANZ Australian food recall statistics",
                            "source_url": clean_value(row.get("source_url")) or "https://www.foodstandards.gov.au/food-recalls/recallstats",
                        },
                    )
                    db.execute(statement)

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
            "accounts_count": db.query(UserAccount).count(),
            "food_logs_count": db.query(FoodLog).count(),
            "nutrition_goals_count": db.query(NutritionGoal).count(),
            "allergen_info_count": db.query(AllergenInfo).count(),
            "awareness_tips_count": db.query(AwarenessTip).count(),
            "awareness_recall_yearly_count": db.query(RecallYearly).count(),
            "awareness_detection_methods_count": db.query(RecallDetectionMethod).count(),
            "awareness_food_types_count": db.query(RecallFoodType).count(),
        }

    finally:
        db.close()

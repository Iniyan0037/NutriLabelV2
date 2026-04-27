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
    # Common safe/simple ingredients
    ("sugar", "vegan", "Allowed", "Sugar has no direct vegan restriction in the current rules."),
    ("sugar", "vegetarian", "Allowed", "Sugar has no direct vegetarian restriction in the current rules."),
    ("salt", "vegan", "Allowed", "Salt has no direct vegan restriction."),
    ("water", "vegan", "Allowed", "Water has no direct dietary restriction."),
    ("vegetable oil", "vegan", "Allowed", "Vegetable oil is plant-derived."),
    ("sunflower oil", "vegan", "Allowed", "Sunflower oil is plant-derived."),
    ("canola oil", "vegan", "Allowed", "Canola oil is plant-derived."),
    ("olive oil", "vegan", "Allowed", "Olive oil is plant-derived."),
    ("cocoa powder", "vegan", "Allowed", "Cocoa powder has no direct vegan restriction."),
    ("cocoa butter", "vegan", "Allowed", "Cocoa butter is plant-derived."),
    ("cocoa mass", "vegan", "Allowed", "Cocoa mass is plant-derived."),
    ("corn starch", "vegan", "Allowed", "Corn starch is plant-derived."),
    ("rice flour", "vegan", "Allowed", "Rice flour is plant-derived."),
    ("maize starch", "vegan", "Allowed", "Maize starch is plant-derived."),
    ("soy", "vegan", "Allowed", "Soy is plant-derived."),
    ("soy", "nut-free", "Allowed", "Soy is not a tree nut, but users with soy allergy should verify separately."),
    ("flavouring", "vegan", "Uncertain", "Flavouring may require source verification."),
    ("natural flavouring", "vegan", "Uncertain", "Natural flavouring may require source verification."),
    ("artificial flavouring", "vegan", "Uncertain", "Artificial flavouring may require source verification."),
    ("enzymes", "vegan", "Uncertain", "Enzymes may be plant, microbial, or animal-derived depending on source."),
    ("emulsifier", "vegan", "Uncertain", "Generic emulsifier source may require verification."),

    # Dairy
    ("milk", "vegan", "Restricted", "Milk is animal-derived and not suitable for vegan diets."),
    ("milk", "dairy-free", "Restricted", "Milk conflicts with dairy-free diets."),
    ("milk", "vegetarian", "Allowed", "Milk is generally allowed for vegetarian diets."),
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
    ("yogurt", "vegan", "Restricted", "Yogurt is dairy-derived and not suitable for vegan diets."),
    ("yogurt", "dairy-free", "Restricted", "Yogurt conflicts with dairy-free diets."),

    # Egg
    ("egg", "vegan", "Restricted", "Egg is not suitable for vegan diets."),
    ("egg", "Jain", "Restricted", "Egg conflicts with Jain dietary restrictions."),
    ("eggs", "vegan", "Restricted", "Eggs are not suitable for vegan diets."),
    ("eggs", "Jain", "Restricted", "Eggs conflict with Jain dietary restrictions."),
    ("albumen", "vegan", "Restricted", "Albumen is egg-derived and not suitable for vegan diets."),
    ("albumen", "Jain", "Restricted", "Albumen is egg-derived and conflicts with Jain dietary restrictions."),

    # Animal-derived / meat / seafood
    ("gelatin", "vegan", "Restricted", "Gelatin is animal-derived and not suitable for vegan diets."),
    ("gelatin", "vegetarian", "Restricted", "Gelatin is not suitable for vegetarian diets."),
    ("gelatin", "eggetarian", "Restricted", "Gelatin is not suitable for eggetarian diets."),
    ("gelatin", "Jain", "Restricted", "Gelatin conflicts with Jain dietary restrictions."),
    ("gelatin", "halal", "Uncertain", "Gelatin source may require halal certification verification."),
    ("beef", "vegan", "Restricted", "Beef is animal-derived and not suitable for vegan diets."),
    ("beef", "vegetarian", "Restricted", "Beef is not suitable for vegetarian diets."),
    ("beef", "halal", "Uncertain", "Beef requires halal certification verification."),
    ("chicken", "vegan", "Restricted", "Chicken is animal-derived and not suitable for vegan diets."),
    ("chicken", "vegetarian", "Restricted", "Chicken is not suitable for vegetarian diets."),
    ("chicken", "halal", "Uncertain", "Chicken requires halal certification verification."),
    ("pork", "vegan", "Restricted", "Pork is animal-derived and not suitable for vegan diets."),
    ("pork", "vegetarian", "Restricted", "Pork is not suitable for vegetarian diets."),
    ("pork", "halal", "Restricted", "Pork is not suitable for halal diets."),
    ("fish", "vegan", "Restricted", "Fish is animal-derived and not suitable for vegan diets."),
    ("fish", "vegetarian", "Restricted", "Fish is not suitable for vegetarian diets."),
    ("fish", "Jain", "Restricted", "Fish conflicts with Jain dietary restrictions."),
    ("shellfish", "vegan", "Restricted", "Shellfish is animal-derived and not suitable for vegan diets."),
    ("shellfish", "vegetarian", "Restricted", "Shellfish is not suitable for vegetarian diets."),
    ("honey", "vegan", "Restricted", "Honey is animal-derived and not suitable for vegan diets."),
    ("lard", "vegan", "Restricted", "Lard is animal-derived and not suitable for vegan diets."),
    ("lard", "vegetarian", "Restricted", "Lard is not suitable for vegetarian diets."),
    ("lard", "halal", "Restricted", "Lard is commonly pork-derived and not suitable for halal diets."),
    ("tallow", "vegan", "Restricted", "Tallow is animal-derived and not suitable for vegan diets."),
    ("tallow", "vegetarian", "Restricted", "Tallow is not suitable for vegetarian diets."),
    ("rennet", "vegan", "Uncertain", "Rennet may be animal-derived and requires source verification."),
    ("rennet", "vegetarian", "Uncertain", "Rennet may be animal-derived and requires source verification."),

    # Jain
    ("onion", "Jain", "Restricted", "Onion conflicts with Jain dietary restrictions."),
    ("garlic", "Jain", "Restricted", "Garlic conflicts with Jain dietary restrictions."),
    ("potato", "Jain", "Restricted", "Potato is a root vegetable and conflicts with Jain dietary restrictions."),
    ("carrot", "Jain", "Restricted", "Carrot is a root vegetable and may conflict with Jain dietary restrictions."),
    ("beetroot", "Jain", "Restricted", "Beetroot is a root vegetable and may conflict with Jain dietary restrictions."),
    ("radish", "Jain", "Restricted", "Radish is a root vegetable and may conflict with Jain dietary restrictions."),
    ("mushroom", "Jain", "Restricted", "Mushroom may conflict with Jain dietary restrictions."),

    # Gluten
    ("wheat", "gluten-free", "Restricted", "Wheat contains gluten and conflicts with gluten-free diets."),
    ("barley", "gluten-free", "Restricted", "Barley contains gluten and conflicts with gluten-free diets."),
    ("rye", "gluten-free", "Restricted", "Rye contains gluten and conflicts with gluten-free diets."),
    ("oats", "gluten-free", "Uncertain", "Oats may be contaminated with gluten unless certified gluten-free."),
    ("malt", "gluten-free", "Restricted", "Malt is commonly barley-derived and may contain gluten."),
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
    ("pine nut", "nut-free", "Restricted", "Pine nut conflicts with nut-free diets."),

    # Alcohol / halal
    ("alcohol", "halal", "Restricted", "Alcohol is not suitable for halal diets."),
    ("ethanol", "halal", "Restricted", "Ethanol/alcohol is not suitable for halal diets."),
    ("wine", "halal", "Restricted", "Wine is alcohol-based and not suitable for halal diets."),
    ("beer", "halal", "Restricted", "Beer is alcohol-based and not suitable for halal diets."),
    ("rum", "halal", "Restricted", "Rum is alcohol-based and not suitable for halal diets."),

    # Additives
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
    ("e542", "vegan", "Restricted", "E542 is bone phosphate and is animal-derived."),
    ("e542", "vegetarian", "Restricted", "E542 is bone-derived and not suitable for vegetarian diets."),
    ("e904", "vegan", "Restricted", "E904 shellac is insect-derived and not suitable for vegan diets."),
]


SEED_ALIASES = [
    # Sugar/salt/basic
    ("sucrose", "sugar"),
    ("cane sugar", "sugar"),
    ("white sugar", "sugar"),
    ("raw sugar", "sugar"),
    ("brown sugar", "sugar"),
    ("icing sugar", "sugar"),
    ("glucose syrup", "sugar"),
    ("fructose syrup", "sugar"),
    ("corn syrup", "sugar"),
    ("sea salt", "salt"),
    ("sodium chloride", "salt"),

    # Oils
    ("vegetable oils", "vegetable oil"),
    ("palm oil", "vegetable oil"),
    ("sunflower oil", "sunflower oil"),
    ("canola oil", "canola oil"),
    ("rapeseed oil", "canola oil"),
    ("olive oil", "olive oil"),
    ("coconut oil", "vegetable oil"),
    ("cocoa butter", "cocoa butter"),

    # Dairy
    ("skim milk powder", "milk"),
    ("skimmed milk powder", "milk"),
    ("milk powder", "milk"),
    ("whole milk powder", "milk"),
    ("fat reduced milk powder", "milk"),
    ("fat-reduced milk powder", "milk"),
    ("milk solids", "milk"),
    ("total milk solids", "milk"),
    ("dairy solids", "milk"),
    ("milk fat", "milk"),
    ("buttermilk powder", "milk"),
    ("cream powder", "cream"),
    ("whey powder", "whey"),
    ("whey protein", "whey"),
    ("whey protein concentrate", "whey"),
    ("caseinate", "casein"),
    ("sodium caseinate", "casein"),
    ("calcium caseinate", "casein"),
    ("lactose powder", "lactose"),
    ("cheese powder", "cheese"),
    ("yoghurt", "yogurt"),

    # Egg
    ("egg white", "egg"),
    ("egg yolk", "egg"),
    ("whole egg", "egg"),
    ("dried egg", "egg"),
    ("egg powder", "egg"),
    ("albumin", "albumen"),
    ("egg albumen", "albumen"),

    # Animal/meat/fish
    ("gelatine", "gelatin"),
    ("hydrolysed gelatin", "gelatin"),
    ("beef extract", "beef"),
    ("chicken fat", "chicken"),
    ("chicken powder", "

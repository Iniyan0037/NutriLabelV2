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
    ("milk", "vegan", "Restricted", "Milk is animal-derived and not suitable for vegan diets."),
    ("milk", "dairy-free", "Restricted", "Milk conflicts with dairy-free diets."),
    ("milk powder", "vegan", "Restricted", "Milk powder is dairy-derived and not suitable for vegan diets."),
    ("milk powder", "dairy-free", "Restricted", "Milk powder conflicts with dairy-free diets."),
    ("whey", "vegan", "Restricted", "Whey is dairy-derived and not suitable for vegan diets."),
    ("whey", "dairy-free", "Restricted", "Whey conflicts with dairy-free diets."),
    ("casein", "vegan", "Restricted", "Casein is dairy-derived and not suitable for vegan diets."),
    ("casein", "dairy-free", "Restricted", "Casein conflicts with dairy-free diets."),
    ("lactose", "vegan", "Restricted", "Lactose is dairy-derived and not suitable for vegan diets."),
    ("lactose", "dairy-free", "Restricted", "Lactose conflicts with dairy-free diets."),

    ("egg", "vegan", "Restricted", "Egg is not suitable for vegan diets."),
    ("egg", "Jain", "Restricted", "Egg conflicts with Jain dietary restrictions."),
    ("eggs", "vegan", "Restricted", "Eggs are not suitable for vegan diets."),
    ("eggs", "Jain", "Restricted", "Eggs conflict with Jain dietary restrictions."),

    ("gelatin", "vegan", "Restricted", "Gelatin is animal-derived and not suitable for vegan diets."),
    ("gelatin", "vegetarian", "Restricted", "Gelatin is not suitable for vegetarian diets."),
    ("gelatin", "eggetarian", "Restricted", "Gelatin is not suitable for eggetarian diets."),
    ("gelatin", "Jain", "Restricted", "Gelatin conflicts with Jain dietary restrictions."),
    ("gelatin", "halal", "Uncertain", "Gelatin source may require halal certification verification."),

    ("honey", "vegan", "Restricted", "Honey is animal-derived and not suitable for vegan diets."),

    ("onion", "Jain", "Restricted", "Onion conflicts with Jain dietary restrictions."),
    ("garlic", "Jain", "Restricted", "Garlic conflicts with Jain dietary restrictions."),
    ("potato", "Jain", "Restricted", "Potato is a root vegetable and conflicts with Jain dietary restrictions."),

    ("wheat", "gluten-free", "Restricted", "Wheat contains gluten and conflicts with gluten-free diets."),
    ("wheat flour", "gluten-free", "Restricted", "Wheat flour contains gluten and conflicts with gluten-free diets."),
    ("barley", "gluten-free", "Restricted", "Barley contains gluten and conflicts with gluten-free diets."),

    ("peanut", "nut-free", "Restricted", "Peanut conflicts with nut-free diets."),
    ("almond", "nut-free", "Restricted", "Almond conflicts with nut-free diets."),
    ("cashew", "nut-free", "Restricted", "Cashew conflicts with nut-free diets."),
    ("hazelnut", "nut-free", "Restricted", "Hazelnut conflicts with nut-free diets."),
    ("walnut", "nut-free", "Restricted", "Walnut conflicts with nut-free diets."),

    ("e120", "vegan", "Restricted", "E120 is cochineal/carmine and is insect-derived."),
    ("e120", "vegetarian", "Restricted", "E120 is insect-derived."),
    ("e120", "Jain", "Restricted", "E120 is insect-derived and conflicts with Jain dietary restrictions."),
    ("e120", "halal", "Uncertain", "E120 source and certification may require halal verification."),

    ("e441", "vegan", "Restricted", "E441 is gelatin and is animal-derived."),
    ("e441", "vegetarian", "Restricted", "E441 is gelatin and is not suitable for vegetarian diets."),
    ("e441", "Jain", "Restricted", "E441 conflicts with Jain dietary restrictions."),
    ("e441", "halal", "Uncertain", "E441 source may require halal verification."),

    ("e471", "vegan", "Uncertain", "E471 may be derived from plant or animal sources."),
    ("e471", "halal", "Uncertain", "E471 origin may require halal verification."),
    ("e322", "vegan", "Uncertain", "E322 source may vary depending on formulation."),
    ("e322", "halal", "Uncertain", "E322 source may require halal verification."),
]


SEED_ALIASES = [
    ("sucrose", "sugar"),
    ("cane sugar", "sugar"),
    ("sea salt", "salt"),
    ("milk solids", "milk"),
    ("milk powder", "milk"),
    ("lecithin", "e322"),
    ("soy lecithin", "e322"),
    ("mono- and diglycerides of fatty acids", "e471"),
    ("mono and diglycerides of fatty acids", "e471"),
    ("gelatine", "gelatin"),
]


SEED_ALLERGENS = [
    ("milk", "dairy-free"),
    ("whey", "dairy-free"),
    ("casein", "dairy-free"),
    ("lactose", "dairy-free"),
    ("peanut", "nut-free"),
    ("almond", "nut-free"),
    ("cashew", "nut-free"),
    ("hazelnut", "nut-free"),
    ("walnut", "nut-free"),
    ("wheat", "gluten-free"),
    ("barley", "gluten-free"),
    ("egg", "vegan"),
    ("eggs", "vegan"),
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
            statement = statement.on_conflict_do_nothing(
                constraint="uq_rule_ingredient_profile"
            )
            db.execute(statement)

        for alias_name, actual_name in SEED_ALIASES:
            statement = insert(Alias).values(
                alias_name=alias_name.lower(),
                actual_name=actual_name.lower(),
            )
            statement = statement.on_conflict_do_nothing(
                index_elements=["alias_name"]
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
                e_number_statement = e_number_statement.on_conflict_do_nothing(
                    index_elements=["e_number"]
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

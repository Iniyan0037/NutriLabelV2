import os
import re
import time
from collections import OrderedDict, Counter
from datetime import datetime, timezone, date, timedelta

import requests
from flask import Flask, jsonify, request
from flask_cors import CORS
from werkzeug.security import check_password_hash, generate_password_hash

from analyzer import analyze_ingredients
from db import init_db, db_status_counts, SessionLocal, Profile, History, UserAccount, FoodLog, NutritionGoal, AllergenInfo, AwarenessTip, ENumber, Rule, RecallYearly, RecallDetectionMethod, RecallFoodType

app = Flask(__name__)

allowed_origins = (
    os.getenv("ALLOWED_ORIGINS")
    or os.getenv("FRONTEND_ORIGINS")
    or "*"
)

if allowed_origins == "*":
    CORS(app)
else:
    origins = [origin.strip() for origin in allowed_origins.split(",") if origin.strip()]
    CORS(app, resources={r"/*": {"origins": origins}})

MAX_CACHE_ITEMS = 100
MAX_IMAGE_BYTES = 1_500_000
OPENFOOD_API_BASE = os.getenv("OPENFOOD_API_URL", "https://world.openfoodfacts.org")
OCR_SPACE_API_KEY = os.getenv("OCR_SPACE_API_KEY") or os.getenv("OCR_API_KEY")

product_cache = OrderedDict()
last_openfood_request_time = 0.0

init_db()




def get_int(value, default=None):
    try:
        if value is None or value == "":
            return default
        return int(value)
    except (TypeError, ValueError):
        return default


def get_account_id_from_request(data=None):
    data = data or {}
    return get_int(data.get("account_id") or request.args.get("account_id"))


def get_profile_id_from_request(data=None):
    data = data or {}
    return get_int(data.get("profile_id") or request.args.get("profile_id"))


def serialize_profile(profile):
    return {
        "id": profile.id,
        "account_id": profile.account_id,
        "profile_name": profile.profile_name,
        "restrictions": profile.restrictions,
        "explanation": profile.explanation,
        "created_at": profile.created_at.isoformat() if profile.created_at else None,
        "updated_at": profile.updated_at.isoformat() if profile.updated_at else None,
    }


def serialize_food_log(item):
    return {
        "id": item.id,
        "account_id": item.account_id,
        "profile_id": item.profile_id,
        "food_name": item.food_name,
        "serving_size": item.serving_size,
        "calories": item.calories or 0,
        "protein": item.protein or 0,
        "carbs": item.carbs or 0,
        "fat": item.fat or 0,
        "log_date": item.log_date,
        "source": item.source,
        "created_at": item.created_at.isoformat() if item.created_at else None,
    }


def to_float(value, default=0.0):
    try:
        if value in [None, ""]:
            return default
        return float(value)
    except (TypeError, ValueError):
        return default

def cache_get(key):
    value = product_cache.get(key)
    if value is not None:
        product_cache.move_to_end(key)
    return value


def cache_set(key, value):
    product_cache[key] = value
    product_cache.move_to_end(key)

    while len(product_cache) > MAX_CACHE_ITEMS:
        product_cache.popitem(last=False)


def clean_ocr_text(text):
    text = text or ""
    text = text.replace("\n", " ")
    text = re.sub(r"\s+", " ", text).strip()

    lower_text = text.lower()
    if "ingredients" in lower_text:
        text = text[lower_text.find("ingredients"):]

    skip_patterns = [
        r"www\.",
        r"http",
        r"instagram",
        r"facebook",
        r"linkedin",
        r"twitter",
        r"subscribe",
        r"follow us",
    ]

    for pattern in skip_patterns:
        text = re.sub(pattern, " ", text, flags=re.IGNORECASE)

    return re.sub(r"\s+", " ", text).strip()




def nutrition_value(nutriments, *keys):
    for key in keys:
        value = nutriments.get(key)
        if value not in [None, ""]:
            parsed = to_float(value, None)
            if parsed is not None:
                return parsed
    return None


def build_product_nutrition(product):
    nutriments = product.get("nutriments") or {}
    energy_kcal_100g = nutrition_value(
        nutriments,
        "energy-kcal_100g",
        "energy-kcal",
        "energy-kcal_serving",
    )
    if energy_kcal_100g is None:
        energy_kj_100g = nutrition_value(nutriments, "energy_100g", "energy-kj_100g")
        if energy_kj_100g is not None:
            energy_kcal_100g = round(energy_kj_100g / 4.184, 1)

    return {
        "calories_100g": energy_kcal_100g,
        "protein_100g": nutrition_value(nutriments, "proteins_100g", "proteins"),
        "carbs_100g": nutrition_value(nutriments, "carbohydrates_100g", "carbohydrates"),
        "fat_100g": nutrition_value(nutriments, "fat_100g", "fat"),
        "sugars_100g": nutrition_value(nutriments, "sugars_100g", "sugars"),
        "fiber_100g": nutrition_value(nutriments, "fiber_100g", "fiber"),
        "salt_100g": nutrition_value(nutriments, "salt_100g", "salt"),
        "serving_size": product.get("serving_size") or product.get("quantity") or "",
        "serving_quantity": nutrition_value(product, "serving_quantity"),
        "data_source": "Open Food Facts",
    }


def extract_nutrition_from_text(raw_text):
    text = re.sub(r"\s+", " ", raw_text or " ").strip()
    lower = text.lower()

    def find_value(patterns):
        for pattern in patterns:
            match = re.search(pattern, lower, flags=re.IGNORECASE)
            if match:
                value = match.group(1).replace(",", ".")
                parsed = to_float(value, None)
                if parsed is not None:
                    return parsed
        return None

    calories = find_value([
        r"(?:energy|calories|calorie|kcal)[^0-9]{0,25}(\d+(?:[\.,]\d+)?)\s*(?:kcal|cal)?",
        r"(\d+(?:[\.,]\d+)?)\s*kcal",
    ])
    protein = find_value([r"protein[^0-9]{0,25}(\d+(?:[\.,]\d+)?)\s*g"])
    carbs = find_value([r"(?:carbohydrate|carbohydrates|carbs)[^0-9]{0,25}(\d+(?:[\.,]\d+)?)\s*g"])
    fat = find_value([r"(?:total fat|fat)[^0-9]{0,25}(\d+(?:[\.,]\d+)?)\s*g"])
    sugars = find_value([r"(?:sugars|sugar)[^0-9]{0,25}(\d+(?:[\.,]\d+)?)\s*g"])
    salt = find_value([r"salt[^0-9]{0,25}(\d+(?:[\.,]\d+)?)\s*g"])

    values = {
        "calories_100g": calories,
        "protein_100g": protein,
        "carbs_100g": carbs,
        "fat_100g": fat,
        "sugars_100g": sugars,
        "salt_100g": salt,
        "data_source": "OCR label text",
    }
    return {key: value for key, value in values.items() if value not in [None, ""]}


def get_json_body():
    return request.get_json(silent=True) or {}


def build_summary(status):
    if status == "Restricted":
        return "This product is not suitable for your selected dietary restrictions."
    if status == "Uncertain":
        return "This product may need further checking for your selected dietary restrictions."
    if status == "Safe":
        return "No direct conflicts were found for your selected dietary profiles."
    return "No analysis summary available."


def build_frontend_compatible_analysis(analysis):
    if not isinstance(analysis, dict):
        return {
            "overall_result": "Uncertain",
            "status": "Uncertain",
            "summary": "Analysis failed or returned an invalid response.",
            "ingredients": [],
            "ingredients_analysis": [],
            "additives_analysis": [],
            "allergens_analysis": [],
        }

    overall = analysis.get("overall_result") or analysis.get("status") or "Uncertain"

    if overall == "Allowed":
        overall = "Safe"

    ingredient_items = []

    if isinstance(analysis.get("ingredients"), list):
        ingredient_items.extend(analysis.get("ingredients"))

    for key in ["ingredients_analysis", "additives_analysis", "allergens_analysis"]:
        if isinstance(analysis.get(key), list):
            ingredient_items.extend(analysis.get(key))

    frontend_items = []

    for item in ingredient_items:
        if not isinstance(item, dict):
            continue

        name = (
            item.get("name")
            or item.get("ingredient")
            or item.get("matched_name")
            or item.get("item")
            or "Unknown"
        )

        frontend_items.append({
            "name": name,
            "ingredient": item.get("ingredient", name),
            "matched_name": item.get("matched_name", name),
            "status": item.get("status") or "Uncertain",
            "reason": item.get("reason") or "No explanation available.",
            "matched_profiles": item.get("matched_profiles", []),
            "match_type": item.get("match_type"),
            "source": item.get("source"),
        })

    compatible = dict(analysis)
    compatible["overall_result"] = overall
    compatible["status"] = overall
    compatible["summary"] = analysis.get("summary") or build_summary(overall)
    compatible["ingredients"] = frontend_items

    if "ingredients_analysis" not in compatible:
        compatible["ingredients_analysis"] = frontend_items

    return compatible


def run_analysis(ingredient_text, selected_profiles, additives_tags=None, allergens_tags=None):
    raw_result = analyze_ingredients(
        ingredient_text=ingredient_text,
        selected_profiles=selected_profiles,
        additives_tags=additives_tags or [],
        allergens_tags=allergens_tags or [],
    )

    return build_frontend_compatible_analysis(raw_result)


@app.route("/", methods=["GET"])
def home():
    return jsonify({
        "message": "NutriLabel backend is running",
        "status": "ok",
        "version": "iteration-2",
    })


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})


@app.route("/db-status", methods=["GET"])
def db_status():
    return jsonify({
        "status": "ok",
        **db_status_counts(),
    })


@app.route("/analyze", methods=["POST"])
def analyze():
    data = get_json_body()

    ingredient_text = data.get("ingredient_text", "")
    selected_profiles = data.get("selected_profiles", [])

    if not isinstance(ingredient_text, str):
        return jsonify({"error": "ingredient_text must be a string"}), 400

    if not isinstance(selected_profiles, list):
        return jsonify({"error": "selected_profiles must be a list"}), 400

    if not ingredient_text.strip():
        return jsonify({"error": "ingredient_text cannot be empty"}), 400

    result = run_analysis(
        ingredient_text=ingredient_text,
        selected_profiles=selected_profiles,
    )

    return jsonify(result)


@app.route("/product/<barcode>", methods=["GET"])
def get_product(barcode):
    global last_openfood_request_time

    selected_profiles = request.args.getlist("profile")
    normalized_barcode = str(barcode or "").strip()

    if not normalized_barcode:
        return jsonify({"error": "barcode cannot be empty"}), 400

    if not normalized_barcode.isdigit():
        return jsonify({"error": "barcode must contain digits only"}), 400

    cache_key = f"{normalized_barcode}|{','.join(sorted(selected_profiles))}"
    cached = cache_get(cache_key)

    if cached is not None:
        return jsonify(cached)

    now = time.time()

    if now - last_openfood_request_time < 1:
        time.sleep(1 - (now - last_openfood_request_time))

    off_url = (
        f"{OPENFOOD_API_BASE.rstrip('/')}/api/v2/product/{normalized_barcode}.json"
        "?fields=product_name,product_name_en,ingredients_text,ingredients_text_en,"
        "brands,allergens_tags,additives_tags,nutriments,serving_size,serving_quantity,quantity"
    )

    try:
        response = requests.get(
            off_url,
            timeout=20,
            headers={"User-Agent": "NutriLabel/2.0 (student project)"},
        )
        last_openfood_request_time = time.time()

        if response.status_code == 429:
            return jsonify({
                "error": "Open Food Facts rate limit reached",
                "details": "Too many requests. Please wait and try again.",
            }), 429

        response.raise_for_status()
        off_data = response.json()

    except requests.RequestException as error:
        return jsonify({
            "error": "Could not reach Open Food Facts",
            "details": str(error),
        }), 502

    except ValueError as error:
        return jsonify({
            "error": "Invalid response from Open Food Facts",
            "details": str(error),
        }), 502

    if off_data.get("status") != 1:
        return jsonify({"error": "Product not found"}), 404

    product = off_data.get("product", {}) or {}

    ingredient_text = (
        product.get("ingredients_text_en")
        or product.get("ingredients_text")
        or ""
    )

    product_name = (
        product.get("product_name_en")
        or product.get("product_name")
        or "Unknown Product"
    )

    brands = product.get("brands", "")
    allergens = product.get("allergens_tags", []) or []
    additives = product.get("additives_tags", []) or []
    nutrition = build_product_nutrition(product)

    analysis = run_analysis(
        ingredient_text=ingredient_text,
        selected_profiles=selected_profiles,
        additives_tags=additives,
        allergens_tags=allergens,
    )

    result = {
        "barcode": normalized_barcode,
        "product_name": product_name,
        "brands": brands,
        "ingredient_text": ingredient_text,
        "allergens_tags": allergens,
        "additives_tags": additives,
        "nutrition": nutrition,
        "analysis": analysis,
    }

    cache_set(cache_key, result)
    return jsonify(result)


@app.route("/ocr", methods=["POST"])
def extract_text_from_image():
    if "image" not in request.files:
        return jsonify({"error": "No image file provided"}), 400

    if not OCR_SPACE_API_KEY:
        return jsonify({
            "error": "OCR API key is not configured",
            "details": "Set OCR_SPACE_API_KEY or OCR_API_KEY in Render environment variables.",
        }), 500

    image_file = request.files["image"]

    if not image_file or not image_file.filename:
        return jsonify({"error": "Empty image filename"}), 400

    image_file.seek(0, os.SEEK_END)
    file_size = image_file.tell()
    image_file.seek(0)

    if file_size > MAX_IMAGE_BYTES:
        return jsonify({
            "error": "Image file is too large",
            "details": "Please upload a smaller or compressed image.",
            "max_bytes": MAX_IMAGE_BYTES,
        }), 413

    try:
        response = requests.post(
            "https://api.ocr.space/parse/image",
            files={
                "file": (
                    image_file.filename,
                    image_file.stream,
                    image_file.mimetype or "image/jpeg",
                )
            },
            data={
                "apikey": OCR_SPACE_API_KEY,
                "language": "eng",
                "OCREngine": "2",
                "isOverlayRequired": "false",
                "scale": "true",
            },
            timeout=45,
        )

        response.raise_for_status()
        ocr_data = response.json()

    except requests.RequestException as error:
        return jsonify({
            "error": "OCR provider request failed",
            "details": str(error),
        }), 502

    except ValueError as error:
        return jsonify({
            "error": "Invalid OCR provider response",
            "details": str(error),
        }), 502

    if ocr_data.get("IsErroredOnProcessing"):
        return jsonify({
            "error": "OCR processing failed",
            "details": ocr_data.get("ErrorMessage") or ocr_data.get("ErrorDetails"),
        }), 502

    parsed_results = ocr_data.get("ParsedResults") or []
    raw_text_parts = []

    for item in parsed_results:
        if isinstance(item, dict):
            parsed_text = item.get("ParsedText") or ""
            if parsed_text:
                raw_text_parts.append(parsed_text)

    extracted_text = clean_ocr_text(" ".join(raw_text_parts))

    if not extracted_text:
        return jsonify({
            "error": "No text detected",
            "details": "Please upload a clearer image of the ingredient list.",
        }), 400

    raw_text = " ".join(raw_text_parts).strip()
    return jsonify({
        "ingredient_text": extracted_text,
        "raw_text": raw_text,
        "nutrition": extract_nutrition_from_text(raw_text),
    })


@app.route("/onboarding", methods=["POST"])
def onboarding():
    data = get_json_body()

    diet = data.get("diet")
    allergies = data.get("allergies", [])
    religious = data.get("religious", [])
    extra_restrictions = data.get("extra_restrictions", [])

    profile = []
    explanation = {}

    def add_profile(profile_name, reason):
        if profile_name not in profile:
            profile.append(profile_name)
            explanation[profile_name] = reason

    if isinstance(diet, str):
        diet_value = diet.strip()
        if diet_value in ["vegan", "vegetarian", "eggetarian", "Jain"]:
            add_profile(
                diet_value,
                f"Selected because the user chose {diet_value} as their dietary preference.",
            )

    if isinstance(religious, list):
        for item in religious:
            value = str(item).strip().lower()

            if value == "halal":
                add_profile(
                    "halal",
                    "Selected because the user chose halal dietary requirements.",
                )

            if value == "jain":
                add_profile(
                    "Jain",
                    "Selected because the user chose Jain dietary requirements.",
                )

    if isinstance(allergies, list):
        allergy_map = {
            "nut": "nut-free",
            "nuts": "nut-free",
            "peanut": "nut-free",
            "peanuts": "nut-free",
            "tree nuts": "nut-free",
            "dairy": "dairy-free",
            "milk": "dairy-free",
            "lactose": "dairy-free",
            "gluten": "gluten-free",
            "wheat": "gluten-free",
        }

        for allergy in allergies:
            key = str(allergy).lower().strip()
            mapped_profile = allergy_map.get(key)

            if mapped_profile:
                add_profile(
                    mapped_profile,
                    f"Selected because the user indicated {allergy} allergy or intolerance.",
                )

    if isinstance(extra_restrictions, list):
        valid_extra = {
            "vegan",
            "vegetarian",
            "eggetarian",
            "halal",
            "Jain",
            "nut-free",
            "dairy-free",
            "gluten-free",
        }

        for restriction in extra_restrictions:
            value = str(restriction).strip()

            if value in valid_extra:
                add_profile(
                    value,
                    f"Selected because the user manually added {value}.",
                )

    return jsonify({
        "profile": profile,
        "explanation": explanation,
    })


@app.route("/auth/register", methods=["POST"])
def register_account():
    data = get_json_body()
    family_name = str(data.get("family_name") or "").strip()
    pin = str(data.get("pin") or "").strip()

    if len(family_name) < 2:
        return jsonify({"error": "Shared login name must be at least 2 characters"}), 400
    if len(pin) < 4:
        return jsonify({"error": "pin must be at least 4 digits or characters"}), 400

    db = SessionLocal()
    try:
        existing = db.query(UserAccount).filter(UserAccount.family_name.ilike(family_name)).first()
        if existing:
            return jsonify({"error": "This shared login already exists. Please sign in instead."}), 409

        account = UserAccount(family_name=family_name, pin_hash=generate_password_hash(pin))
        db.add(account)
        db.commit()
        db.refresh(account)
        return jsonify({"id": account.id, "family_name": account.family_name}), 201
    finally:
        db.close()


@app.route("/auth/login", methods=["POST"])
def login_account():
    data = get_json_body()
    family_name = str(data.get("family_name") or "").strip()
    pin = str(data.get("pin") or "").strip()

    db = SessionLocal()
    try:
        account = db.query(UserAccount).filter(UserAccount.family_name.ilike(family_name)).first()
        if not account or not check_password_hash(account.pin_hash, pin):
            return jsonify({"error": "Invalid shared login name or PIN"}), 401
        return jsonify({"id": account.id, "family_name": account.family_name})
    finally:
        db.close()


@app.route("/profile/save", methods=["POST"])
def save_profile():
    data = get_json_body()

    account_id = get_account_id_from_request(data)
    profile_name = data.get("profile_name") or "My Dietary Profile"
    restrictions = data.get("restrictions", [])
    explanation = data.get("explanation", {})

    if not account_id:
        return jsonify({"error": "account_id is required so profiles stay tied to one shared login"}), 400
    if not isinstance(profile_name, str) or not profile_name.strip():
        return jsonify({"error": "profile_name must be a non-empty string"}), 400
    if not isinstance(restrictions, list) or not restrictions:
        return jsonify({"error": "restrictions must be a non-empty list"}), 400
    if not isinstance(explanation, dict):
        return jsonify({"error": "explanation must be an object"}), 400

    db = SessionLocal()
    try:
        if db.query(Profile).filter(Profile.account_id == account_id).count() >= 6:
            return jsonify({"error": "A shared login can only have a maximum of six profiles."}), 400

        profile = Profile(account_id=account_id, profile_name=profile_name.strip(), restrictions=restrictions, explanation=explanation)
        db.add(profile)
        db.commit()
        db.refresh(profile)
        return jsonify(serialize_profile(profile)), 201
    finally:
        db.close()


@app.route("/profiles", methods=["GET"])
def get_profiles():
    account_id = get_account_id_from_request()
    db = SessionLocal()
    try:
        query = db.query(Profile)
        if account_id:
            query = query.filter(Profile.account_id == account_id)
        profiles = query.order_by(Profile.created_at.desc()).all()
        return jsonify([serialize_profile(profile) for profile in profiles])
    finally:
        db.close()


@app.route("/profile/update/<int:profile_id>", methods=["PUT"])
def update_profile(profile_id):
    data = get_json_body()
    account_id = get_account_id_from_request(data)
    db = SessionLocal()
    try:
        query = db.query(Profile).filter(Profile.id == profile_id)
        if account_id:
            query = query.filter(Profile.account_id == account_id)
        profile = query.first()
        if not profile:
            return jsonify({"error": "Profile not found"}), 404

        if "profile_name" in data:
            profile_name = data.get("profile_name")
            if not isinstance(profile_name, str) or not profile_name.strip():
                return jsonify({"error": "profile_name must be a non-empty string"}), 400
            profile.profile_name = profile_name.strip()
        if "restrictions" in data:
            restrictions = data.get("restrictions")
            if not isinstance(restrictions, list) or not restrictions:
                return jsonify({"error": "restrictions must be a non-empty list"}), 400
            profile.restrictions = restrictions
        if "explanation" in data:
            explanation = data.get("explanation")
            if not isinstance(explanation, dict):
                return jsonify({"error": "explanation must be an object"}), 400
            profile.explanation = explanation

        profile.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(profile)
        return jsonify(serialize_profile(profile))
    finally:
        db.close()


@app.route("/profile/delete/<int:profile_id>", methods=["DELETE"])
def delete_profile(profile_id):
    account_id = get_account_id_from_request()
    db = SessionLocal()
    try:
        query = db.query(Profile).filter(Profile.id == profile_id)
        if account_id:
            query = query.filter(Profile.account_id == account_id)
        profile = query.first()
        if not profile:
            return jsonify({"error": "Profile not found"}), 404
        db.query(History).filter(History.profile_id == profile_id).delete()
        db.query(FoodLog).filter(FoodLog.profile_id == profile_id).delete()
        db.delete(profile)
        db.commit()
        return jsonify({"message": "Profile deleted successfully", "deleted_id": profile_id})
    finally:
        db.close()


@app.route("/history/save", methods=["POST"])
def save_history():
    data = get_json_body()
    account_id = get_account_id_from_request(data)
    profile_id = get_profile_id_from_request(data)
    product_name = data.get("product_name") or "Manual Analysis"
    ingredients = data.get("ingredients", "")
    result = data.get("result", "")
    analysis_json = data.get("analysis_json")
    profile_used = data.get("profile_used", [])

    if not account_id:
        return jsonify({"error": "account_id is required so history stays tied to one shared login"}), 400
    if not isinstance(product_name, str) or not product_name.strip():
        return jsonify({"error": "product_name must be a non-empty string"}), 400
    if not isinstance(ingredients, str) or not ingredients.strip():
        return jsonify({"error": "ingredients must be a non-empty string"}), 400
    if not isinstance(result, str) or not result.strip():
        return jsonify({"error": "result must be a non-empty string"}), 400
    if not isinstance(analysis_json, dict):
        return jsonify({"error": "analysis_json must be an object"}), 400
    if not isinstance(profile_used, list):
        return jsonify({"error": "profile_used must be a list"}), 400

    db = SessionLocal()
    try:
        history = History(account_id=account_id, profile_id=profile_id, product_name=product_name.strip(), ingredients=ingredients.strip(), result=result.strip(), analysis_json=analysis_json, profile_used=profile_used)
        db.add(history)
        db.commit()
        db.refresh(history)
        return jsonify({"id": history.id, "account_id": history.account_id, "profile_id": history.profile_id, "product_name": history.product_name, "result": history.result, "profile_used": history.profile_used, "timestamp": history.timestamp.isoformat() if history.timestamp else None}), 201
    finally:
        db.close()


@app.route("/history", methods=["GET"])
def get_history():
    account_id = get_account_id_from_request()
    profile_id = get_profile_id_from_request()
    db = SessionLocal()
    try:
        query = db.query(History)
        if account_id:
            query = query.filter(History.account_id == account_id)
        if profile_id:
            query = query.filter(History.profile_id == profile_id)
        history_items = query.order_by(History.timestamp.desc()).all()
        return jsonify([{
            "id": item.id, "account_id": item.account_id, "profile_id": item.profile_id,
            "product_name": item.product_name, "result": item.result, "profile_used": item.profile_used,
            "timestamp": item.timestamp.isoformat() if item.timestamp else None
        } for item in history_items])
    finally:
        db.close()


@app.route("/history/<int:history_id>", methods=["GET"])
def get_history_detail(history_id):
    account_id = get_account_id_from_request()
    db = SessionLocal()
    try:
        query = db.query(History).filter(History.id == history_id)
        if account_id:
            query = query.filter(History.account_id == account_id)
        item = query.first()
        if not item:
            return jsonify({"error": "History item not found"}), 404
        return jsonify({"id": item.id, "account_id": item.account_id, "profile_id": item.profile_id, "product_name": item.product_name, "ingredients": item.ingredients, "result": item.result, "analysis_json": item.analysis_json, "profile_used": item.profile_used, "timestamp": item.timestamp.isoformat() if item.timestamp else None})
    finally:
        db.close()


@app.route("/history/delete/<int:history_id>", methods=["DELETE"])
def delete_history_item(history_id):
    account_id = get_account_id_from_request()
    db = SessionLocal()
    try:
        query = db.query(History).filter(History.id == history_id)
        if account_id:
            query = query.filter(History.account_id == account_id)
        item = query.first()
        if not item:
            return jsonify({"error": "History item not found"}), 404
        db.delete(item)
        db.commit()
        return jsonify({"message": "History item deleted successfully", "deleted_id": history_id})
    finally:
        db.close()


@app.route("/recommendations", methods=["GET"])
def recommendations():
    profiles = request.args.getlist("profile")
    recommendations_list = []

    def add_recommendation(rec_type, item, reason):
        candidate = {
            "type": rec_type,
            "item": item,
            "reason": reason,
        }

        if candidate not in recommendations_list:
            recommendations_list.append(candidate)

    if "vegan" in profiles:
        add_recommendation("avoid", "milk, egg, gelatin, honey", "These are animal-derived and may not suit vegan diets.")
        add_recommendation("alternative", "oat milk or soy milk", "Plant-based alternatives may suit vegan users.")

    if "vegetarian" in profiles:
        add_recommendation("avoid", "gelatin and animal-derived additives", "These may not suit vegetarian diets.")

    if "eggetarian" in profiles:
        add_recommendation("avoid", "gelatin and non-egg animal-derived ingredients", "Eggetarian users may still avoid many animal-derived food additives.")

    if "Jain" in profiles:
        add_recommendation("avoid", "onion, garlic, potato and root vegetables", "These conflict with Jain dietary restrictions.")

    if "halal" in profiles:
        add_recommendation("avoid", "gelatin, alcohol-based ingredients and uncertified animal derivatives", "These may require halal certification verification.")

    if "nut-free" in profiles:
        add_recommendation("avoid", "peanut, almond, cashew, hazelnut and walnut", "These conflict with nut-free requirements.")
        recommendations_list = [rec for rec in recommendations_list if "almond milk" not in rec.get("item", "").lower()]

    if "dairy-free" in profiles:
        add_recommendation("avoid", "milk, whey, casein and lactose", "These are dairy-derived ingredients.")

    if "gluten-free" in profiles:
        add_recommendation("avoid", "wheat, barley and rye", "These may contain gluten.")

    return jsonify({
        "profiles": profiles,
        "recommendations": recommendations_list,
    })


@app.route("/awareness/allergens", methods=["GET"])
def awareness_allergens():
    db = SessionLocal()

    try:
        allergens = db.query(AllergenInfo).order_by(AllergenInfo.id).all()

        if not allergens:
            return jsonify({
                "allergens": [],
                "total_count": 0,
                "source": "FSANZ — Food Standards Australia New Zealand",
                "message": "No allergen awareness data found.",
            })

        allergen_list = []

        for item in allergens:
            common_foods_list = [
                food.strip()
                for food in (item.common_foods or "").split(",")
                if food.strip()
            ]

            allergen_list.append({
                "id": item.id,
                "allergen_name": item.allergen_name,
                "category": item.category,
                "description": item.description,
                "common_foods": common_foods_list,
                "prevalence_percent": item.prevalence_percent,
                "severity": item.severity,
                "fsanz_mandatory": item.fsanz_mandatory == "Yes",
                "icon_label": item.icon_label,
            })

        severity_counts = {
            "Severe": 0,
            "Moderate to Severe": 0,
            "Mild to Moderate": 0,
            "Mild to Severe": 0,
        }

        category_counts = {}

        for item in allergen_list:
            severity = item["severity"]
            if severity in severity_counts:
                severity_counts[severity] += 1

            cat = item["category"]
            category_counts[cat] = category_counts.get(cat, 0) + 1

        return jsonify({
            "allergens": allergen_list,
            "total_count": len(allergen_list),
            "source": "FSANZ — Food Standards Australia New Zealand",
            "last_updated": "February 2026",
            "summary": {
                "severity_breakdown": severity_counts,
                "category_breakdown": category_counts,
            },
        })

    except Exception as error:
        return jsonify({
            "error": "Could not fetch allergen awareness data",
            "details": str(error),
        }), 500

    finally:
        db.close()



@app.route("/awareness/recalls", methods=["GET"])
def awareness_recalls():
    """Return graph-ready Australian recall statistics from PostgreSQL."""
    db = SessionLocal()

    try:
        yearly_rows = db.query(RecallYearly).order_by(RecallYearly.year).all()
        detection_rows = db.query(RecallDetectionMethod).order_by(RecallDetectionMethod.year).all()
        food_type_rows = db.query(RecallFoodType).order_by(RecallFoodType.recalls.desc()).all()

        yearly = [
            {
                "label": str(row.year),
                "year": row.year,
                "value": row.recalls,
                "recalls": row.recalls,
                "percent": row.percent_of_total,
                "note": f"{int(row.percent_of_total)}% of recalls" if row.percent_of_total is not None else "",
            }
            for row in yearly_rows
        ]

        detection_by_year = []
        detection_totals = {
            "Customer complaints": 0,
            "Retailer complaints": 0,
            "Government testing": 0,
            "Company testing": 0,
            "Other / unknown": 0,
        }

        for row in detection_rows:
            item = {
                "year": row.year,
                "label": str(row.year),
                "customer_complaint": row.customer_complaint or 0,
                "distributor_or_retailer_complaint": row.distributor_or_retailer_complaint or 0,
                "routine_government_testing": row.routine_government_testing or 0,
                "routine_testing_by_company": row.routine_testing_by_company or 0,
                "other": row.other or 0,
            }
            detection_by_year.append(item)
            detection_totals["Customer complaints"] += item["customer_complaint"]
            detection_totals["Retailer complaints"] += item["distributor_or_retailer_complaint"]
            detection_totals["Government testing"] += item["routine_government_testing"]
            detection_totals["Company testing"] += item["routine_testing_by_company"]
            detection_totals["Other / unknown"] += item["other"]

        detection_total_chart = [
            {"label": label, "value": value}
            for label, value in detection_totals.items()
        ]

        food_types = [
            {
                "label": row.category,
                "category": row.category,
                "value": row.recalls,
                "recalls": row.recalls,
                "percent": row.percent,
                "note": f"{int(row.percent)}%" if row.percent is not None else "",
            }
            for row in food_type_rows
        ]

        source_url = "https://www.foodstandards.gov.au/food-recalls/recallstats"
        return jsonify({
            "source": "FSANZ Australian food recall statistics",
            "source_url": source_url,
            "last_updated": "30 April 2026",
            "summary": {
                "undeclared_allergen_total_2021_2025": sum(row.recalls for row in yearly_rows),
                "highest_year": max(yearly, key=lambda item: item["value"], default={}),
                "main_detection_method": max(detection_total_chart, key=lambda item: item["value"], default={}),
            },
            "yearly": yearly,
            "detection_by_year": detection_by_year,
            "detection_totals": detection_total_chart,
            "food_types": food_types,
        })

    except Exception as error:
        return jsonify({
            "error": "Could not fetch recall awareness data",
            "details": str(error),
        }), 500

    finally:
        db.close()


@app.route("/awareness/allergens/<int:allergen_id>", methods=["GET"])
def awareness_allergen_detail(allergen_id):
    db = SessionLocal()

    try:
        item = db.query(AllergenInfo).filter(AllergenInfo.id == allergen_id).first()

        if not item:
            return jsonify({"error": "Allergen not found"}), 404

        common_foods_list = [
            food.strip()
            for food in (item.common_foods or "").split(",")
            if food.strip()
        ]

        return jsonify({
            "id": item.id,
            "allergen_name": item.allergen_name,
            "category": item.category,
            "description": item.description,
            "common_foods": common_foods_list,
            "prevalence_percent": item.prevalence_percent,
            "severity": item.severity,
            "fsanz_mandatory": item.fsanz_mandatory == "Yes",
            "icon_label": item.icon_label,
        })

    except Exception as error:
        return jsonify({
            "error": "Could not fetch allergen detail",
            "details": str(error),
        }), 500

    finally:
        db.close()


@app.route("/awareness/additives", methods=["GET"])
def awareness_additives():
    db = SessionLocal()

    try:
        search_query = request.args.get("q", "").strip().lower()
        category_filter = request.args.get("category", "").strip().lower()
        page = max(int(request.args.get("page", 1)), 1)
        per_page = min(max(int(request.args.get("per_page", 20)), 1), 100)

        query = db.query(ENumber)

        if search_query:
            search_term = f"%{search_query}%"
            query = query.filter(
                (ENumber.e_number.ilike(search_term)) |
                (ENumber.name.ilike(search_term)) |
                (ENumber.notes.ilike(search_term)) |
                (ENumber.e_type.ilike(search_term))
            )

        if category_filter:
            query = query.filter(ENumber.e_type.ilike(f"%{category_filter}%"))

        total_count = query.count()
        additives = (
            query
            .order_by(ENumber.e_number)
            .offset((page - 1) * per_page)
            .limit(per_page)
            .all()
        )

        additive_list = []

        for item in additives:
            dietary_flags = _get_dietary_flags(db, item.e_number)

            additive_list.append({
                "id": item.id,
                "e_number": item.e_number.upper(),
                "name": item.name,
                "origin": item.origin,
                "category": item.e_type,
                "notes": item.notes,
                "halal_status": item.halal_status,
                "dietary_flags": dietary_flags,
            })

        all_categories = (
            db.query(ENumber.e_type)
            .filter(ENumber.e_type.isnot(None), ENumber.e_type != "")
            .distinct()
            .order_by(ENumber.e_type)
            .all()
        )

        category_options = sorted(set(
            cat[0].strip() for cat in all_categories if cat[0] and cat[0].strip()
        ))

        return jsonify({
            "additives": additive_list,
            "total_count": total_count,
            "page": page,
            "per_page": per_page,
            "total_pages": max(1, -(-total_count // per_page)),
            "categories": category_options,
            "search_query": search_query or None,
        })

    except Exception as error:
        return jsonify({
            "error": "Could not fetch additive data",
            "details": str(error),
        }), 500

    finally:
        db.close()


@app.route("/awareness/additives/<path:e_number>", methods=["GET"])
def awareness_additive_detail(e_number):
    db = SessionLocal()

    try:
        normalized = e_number.lower().strip().replace(" ", "").replace("-", "")
        item = db.query(ENumber).filter(ENumber.e_number == normalized).first()

        if not item:
            return jsonify({"error": f"Additive '{e_number}' not found"}), 404

        dietary_flags = _get_dietary_flags(db, item.e_number)

        return jsonify({
            "id": item.id,
            "e_number": item.e_number.upper(),
            "name": item.name,
            "origin": item.origin,
            "category": item.e_type,
            "notes": item.notes,
            "halal_status": item.halal_status,
            "dietary_flags": dietary_flags,
        })

    except Exception as error:
        return jsonify({
            "error": "Could not fetch additive detail",
            "details": str(error),
        }), 500

    finally:
        db.close()


def _get_dietary_flags(db, e_number):
    rules = (
        db.query(Rule)
        .filter(Rule.ingredient_name == e_number.lower())
        .all()
    )

    flags = []

    for rule in rules:
        flags.append({
            "profile": rule.profile,
            "status": rule.status,
            "reason": rule.reason,
        })

    if not any(f["profile"] == "halal" for f in flags):
        item = db.query(ENumber).filter(ENumber.e_number == e_number.lower()).first()

        if item and item.halal_status:
            halal_lower = item.halal_status.lower()

            if "haram" in halal_lower or "not halal" in halal_lower:
                flags.append({
                    "profile": "halal",
                    "status": "Restricted",
                    "reason": f"Marked as {item.halal_status} in the additives dataset.",
                })
            elif any(word in halal_lower for word in ["mushbooh", "doubt", "unknown", "questionable"]):
                flags.append({
                    "profile": "halal",
                    "status": "Uncertain",
                    "reason": f"Marked as {item.halal_status} — may require halal verification.",
                })
            elif "halal" in halal_lower:
                flags.append({
                    "profile": "halal",
                    "status": "Allowed",
                    "reason": f"Marked as {item.halal_status} in the additives dataset.",
                })

    return flags


@app.route("/awareness/insights", methods=["GET"])
def awareness_insights():
    db = SessionLocal()

    try:
        query = db.query(History)
        account_id = get_account_id_from_request()
        profile_id = get_profile_id_from_request()
        if account_id:
            query = query.filter(History.account_id == account_id)
        if profile_id:
            query = query.filter(History.profile_id == profile_id)
        history_items = query.order_by(History.timestamp.desc()).all()

        if not history_items:
            return jsonify({
                "has_data": False,
                "total_scans": 0,
                "message": "No scan history found. Start scanning products to see your personal insights.",
            })

        total_scans = len(history_items)

        result_counts = {"Safe": 0, "Uncertain": 0, "Restricted": 0}

        for item in history_items:
            result = (item.result or "").strip()

            if result in result_counts:
                result_counts[result] += 1
            elif result == "Allowed":
                result_counts["Safe"] += 1
            else:
                result_counts["Uncertain"] += 1

        restricted_ingredients = {}
        uncertain_ingredients = {}
        all_flagged_profiles = {}

        for item in history_items:
            analysis = item.analysis_json or {}

            all_items = []

            for key in ["ingredients_analysis", "additives_analysis", "allergens_analysis", "ingredients"]:
                if isinstance(analysis.get(key), list):
                    all_items.extend(analysis[key])

            for ing in all_items:
                if not isinstance(ing, dict):
                    continue

                status = ing.get("status", "")
                name = (
                    ing.get("matched_name")
                    or ing.get("name")
                    or ing.get("ingredient")
                    or ""
                ).strip().lower()

                if not name:
                    continue

                if status == "Restricted":
                    restricted_ingredients[name] = restricted_ingredients.get(name, 0) + 1
                elif status == "Uncertain":
                    uncertain_ingredients[name] = uncertain_ingredients.get(name, 0) + 1

                for profile in (ing.get("matched_profiles") or []):
                    all_flagged_profiles[profile] = all_flagged_profiles.get(profile, 0) + 1

            for profile in (item.profile_used or []):
                if isinstance(profile, str):
                    all_flagged_profiles[profile] = all_flagged_profiles.get(profile, 0)

        top_restricted = sorted(restricted_ingredients.items(), key=lambda x: x[1], reverse=True)[:10]
        top_uncertain = sorted(uncertain_ingredients.items(), key=lambda x: x[1], reverse=True)[:10]

        profile_usage = {}

        for item in history_items:
            for profile in (item.profile_used or []):
                if isinstance(profile, str) and profile:
                    profile_usage[profile] = profile_usage.get(profile, 0) + 1

        profile_usage_sorted = sorted(profile_usage.items(), key=lambda x: x[1], reverse=True)

        recent_scans = []

        for item in history_items[:5]:
            recent_scans.append({
                "id": item.id,
                "product_name": item.product_name,
                "result": item.result,
                "profile_used": item.profile_used or [],
                "timestamp": item.timestamp.isoformat() if item.timestamp else None,
            })

        safety_score = round((result_counts["Safe"] / total_scans) * 100) if total_scans > 0 else 0

        return jsonify({
            "has_data": True,
            "total_scans": total_scans,
            "safety_score": safety_score,
            "result_breakdown": result_counts,
            "top_restricted_ingredients": [
                {"name": name, "count": count}
                for name, count in top_restricted
            ],
            "top_uncertain_ingredients": [
                {"name": name, "count": count}
                for name, count in top_uncertain
            ],
            "profile_usage": [
                {"profile": profile, "count": count}
                for profile, count in profile_usage_sorted
            ],
            "recent_scans": recent_scans,
        })

    except Exception as error:
        return jsonify({
            "error": "Could not generate personal insights",
            "details": str(error),
        }), 500

    finally:
        db.close()


@app.route("/awareness/tips", methods=["GET"])
def awareness_tips():
    """
    US8.4 — Awareness Tips
    Returns educational tips, prioritised by the user's dietary profile.
    Query params:
      - profile: one or more dietary profiles (can repeat)
      - category: filter by tip category
    If profiles are provided, matching tips are returned first,
    followed by general tips. If no profiles, all tips are returned.
    """
    db = SessionLocal()

    try:
        selected_profiles = request.args.getlist("profile")
        category_filter = request.args.get("category", "").strip()

        query = db.query(AwarenessTip)

        if category_filter:
            query = query.filter(AwarenessTip.category.ilike(f"%{category_filter}%"))

        all_tips = query.order_by(AwarenessTip.priority).all()

        profile_tips = []
        general_tips = []

        for tip in all_tips:
            tip_profiles = tip.relevant_profiles or []

            tip_data = {
                "id": tip.id,
                "tip_text": tip.tip_text,
                "category": tip.category,
                "relevant_profiles": tip_profiles,
                "priority": tip.priority,
                "source": tip.source,
            }

            if selected_profiles and tip_profiles:
                if any(p in tip_profiles for p in selected_profiles):
                    tip_data["relevance"] = "personal"
                    profile_tips.append(tip_data)
                else:
                    tip_data["relevance"] = "general"
                    general_tips.append(tip_data)
            else:
                tip_data["relevance"] = "personal" if not tip_profiles else "general"

                if not tip_profiles:
                    general_tips.append(tip_data)
                elif not selected_profiles:
                    general_tips.append(tip_data)
                else:
                    general_tips.append(tip_data)

        ordered_tips = profile_tips + general_tips
        categories = sorted(set(t["category"] for t in ordered_tips))

        return jsonify({
            "tips": ordered_tips,
            "total_count": len(ordered_tips),
            "personal_count": len(profile_tips),
            "general_count": len(general_tips),
            "categories": categories,
            "selected_profiles": selected_profiles,
        })

    except Exception as error:
        return jsonify({
            "error": "Could not fetch awareness tips",
            "details": str(error),
        }), 500

    finally:
        db.close()



@app.route("/nutrition/log", methods=["POST"])
def save_food_log():
    data = get_json_body()
    account_id = get_account_id_from_request(data)
    profile_id = get_profile_id_from_request(data)
    food_name = str(data.get("food_name") or "").strip()
    if not account_id:
        return jsonify({"error": "account_id is required"}), 400
    if not food_name:
        return jsonify({"error": "food_name is required"}), 400
    log_date = str(data.get("log_date") or date.today().isoformat())[:10]
    db = SessionLocal()
    try:
        item = FoodLog(account_id=account_id, profile_id=profile_id, food_name=food_name, serving_size=data.get("serving_size") or "1 serving", calories=to_float(data.get("calories")), protein=to_float(data.get("protein")), carbs=to_float(data.get("carbs")), fat=to_float(data.get("fat")), log_date=log_date, source=data.get("source") or "manual")
        db.add(item)
        db.commit()
        db.refresh(item)
        return jsonify(serialize_food_log(item)), 201
    finally:
        db.close()


@app.route("/nutrition/log", methods=["GET"])
def get_food_log():
    account_id = get_account_id_from_request()
    profile_id = get_profile_id_from_request()
    log_date = request.args.get("date") or date.today().isoformat()
    if not account_id:
        return jsonify({"error": "account_id is required"}), 400
    db = SessionLocal()
    try:
        query = db.query(FoodLog).filter(FoodLog.account_id == account_id, FoodLog.log_date == log_date)
        if profile_id:
            query = query.filter(FoodLog.profile_id == profile_id)
        items = query.order_by(FoodLog.created_at.desc()).all()
        return jsonify([serialize_food_log(item) for item in items])
    finally:
        db.close()


@app.route("/nutrition/log/<int:log_id>", methods=["DELETE"])
def delete_food_log(log_id):
    account_id = get_account_id_from_request()
    db = SessionLocal()
    try:
        query = db.query(FoodLog).filter(FoodLog.id == log_id)
        if account_id:
            query = query.filter(FoodLog.account_id == account_id)
        item = query.first()
        if not item:
            return jsonify({"error": "Food log item not found"}), 404
        db.delete(item)
        db.commit()
        return jsonify({"message": "Food log deleted", "deleted_id": log_id})
    finally:
        db.close()


@app.route("/nutrition/goals", methods=["GET", "PUT"])
def nutrition_goals():
    data = get_json_body() if request.method == "PUT" else {}
    account_id = get_account_id_from_request(data)
    profile_id = get_profile_id_from_request(data)
    if not account_id:
        return jsonify({"error": "account_id is required"}), 400
    db = SessionLocal()
    try:
        goal = db.query(NutritionGoal).filter(NutritionGoal.account_id == account_id, NutritionGoal.profile_id == profile_id).first()
        if request.method == "PUT":
            if not goal:
                goal = NutritionGoal(account_id=account_id, profile_id=profile_id)
                db.add(goal)
            goal.calories = to_float(data.get("calories"), goal.calories or 2000)
            goal.protein = to_float(data.get("protein"), goal.protein or 80)
            goal.carbs = to_float(data.get("carbs"), goal.carbs or 250)
            goal.fat = to_float(data.get("fat"), goal.fat or 70)
            goal.updated_at = datetime.now(timezone.utc)
            db.commit()
            db.refresh(goal)
        if not goal:
            goal = NutritionGoal(account_id=account_id, profile_id=profile_id, calories=2000, protein=80, carbs=250, fat=70)
            db.add(goal)
            db.commit()
            db.refresh(goal)
        return jsonify({"account_id": goal.account_id, "profile_id": goal.profile_id, "calories": goal.calories, "protein": goal.protein, "carbs": goal.carbs, "fat": goal.fat})
    finally:
        db.close()


@app.route("/nutrition/summary", methods=["GET"])
def nutrition_summary():
    account_id = get_account_id_from_request()
    profile_id = get_profile_id_from_request()
    log_date = request.args.get("date") or date.today().isoformat()
    if not account_id:
        return jsonify({"error": "account_id is required"}), 400
    db = SessionLocal()
    try:
        query = db.query(FoodLog).filter(FoodLog.account_id == account_id, FoodLog.log_date == log_date)
        if profile_id:
            query = query.filter(FoodLog.profile_id == profile_id)
        items = query.all()
        totals = {"calories": 0, "protein": 0, "carbs": 0, "fat": 0}
        for item in items:
            totals["calories"] += item.calories or 0
            totals["protein"] += item.protein or 0
            totals["carbs"] += item.carbs or 0
            totals["fat"] += item.fat or 0
        goal = db.query(NutritionGoal).filter(NutritionGoal.account_id == account_id, NutritionGoal.profile_id == profile_id).first()
        goals = {"calories": goal.calories if goal else 2000, "protein": goal.protein if goal else 80, "carbs": goal.carbs if goal else 250, "fat": goal.fat if goal else 70}
        return jsonify({"date": log_date, "totals": totals, "goals": goals, "items": [serialize_food_log(i) for i in items]})
    finally:
        db.close()


@app.route("/nutrition/trends", methods=["GET"])
def nutrition_trends():
    account_id = get_account_id_from_request()
    profile_id = get_profile_id_from_request()
    days = min(max(get_int(request.args.get("days"), 7), 1), 30)
    if not account_id:
        return jsonify({"error": "account_id is required"}), 400
    today = date.today()
    start = today - timedelta(days=days - 1)
    db = SessionLocal()
    try:
        query = db.query(FoodLog).filter(FoodLog.account_id == account_id, FoodLog.log_date >= start.isoformat(), FoodLog.log_date <= today.isoformat())
        if profile_id:
            query = query.filter(FoodLog.profile_id == profile_id)
        items = query.all()
        by_day = { (start + timedelta(days=i)).isoformat(): {"date": (start + timedelta(days=i)).isoformat(), "calories": 0, "protein": 0, "carbs": 0, "fat": 0} for i in range(days) }
        for item in items:
            row = by_day.setdefault(item.log_date, {"date": item.log_date, "calories": 0, "protein": 0, "carbs": 0, "fat": 0})
            row["calories"] += item.calories or 0
            row["protein"] += item.protein or 0
            row["carbs"] += item.carbs or 0
            row["fat"] += item.fat or 0
        return jsonify({"days": days, "trends": list(by_day.values())})
    finally:
        db.close()

@app.errorhandler(404)
def not_found(_error):
    return jsonify({"error": "Endpoint not found"}), 404


@app.errorhandler(405)
def method_not_allowed(_error):
    return jsonify({"error": "Method not allowed"}), 405


@app.errorhandler(413)
def payload_too_large(_error):
    return jsonify({
        "error": "Uploaded file is too large",
        "details": "Please upload a smaller image.",
    }), 413


@app.errorhandler(500)
def internal_server_error(error):
    return jsonify({
        "error": "Internal server error",
        "details": str(error),
    }), 500


if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)
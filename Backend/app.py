import os
import re
import time
from collections import OrderedDict
from datetime import datetime, timezone

import requests
from flask import Flask, jsonify, request
from flask_cors import CORS

from analyzer import analyze_ingredients
from db import init_db, db_status_counts, SessionLocal, Profile, History

app = Flask(__name__)

# -----------------------------
# Configuration
# -----------------------------

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
MAX_IMAGE_BYTES = 1_500_000  # 1.5MB safety limit for OCR uploads
OPENFOOD_API_BASE = os.getenv("OPENFOOD_API_URL", "https://world.openfoodfacts.org")
OCR_SPACE_API_KEY = os.getenv("OCR_SPACE_API_KEY") or os.getenv("OCR_API_KEY")

product_cache = OrderedDict()
last_openfood_request_time = 0.0

# Create / upgrade DB tables and seed data
init_db()


# -----------------------------
# Small helper functions
# -----------------------------

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


def normalise_barcode(value):
    return str(value or "").strip()


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

    text = re.sub(r"\s+", " ", text).strip()
    return text


def get_json_body():
    return request.get_json(silent=True) or {}


def build_frontend_compatible_analysis(analysis):
    """
    Your current frontend ResultScreen expects:
    {
      overall_result: "Safe/Restricted/Uncertain",
      summary: "...",
      ingredients: [
        { name, status, reason }
      ]
    }

    The new analyzer may return newer keys like:
    {
      status,
      ingredients_analysis,
      additives_analysis,
      allergens_analysis
    }

    This wrapper keeps the backend compatible with the current frontend while also
    preserving the newer response fields.
    """
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

    overall = (
        analysis.get("overall_result")
        or analysis.get("status")
        or "Uncertain"
    )

    # frontend uses "Safe", not "Allowed", for the final product status
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

        status = item.get("status") or "Uncertain"
        reason = item.get("reason") or "No explanation available."

        frontend_items.append({
            "name": name,
            "ingredient": item.get("ingredient", name),
            "matched_name": item.get("matched_name", name),
            "status": status,
            "reason": reason,
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


def build_summary(status):
    if status == "Restricted":
        return "This product is not suitable for your selected dietary restrictions."
    if status == "Uncertain":
        return "This product may need further checking for your selected dietary restrictions."
    if status == "Safe":
        return "No direct conflicts were found for your selected dietary profiles."
    return "No analysis summary available."


def run_analysis(ingredient_text, selected_profiles, additives_tags=None, allergens_tags=None):
    raw_result = analyze_ingredients(
        ingredient_text=ingredient_text,
        selected_profiles=selected_profiles,
        additives_tags=additives_tags or [],
        allergens_tags=allergens_tags or [],
    )

    return build_frontend_compatible_analysis(raw_result)


# -----------------------------
# Basic routes
# -----------------------------

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


# -----------------------------
# Core Iteration 1 + Iteration 2 analysis route
# -----------------------------

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
        additives_tags=[],
        allergens_tags=[],
    )

    return jsonify(result)


# -----------------------------
# Barcode / Open Food Facts
# -----------------------------

@app.route("/product/<barcode>", methods=["GET"])
def get_product(barcode):
    global last_openfood_request_time

    selected_profiles = request.args.getlist("profile")

    normalized_barcode = normalise_barcode(barcode)

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
        "brands,allergens_tags,additives_tags"
    )

    try:
        response = requests.get(
            off_url,
            timeout=20,
            headers={
                "User-Agent": "NutriLabel/2.0 (student project)"
            },
        )
        last_openfood_request_time = time.time()

        if response.status_code == 429:
            return jsonify({
                "error": "Open Food Facts rate limit reached",
                "details": "Too many requests. Please wait and try again.",
            }), 429

        response.raise_for_status()
        off_data = response.json()

    except requests.HTTPError as error:
        return jsonify({
            "error": "Could not reach Open Food Facts",
            "details": str(error),
        }), 502

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
        "analysis": analysis,
    }

    cache_set(cache_key, result)
    return jsonify(result)


# -----------------------------
# OCR route
# -----------------------------

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

    return jsonify({
        "ingredient_text": extracted_text,
        "raw_text": " ".join(raw_text_parts).strip(),
    })


# -----------------------------
# Iteration 2: onboarding / profile generation
# -----------------------------

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


# -----------------------------
# Iteration 2: profile storage
# -----------------------------

@app.route("/profile/save", methods=["POST"])
def save_profile():
    data = get_json_body()

    profile_name = data.get("profile_name") or "My Dietary Profile"
    restrictions = data.get("restrictions", [])
    explanation = data.get("explanation", {})

    if not isinstance(profile_name, str) or not profile_name.strip():
        return jsonify({"error": "profile_name must be a non-empty string"}), 400

    if not isinstance(restrictions, list) or not restrictions:
        return jsonify({"error": "restrictions must be a non-empty list"}), 400

    if not isinstance(explanation, dict):
        return jsonify({"error": "explanation must be an object"}), 400

    db = SessionLocal()

    try:
        profile = Profile(
            profile_name=profile_name.strip(),
            restrictions=restrictions,
            explanation=explanation,
        )

        db.add(profile)
        db.commit()
        db.refresh(profile)

        return jsonify({
            "id": profile.id,
            "profile_name": profile.profile_name,
            "restrictions": profile.restrictions,
            "explanation": profile.explanation,
            "created_at": profile.created_at.isoformat() if profile.created_at else None,
            "updated_at": profile.updated_at.isoformat() if profile.updated_at else None,
        }), 201

    finally:
        db.close()


@app.route("/profiles", methods=["GET"])
def get_profiles():
    db = SessionLocal()

    try:
        profiles = db.query(Profile).order_by(Profile.created_at.desc()).all()

        return jsonify([
            {
                "id": profile.id,
                "profile_name": profile.profile_name,
                "restrictions": profile.restrictions,
                "explanation": profile.explanation,
                "created_at": profile.created_at.isoformat() if profile.created_at else None,
                "updated_at": profile.updated_at.isoformat() if profile.updated_at else None,
            }
            for profile in profiles
        ])

    finally:
        db.close()


@app.route("/profile/update/<int:profile_id>", methods=["PUT"])
def update_profile(profile_id):
    data = get_json_body()

    db = SessionLocal()

    try:
        profile = db.query(Profile).filter(Profile.id == profile_id).first()

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

        return jsonify({
            "id": profile.id,
            "profile_name": profile.profile_name,
            "restrictions": profile.restrictions,
            "explanation": profile.explanation,
            "created_at": profile.created_at.isoformat() if profile.created_at else None,
            "updated_at": profile.updated_at.isoformat() if profile.updated_at else None,
        })

    finally:
        db.close()


# -----------------------------
# Iteration 2: history
# -----------------------------

@app.route("/history/save", methods=["POST"])
def save_history():
    data = get_json_body()

    product_name = data.get("product_name") or "Manual Analysis"
    ingredients = data.get("ingredients", "")
    result = data.get("result", "")
    analysis_json = data.get("analysis_json")
    profile_used = data.get("profile_used", [])

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
        history = History(
            product_name=product_name.strip(),
            ingredients=ingredients.strip(),
            result=result.strip(),
            analysis_json=analysis_json,
            profile_used=profile_used,
        )

        db.add(history)
        db.commit()
        db.refresh(history)

        return jsonify({
            "id": history.id,
            "product_name": history.product_name,
            "result": history.result,
            "profile_used": history.profile_used,
            "timestamp": history.timestamp.isoformat() if history.timestamp else None,
        }), 201

    finally:
        db.close()


@app.route("/history", methods=["GET"])
def get_history():
    db = SessionLocal()

    try:
        history_items = db.query(History).order_by(History.timestamp.desc()).all()

        return jsonify([
            {
                "id": item.id,
                "product_name": item.product_name,
                "result": item.result,
                "profile_used": item.profile_used,
                "timestamp": item.timestamp.isoformat() if item.timestamp else None,
            }
            for item in history_items
        ])

    finally:
        db.close()


@app.route("/history/<int:history_id>", methods=["GET"])
def get_history_detail(history_id):
    db = SessionLocal()

    try:
        item = db.query(History).filter(History.id == history_id).first()

        if not item:
            return jsonify({"error": "History item not found"}), 404

        return jsonify({
            "id": item.id,
            "product_name": item.product_name,
            "ingredients": item.ingredients,
            "result": item.result,
            "analysis_json": item.analysis_json,
            "profile_used": item.profile_used,
            "timestamp": item.timestamp.isoformat() if item.timestamp else None,
        })

    finally:
        db.close()


# -----------------------------
# Iteration 2: recommendations
# -----------------------------

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
        add_recommendation(
            "avoid",
            "milk, egg, gelatin, honey",
            "These are animal-derived and may not suit vegan diets.",
        )
        add_recommendation(
            "alternative",
            "oat milk or soy milk",
            "Plant-based alternatives may suit vegan users.",
        )

    if "vegetarian" in profiles:
        add_recommendation(
            "avoid",
            "gelatin and animal-derived additives",
            "These may not suit vegetarian diets.",
        )

    if "eggetarian" in profiles:
        add_recommendation(
            "avoid",
            "gelatin and non-egg animal-derived ingredients",
            "Eggetarian users may still avoid many animal-derived food additives.",
        )

    if "Jain" in profiles:
        add_recommendation(
            "avoid",
            "onion, garlic, potato and root vegetables",
            "These conflict with Jain dietary restrictions.",
        )

    if "halal" in profiles:
        add_recommendation(
            "avoid",
            "gelatin, alcohol-based ingredients and uncertified animal derivatives",
            "These may require halal certification verification.",
        )

    if "nut-free" in profiles:
        add_recommendation(
            "avoid",
            "peanut, almond, cashew, hazelnut and walnut",
            "These conflict with nut-free requirements.",
        )

        # Remove almond milk if vegan + nut-free conflict exists
        recommendations_list = [
            rec for rec in recommendations_list
            if "almond milk" not in rec.get("item", "").lower()
        ]

    if "dairy-free" in profiles:
        add_recommendation(
            "avoid",
            "milk, whey, casein and lactose",
            "These are dairy-derived ingredients.",
        )

    if "gluten-free" in profiles:
        add_recommendation(
            "avoid",
            "wheat, barley and rye",
            "These may contain gluten.",
        )

    return jsonify({
        "profiles": profiles,
        "recommendations": recommendations_list,
    })


# -----------------------------
# Error handlers
# -----------------------------

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


# -----------------------------
# Local runner
# -----------------------------

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)

import os
import time
import tempfile

from flask import Flask, jsonify, request
from flask_cors import CORS
import requests
from PIL import Image
import easyocr

from analyzer import analyze_ingredients
from db import init_db, get_db_status

app = Flask(__name__)

allowed_origins = os.getenv("ALLOWED_ORIGINS", "*")
if allowed_origins == "*":
    CORS(app)
else:
    origins = [origin.strip() for origin in allowed_origins.split(",") if origin.strip()]
    CORS(app, resources={r"/*": {"origins": origins}})

product_cache = {}
last_request_time = 0
ocr_reader = easyocr.Reader(["en"], gpu=False)

init_db()


@app.route("/", methods=["GET"])
def home():
    return jsonify({"message": "NutriLabel backend is running"})


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})


@app.route("/db-status", methods=["GET"])
def db_status():
    return jsonify(get_db_status())


@app.route("/analyze", methods=["POST"])
def analyze():
    data = request.get_json(silent=True) or {}
    ingredient_text = data.get("ingredient_text", "")
    selected_profiles = data.get("selected_profiles", [])

    if not isinstance(ingredient_text, str):
        return jsonify({"error": "ingredient_text must be a string"}), 400

    if not isinstance(selected_profiles, list):
        return jsonify({"error": "selected_profiles must be a list"}), 400

    if not ingredient_text.strip():
        return jsonify({"error": "ingredient_text cannot be empty"}), 400

    result = analyze_ingredients(
        ingredient_text=ingredient_text,
        selected_profiles=selected_profiles,
        additives_tags=[],
        allergens_tags=[],
    )
    return jsonify(result)


@app.route("/product/<barcode>", methods=["GET"])
def get_product(barcode):
    global last_request_time

    selected_profiles = request.args.getlist("profile")

    if not isinstance(barcode, str) or not barcode.strip():
        return jsonify({"error": "barcode cannot be empty"}), 400

    normalized_barcode = barcode.strip()

    if not normalized_barcode.isdigit():
        return jsonify({"error": "barcode must contain digits only"}), 400

    cache_key = f"{normalized_barcode}|{','.join(sorted(selected_profiles))}"
    if cache_key in product_cache:
        return jsonify(product_cache[cache_key])

    now = time.time()
    if now - last_request_time < 2:
        time.sleep(2 - (now - last_request_time))

    off_url = (
        f"https://world.openfoodfacts.org/api/v2/product/{normalized_barcode}.json"
        f"?fields=product_name,product_name_en,ingredients_text,ingredients_text_en,brands,allergens_tags,additives_tags"
    )

    try:
        response = requests.get(
            off_url,
            timeout=20,
            headers={"User-Agent": "NutriLabel/1.0 (student project)"},
        )
        last_request_time = time.time()
        response.raise_for_status()
        off_data = response.json()
    except requests.HTTPError as e:
        if response.status_code == 429:
            return jsonify({
                "error": "Open Food Facts rate limit reached",
                "details": "Too many requests. Please wait a minute and try again."
            }), 429
        return jsonify({"error": "Could not reach Open Food Facts", "details": str(e)}), 502
    except requests.RequestException as e:
        return jsonify({"error": "Could not reach Open Food Facts", "details": str(e)}), 502
    except ValueError as e:
        return jsonify({"error": "Invalid response from Open Food Facts", "details": str(e)}), 502

    if off_data.get("status") != 1:
        return jsonify({"error": "Product not found"}), 404

    product = off_data.get("product", {})
    ingredient_text = product.get("ingredients_text_en") or product.get("ingredients_text") or ""
    product_name = product.get("product_name_en") or product.get("product_name") or "Unknown Product"
    brands = product.get("brands", "")
    allergens = product.get("allergens_tags", []) or []
    additives = product.get("additives_tags", []) or []

    analysis = analyze_ingredients(
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

    product_cache[cache_key] = result
    return jsonify(result)


@app.route("/ocr", methods=["POST"])
def extract_text_from_image():
    if "image" not in request.files:
        return jsonify({"error": "No image file provided"}), 400

    image_file = request.files["image"]

    if not image_file.filename:
        return jsonify({"error": "Empty filename"}), 400

    temp_path = None

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as temp_file:
            temp_path = temp_file.name
            image_file.save(temp_path)

        image = Image.open(temp_path).convert("RGB")
        image.save(temp_path)

        result = ocr_reader.readtext(temp_path, detail=0)

        cleaned_lines = []

        skip_keywords = [
            "linkedin", "facebook", "instagram", "twitter",
            "www.", ".com", ".au", "http",
            "follow", "share", "comment", "like", "subscribe"
        ]

        keep_keywords = [
            "ingredient", "ingredients", "contains", "may contain",
            "flour", "sugar", "salt", "oil", "water",
            "milk", "soy", "wheat", "rice", "corn",
            "vitamin", "mineral", "emulsifier",
            "flavour", "flavor", "colour", "color",
            "preservative"
        ]

        for line in result:
            line = line.strip()
            lower_line = line.lower()

            if not line:
                continue

            if any(word in lower_line for word in skip_keywords):
                continue

            if any(word in lower_line for word in keep_keywords) or "," in line or ";" in line:
                cleaned_lines.append(line)

        if cleaned_lines:
            extracted_text = " ".join(cleaned_lines)
        else:
            extracted_text = " ".join(result).strip()

        lower_text = extracted_text.lower()
        if "ingredients" in lower_text:
            index = lower_text.find("ingredients")
            extracted_text = extracted_text[index:]

        if not extracted_text:
            return jsonify({"error": "No text detected"}), 400

        return jsonify({
            "ingredient_text": extracted_text
        })

    except Exception as e:
        return jsonify({
            "error": "OCR processing failed",
            "details": str(e)
        }), 500

    finally:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)


if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)

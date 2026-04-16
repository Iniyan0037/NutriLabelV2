import os
import time

from flask import Flask, jsonify, request
from flask_cors import CORS
import requests

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
def ocr():
    api_key = os.getenv("OCR_SPACE_API_KEY")
    if not api_key:
        return jsonify({"error": "OCR service is not configured"}), 500

    if "image" not in request.files:
        return jsonify({"error": "No image file provided"}), 400

    image_file = request.files["image"]

    if not image_file.filename:
        return jsonify({"error": "Empty filename"}), 400

    try:
        image_bytes = image_file.read()

        files = {
            "file": (
                image_file.filename,
                image_bytes,
                image_file.mimetype or "image/jpeg"
            )
        }

        data = {
            "apikey": api_key,
            "language": "eng",
            "isOverlayRequired": "false",
            "OCREngine": "1",
            "scale": "false",
            "detectOrientation": "false",
            "isTable": "false",
        }

        response = requests.post(
            "https://api.ocr.space/parse/image",
            files=files,
            data=data,
            timeout=300,
        )

        response.raise_for_status()
        payload = response.json()

        if payload.get("IsErroredOnProcessing"):
            messages = payload.get("ErrorMessage") or payload.get("ErrorDetails") or ["OCR processing failed"]
            if isinstance(messages, list):
                message = " ".join(str(m) for m in messages)
            else:
                message = str(messages)

            return jsonify({
                "error": "OCR failed",
                "details": message
            }), 400

        parsed_results = payload.get("ParsedResults") or []
        raw_text = " ".join(
            (item.get("ParsedText") or "").strip()
            for item in parsed_results
            if item.get("ParsedText")
        ).strip()

        if not raw_text:
            return jsonify({
                "ingredient_text": "",
                "warning": "No text could be extracted from the image."
            }), 200

        text = raw_text.replace("\r", "\n")
        lower_text = text.lower()

        start_markers = [
            "ingredients:",
            "ingredients",
            "ingredient list:",
            "ingredient list",
            "contains:",
        ]

        end_markers = [
            "nutrition",
            "nutritional",
            "storage",
            "warning",
            "directions",
            "distributed by",
            "manufactured by",
            "best before",
            "product of",
        ]

        start_index = -1
        for marker in start_markers:
            idx = lower_text.find(marker)
            if idx != -1:
                start_index = idx
                break

        extracted_text = text[start_index:] if start_index != -1 else text

        lower_extracted = extracted_text.lower()
        cut_index = len(extracted_text)

        for marker in end_markers:
            idx = lower_extracted.find(marker)
            if idx != -1 and idx < cut_index:
                cut_index = idx

        extracted_text = extracted_text[:cut_index].strip()

        lines = [line.strip() for line in extracted_text.splitlines() if line.strip()]
        cleaned_lines = []

        skip_words = [
            "facebook", "instagram", "twitter", "linkedin",
            "www.", ".com", ".au", "follow us", "scan me",
        ]

        for line in lines:
            lower_line = line.lower()
            if any(word in lower_line for word in skip_words):
                continue
            cleaned_lines.append(line)

        extracted_text = " ".join(cleaned_lines).strip()

        if extracted_text.lower().startswith("ingredients"):
            parts = extracted_text.split(":", 1)
            if len(parts) == 2:
                extracted_text = parts[1].strip()

        return jsonify({
            "ingredient_text": extracted_text
        })

    except requests.Timeout:
        return jsonify({
            "error": "OCR request timed out",
            "details": "The OCR service took too long to respond. Please try a more tightly cropped image."
        }), 504
    except requests.RequestException as e:
        return jsonify({
            "error": "OCR request failed",
            "details": str(e)
        }), 502
    except Exception as e:
        return jsonify({
            "error": "OCR failed",
            "details": str(e)
        }), 500


if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)

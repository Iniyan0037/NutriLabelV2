# NutriLabel

NutriLabel is a full-stack food label analysis and nutrition awareness application developed for **FIT5120 Industry Experience — Iteration 3**.

The application helps users check packaged food ingredients, allergens, additives, nutrition values, and product suitability against selected dietary profiles. It supports both a deployed web application and an Android APK.

---

## Live Application

### Website

- https://nutrilabel.live
- https://www.nutrilabel.live

### Backend API

- https://api.nutrilabel.live

The web application and Android APK both connect to the same deployed backend API.

---

## Android APK

The Android APK is provided through the GitHub Releases page.

Recommended release name:

```text
NutriLabel v3.0.0 - Iteration 3
```

Recommended APK filename:

```text
NutriLabel-v3.0.0.apk
```

To install:

1. Download the APK from the GitHub Release.
2. Open the APK on an Android device.
3. Allow installation from unknown sources if Android asks.
4. Install and open **NutriLabel**.
5. Sign in using the demo credentials provided separately for assessment/demo purposes.

---

## Project Overview

NutriLabel is designed for students and shared-household users who need a practical way to understand food labels before consumption.

A single shared login can contain up to six user profiles. Each profile has its own dietary restrictions, history, food logs, nutrition goals, and learning context.

NutriLabel is an assistive food awareness tool. It is not a medical, religious, legal, or manufacturer-certified decision system. If ingredient suitability is unclear, the app should treat the result as uncertain rather than falsely marking the product as safe.

---

## Key Features

### Shared Login and Profiles

- Shared login system
- Maximum six profiles per login
- Mandatory profile name validation
- Profile-specific dietary restrictions
- Profile-specific history and nutrition data
- Logout confirmation and local app state clearing

### Ingredient Analysis

- Manual ingredient entry
- Dietary rule matching
- Allergen matching
- Ingredient alias handling
- Additive and E-number support
- Allowed, restricted, and uncertain result categories
- Explanation for detected ingredients

### Barcode Product Lookup

- Barcode lookup using Open Food Facts
- Product name and ingredient extraction where available
- Nutrition value extraction where available
- Product image support where available
- Dietary suitability analysis using the selected profile

### OCR Label Scanning

- Image upload/camera-supported OCR flow
- Ingredient text extraction from food label images
- OCR nutrition panel extraction for calories, protein, carbohydrates, and fat
- User review before saving extracted nutrition values
- Backend validation for missing or unsupported file uploads

### Product Images

- Product image retrieval from Open Food Facts when available
- User-selected product images when no product image is available
- Product images shown in result and history flows where supported

### Profile-Specific History

- Saved analysis history per selected profile
- Separation of history between profiles
- Stored product analysis result, suitability decision, and product details

### Nutrition Tracking

- Food logging after consumption
- Manual and scanned product logging
- Calories, protein, carbohydrates, and fat tracking
- Nutrition goals
- Macro summaries
- Seven-day nutrition trend

### Learn and Awareness Section

- Food awareness dashboard
- Australian recall/allergen awareness insights
- Additive awareness
- Profile-based learning/tips
- Backend-driven awareness data

### Dietary Awareness Game

- Profile-based learning game
- Ingredient recognition activities
- Score tracking
- Daily learning encouragement

### Accessibility and Interface Features

- High contrast theme support
- Text-to-speech support
- Haptic feedback support
- Non-colour indicators
- Bottom navigation
- Selected profile display
- Web and Android support

---

## Technology Stack

### Frontend

- React Native
- Expo
- React Native Web
- Expo Image Picker
- Expo Speech
- Expo Haptics
- AsyncStorage
- Chart/visualisation components

### Backend

- Python
- Flask
- SQLAlchemy
- Flask-CORS
- Gunicorn

### Database

- PostgreSQL hosted on Render

### Deployment

- Render Static Site for the web frontend
- Render Web Service for the backend API
- Render PostgreSQL for the database
- Expo EAS Build for Android APK generation

### External Services and Data Sources

- Open Food Facts API for barcode/product data
- OCR.space API for OCR extraction
- FSANZ Australian food recall statistics for awareness visualisations
- Internal dietary rules, aliases, allergens, additives, and awareness datasets

---

## Repository Structure

The repository is organised into frontend, backend, documentation, and release-related assets.

```text
NutriLabel/
├── Frontend/
│   ├── assets/
│   ├── components/
│   ├── screens/
│   ├── App.js
│   ├── app.json
│   ├── package.json
│   └── ...
│
├── Backend/
│   ├── app.py
│   ├── requirements.txt
│   ├── data/
│   └── ...
│
├── documentation/
│   ├── Nutrilabel Security Plan.pdf
│   └── Penetration Testing Iteration 3.pdf
│
├── README.md
└── ...
```

The Android APK is distributed through GitHub Releases rather than being committed directly to the repository.

---

## Running the Project Locally

Most functionality depends on the backend and database being available. The easiest way to test the project is to use the deployed backend API with the local frontend.

### Prerequisites

Install:

- Node.js
- npm
- Expo CLI / Expo tools
- Python 3.11+
- pip
- Git
- Android device or emulator for APK/mobile testing

---

## Frontend Local Setup

From the repository root:

```bash
cd Frontend
npm install
npx expo start
```

For web testing:

```bash
npx expo start --web
```

For mobile testing:

1. Install Expo Go on a mobile device.
2. Run `npx expo start`.
3. Scan the QR code.
4. Make sure the frontend is configured to use the correct backend API.

The submitted Iteration 3 build is configured to use:

```text
https://api.nutrilabel.live
```

---

## Backend Local Setup

From the repository root:

```bash
cd Backend
python -m venv venv
```

Activate the virtual environment.

Windows:

```bash
venv\Scripts\activate
```

macOS/Linux:

```bash
source venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Run the backend:

```bash
python app.py
```

or:

```bash
flask run
```

The local backend usually runs on:

```text
http://127.0.0.1:5000
```

### Backend Configuration

Backend configuration is required for database access, OCR access, authentication signing, debug endpoint protection, and CORS.

For security reasons, real environment variable values are **not** included in this README and must not be committed to GitHub.

Use the deployment platform or a local `.env` file to configure required backend values. Secret values should be stored only in local/deployment environment configuration.

Do not commit:

- database connection strings
- API keys
- auth signing secrets
- admin/debug tokens
- `.env` files
- private deployment credentials

---

## Building the Android APK

The APK is built using Expo EAS Build.

Install EAS CLI:

```bash
npm install -g eas-cli
```

Login:

```bash
eas login
```

Configure/build if required:

```bash
eas build:configure
eas build --platform android --profile preview
```

After the build completes, download the APK from the Expo build page and attach it to the GitHub Release.

---

## Deployment Summary

The submitted version uses deployed services:

| Component | Deployment |
|---|---|
| Frontend website | Render Static Site |
| Backend API | Render Web Service |
| Database | Render PostgreSQL |
| Android APK | Expo EAS Build / GitHub Release |
| Domain | nutrilabel.live |
| Backend subdomain | api.nutrilabel.live |

Deployment configuration and secret values are intentionally not stored in the repository.

---

## Security Summary

Iteration 3 includes several security improvements:

- HTTPS custom domains
- Backend security headers
- Restricted production CORS configuration
- Protected database status/debug endpoint
- Account-token protected profile, history, food log, and nutrition endpoints
- Profile/account ownership checks
- Mandatory profile name validation
- Six-profile limit per shared login
- OCR file validation
- Non-image OCR upload rejection
- Invalid barcode rejection
- SQLAlchemy ORM usage
- Logout confirmation
- Local app state clearing on logout
- Secret scanning and dependency scanning documented in the project reports

Known hardening items:

- Frontend static-site clickjacking headers still need additional Render configuration.
- Frontend dependency vulnerabilities reported by `npm audit` require controlled remediation.
- API rate limiting is recommended before any real public production release.
- Stronger individual authentication is recommended if the app becomes a real public product.

See the security documentation for details:

```text
documentation/Nutrilabel Security Plan.pdf
documentation/Penetration Testing Iteration 3.pdf
```

---

## Documentation

The repository includes:

- Security Plan for Iteration 3
- Penetration Testing and Vulnerability Assessment Report for Iteration 3
- README setup and feature documentation
- APK release notes through GitHub Releases

---

## Suggested Demo Flow

1. Open the website or install the APK.
2. Sign in with the provided demo credentials.
3. Create or select a profile.
4. Run manual ingredient analysis.
5. Scan or enter a barcode.
6. Review product suitability and product image.
7. Save the result to history.
8. Confirm history is profile-specific.
9. Use OCR ingredient extraction.
10. Use OCR nutrition extraction.
11. Log food after consumption.
12. Review the nutrition trend.
13. Open the awareness/learn section.
14. Try the dietary learning game.
15. Toggle high contrast mode.
16. Log out and confirm the app returns to the login screen.

---

## Important Limitations

- OCR output may be inaccurate and should be reviewed by the user.
- Open Food Facts product data may be incomplete or inconsistent.
- Nutrition values should not be treated as medical advice.
- Dietary suitability decisions are guidance only.
- Uncertain ingredients should be manually checked by users.
- The app is an academic project, not a certified commercial product.

---

## Team

| Student | Student ID |
|---|---|
| Iniyan Shanmugam | 35301643 |
| Zhiyuan Lin | 35234938 |
| Tianyu Xia | 33675341 |
| Mahendra Kumar Jammalmadaka | 34238298 |

---

## Version

```text
App Version: v3.0.0
Iteration: Iteration 3
Unit: FIT5120 Industry Experience
Semester: Semester 1, 2026
```

---

## License

This project was developed for academic coursework. Reuse, deployment, or public release should only occur with approval from the project team and subject requirements.

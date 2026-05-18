# NutriLabel

NutriLabel is a full-stack dietary awareness and nutrition support application developed for FIT5120 Industry Experience. The application helps users understand packaged food labels before consumption by checking ingredients, allergens, additives, nutrition values, and product suitability against selected dietary profiles.

The project includes a React Native / Expo frontend, a Flask backend API, and a PostgreSQL database. It supports both a deployed web version and an Android APK build.

---

## Live Deployment

### Frontend

```text
https://nutrilabel.live
https://www.nutrilabel.live
```

### Backend API

```text
https://api.nutrilabel.live
```

### Backend Health Check

```text
https://api.nutrilabel.live/health
```

---

## Android APK

The final Android APK is included in the repository or GitHub release package.

Suggested APK path:

```text
release/NutriLabel-v3.0.0.apk
```

To install the APK on Android:

1. Download the APK file to the phone.
2. Open the APK file.
3. Allow installation from unknown sources if Android asks for permission.
4. Install the app.
5. Open **NutriLabel**.
6. Login using the demo credentials provided in the project submission or demo notes.

The APK connects to the deployed backend API:

```text
https://api.nutrilabel.live
```

The backend must be deployed and running for the APK features to work properly.

---

## Project Purpose

NutriLabel is designed for students and shared-household users who need a simple way to check whether packaged foods match their dietary restrictions. A single shared login can contain up to six user profiles. Each profile can have its own dietary restrictions, product history, food logs, nutrition goals, and learning progress.

The application is not a medical, religious, or legal certification tool. It is a decision-support and awareness tool. If the app cannot confidently determine ingredient suitability, it marks the result as uncertain instead of falsely claiming the product is safe.

---

## Main Features

### 1. Shared Login

NutriLabel includes a shared login flow where one login can manage up to six profiles. This supports shared accommodation or student-household use while still separating each profile's history and nutrition logs.

Features:

- Shared login screen
- Account token-based session handling
- Logout confirmation popup
- Logout clears local app state
- Maximum six profiles per login

---

### 2. Profile Management

Users can create and manage dietary profiles.

Features:

- Create named profiles
- Profile name is mandatory
- Select multiple dietary restrictions
- Maximum six profiles under one login
- View selected profile at the top of the app
- Profile-specific history and food logs
- Restrictions used for product and ingredient analysis

Supported dietary profile examples include:

- Vegan
- Vegetarian
- Halal
- Jain
- Nut-free
- Dairy-free
- Gluten-free
- Other allergy or dietary restriction rules stored in the backend rules database

---

### 3. Ingredient Analysis

Users can manually enter ingredient text and check it against the selected profile.

Features:

- Manual ingredient text input
- Database-driven rule matching
- Alias matching for ingredient variations
- E-number/additive support
- Allergen matching
- Allowed, restricted, and uncertain result categories
- Explanation for ingredient decisions
- Text-to-speech support for reading results aloud
- Saves analysis history to the selected profile

---

### 4. Barcode Product Scanning

Users can scan or enter a barcode to fetch packaged food information.

Features:

- Barcode lookup using Open Food Facts
- Product name extraction
- Ingredient extraction when available
- Nutrition values when available
- Product image URL support when available
- Dietary suitability check against selected profile
- Product analysis saved to profile-specific history

Example test barcode:

```text
3017620422003
```

---

### 5. OCR Ingredient Extraction

Users can upload or capture a food label image and extract ingredients using OCR.

Features:

- Camera or image upload support
- OCR image processing through backend
- Extracted text review
- Ingredient analysis using selected profile
- File validation for supported image types
- Rejects missing files and unsupported non-image uploads

Supported OCR image formats:

```text
JPG
JPEG
PNG
WEBP
```

---

### 6. OCR Nutrition/Macro Extraction

Users can capture or upload a nutrition panel image and extract macro values.

Features:

- OCR extraction for nutrition labels
- Calories, protein, carbohydrates, and fat extraction
- User review/editing before saving
- Can be used when manually analysed products do not already have nutrition data
- Supports logging nutrition values after consumption

---

### 7. Product Images

NutriLabel supports product images in product result/history flows.

Features:

- Pull product image from Open Food Facts when available
- Show image in analysis result and history
- Allow user-selected product image when no product image is available
- Supports camera or gallery image selection

---

### 8. Profile-Specific History

Each profile has its own analysis history.

Features:

- History tied to selected profile
- Product analysis saved after manual, barcode, or OCR analysis
- History does not mix across profiles
- Product image support in history
- Saved decision result such as allowed, restricted, or uncertain

---

### 9. Nutrition Tracking

NutriLabel includes nutrition and macro tracking.

Features:

- Food log page
- Add scanned product to food log
- Add manual food entry
- Auto-fill nutrition values when product data exists
- OCR macro extraction for nutrition panels
- Calories, protein, carbohydrates, and fat tracking
- Macro summary
- 7-day calorie trend
- Nutrition goal setting
- Profile-specific food logs and nutrition goals

---

### 10. Learn and Awareness Section

The Learn section helps users understand food label risks and dietary awareness.

Features:

- Awareness dashboard
- Australian food recall data visualisation
- Allergen recall charts
- Recall share by year
- Additives learning area
- Tips page
- Personal insights
- Backend-driven awareness data

Dataset examples used in this section include:

- FSANZ Australian food recall statistics
- Allergen recall information
- Internal additive and allergen rules
- E-number/additive reference data

---

### 11. Dietary Awareness Game

NutriLabel includes a learning game based on the selected profile.

Features:

- Profile-specific memory game
- Risky ingredient cards based on selected profile
- Daily learning encouragement
- Score tracking
- Streak-style learning idea
- Helps users recognise risky ingredients before shopping or eating

---

### 12. Accessibility and UI Features

The app includes accessibility and interface improvements.

Features:

- High contrast theme
- Theme toggle
- Text-to-speech result reading
- Haptic feedback support
- Non-colour indicators such as icons and labels
- Bottom navigation bar
- Profile name display
- Responsive layout for web and mobile
- Professional dark/high-contrast UI for APK usage

---

## Tech Stack

### Frontend

```text
React Native
Expo
React Native Web
Expo Router / Navigation
AsyncStorage
Expo Image Picker
Expo Speech
Expo Haptics
Charting/visualisation components
```

### Backend

```text
Python 3.11.11
Flask
SQLAlchemy
Flask-CORS
Gunicorn
PostgreSQL
```

### Database

```text
Render PostgreSQL
```

### Hosting and Deployment

```text
Render Static Site for frontend
Render Web Service for backend
Render PostgreSQL for database
Name/domain setup for nutrilabel.live
Expo EAS Build for Android APK
```

### External APIs

```text
Open Food Facts API
OCR.space API
```

---

## Repository Structure

The repository is expected to use this structure:

```text
NutriLabel/
|
|-- Frontend/
|   |-- assets/
|   |-- components/
|   |-- screens/
|   |-- App.js
|   |-- app.json
|   |-- package.json
|   |-- eas.json
|   |-- ...
|
|-- Backend/
|   |-- app.py
|   |-- requirements.txt
|   |-- seed files / data files
|   |-- ...
|
|-- release/
|   |-- NutriLabel-v3.0.0.apk
|
|-- README.md
|-- documentation/
    |-- Nutrilabel Security Plan.pdf
    |-- Penetration Testing Iteration 3.pdf
```

The exact folder names may differ slightly depending on the final GitHub upload, but the frontend and backend should remain separated.

---

## Environment Variables

### Backend Environment Variables

Set these in Render for the backend service:

```env
DATABASE_URL=<Render internal PostgreSQL database URL>
OCR_SPACE_API_KEY=<OCR.space API key>
OPENFOOD_API_URL=https://world.openfoodfacts.org
APP_AUTH_SECRET=<long random backend-only secret>
ADMIN_DEBUG_TOKEN=<long random backend-only admin token>
ALLOWED_ORIGINS=https://nutrilabel.live,https://www.nutrilabel.live
FRONTEND_ORIGINS=https://nutrilabel.live,https://www.nutrilabel.live
```

Important:

- Do not commit real secret values to GitHub.
- Do not place backend secrets in frontend code.
- Do not place backend secrets in `EXPO_PUBLIC_` variables.
- Use placeholders in documentation.

### Frontend Environment Variables

Create a `.env` file inside the frontend folder:

```env
EXPO_PUBLIC_API_BASE_URL=https://api.nutrilabel.live
```

For local backend testing, this can temporarily point to a local Flask URL, but for APK and deployed frontend builds it should point to:

```text
https://api.nutrilabel.live
```

---

## Running the Project Locally

The app can be tested locally using Expo, but most features require the backend and database to be running.

---

## Backend Local Setup

### 1. Open backend folder

```bash
cd Backend
```

### 2. Create virtual environment

Windows:

```bash
python -m venv venv
venv\Scripts\activate
```

macOS/Linux:

```bash
python3 -m venv venv
source venv/bin/activate
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Create backend `.env`

Create a `.env` file inside `Backend/`:

```env
DATABASE_URL=<your local or Render PostgreSQL database URL>
OCR_SPACE_API_KEY=<your OCR.space API key>
OPENFOOD_API_URL=https://world.openfoodfacts.org
APP_AUTH_SECRET=<long random local secret>
ADMIN_DEBUG_TOKEN=<long random local admin token>
ALLOWED_ORIGINS=http://localhost:8081,http://localhost:19006,http://localhost:3000
FRONTEND_ORIGINS=http://localhost:8081,http://localhost:19006,http://localhost:3000
```

### 5. Run Flask backend

```bash
python app.py
```

or, if using Flask command:

```bash
flask run
```

The backend should start locally, usually on:

```text
http://127.0.0.1:5000
```

Test:

```text
http://127.0.0.1:5000/health
```

---

## Frontend Local Setup

### 1. Open frontend folder

```bash
cd Frontend
```

### 2. Install dependencies

```bash
npm install
```

If Expo reports missing dependencies, run:

```bash
npx expo install
```

### 3. Create frontend `.env`

For deployed backend testing:

```env
EXPO_PUBLIC_API_BASE_URL=https://api.nutrilabel.live
```

For local backend testing:

```env
EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:5000
```

### 4. Run Expo

```bash
npx expo start
```

For web:

```bash
npx expo start --web
```

Expo usually opens at:

```text
http://localhost:8081
```

For mobile testing:

1. Install Expo Go on Android/iOS.
2. Run `npx expo start`.
3. Scan the QR code.
4. Make sure the phone and laptop are on the same network.

---

## Running the Web Build Locally

From the frontend folder:

```bash
npx expo export --platform web
```

This creates a web export folder that can be deployed as a static site.

---

## Building the Android APK

The APK is built using Expo EAS Build.

### 1. Install EAS CLI

```bash
npm install -g eas-cli
```

### 2. Login to Expo

```bash
eas login
```

### 3. Configure EAS project

```bash
eas build:configure
```

If Git is not available locally, EAS can be run without version control using:

Command Prompt:

```bash
set EAS_NO_VCS=1
```

PowerShell:

```powershell
$env:EAS_NO_VCS="1"
```

### 4. Check `app.json`

Make sure the app has the correct name and Android package:

```json
{
  "expo": {
    "name": "NutriLabel",
    "slug": "nutrilabel-frontend",
    "android": {
      "package": "com.iniyan0037.nutrilabelfrontend"
    }
  }
}
```

### 5. Build preview APK

```bash
eas build --platform android --profile preview
```

After the build finishes, download the APK from the Expo build page.

---

## Render Deployment

### Backend Deployment on Render

Create a new Render Web Service.

Recommended settings:

```text
Root Directory: Backend
Runtime: Python
Build Command: pip install -r requirements.txt
Start Command: gunicorn app:app
```

Environment variables must be added in Render:

```env
DATABASE_URL=<Render internal PostgreSQL URL>
OCR_SPACE_API_KEY=<OCR.space API key>
OPENFOOD_API_URL=https://world.openfoodfacts.org
APP_AUTH_SECRET=<long random backend-only secret>
ADMIN_DEBUG_TOKEN=<long random backend-only token>
ALLOWED_ORIGINS=https://nutrilabel.live,https://www.nutrilabel.live
FRONTEND_ORIGINS=https://nutrilabel.live,https://www.nutrilabel.live
```

Backend custom domain:

```text
api.nutrilabel.live
```

---

### Frontend Deployment on Render

Create a new Render Static Site.

Recommended settings:

```text
Root Directory: Frontend
Build Command: npm install && npx expo export --platform web
Publish Directory: dist
```

Frontend environment variable:

```env
EXPO_PUBLIC_API_BASE_URL=https://api.nutrilabel.live
```

Frontend custom domains:

```text
nutrilabel.live
www.nutrilabel.live
```

---

## Database

The backend uses PostgreSQL.

Main database areas include:

```text
accounts
profiles
history
food_logs
nutrition_goals
rules
aliases
e_numbers
allergens
allergen_info
awareness_tips
recall/awareness data tables
```

The database supports:

- shared login accounts
- profile-specific data
- dietary analysis rules
- ingredient aliases
- E-number/additive data
- allergen matching
- food history
- nutrition tracking
- awareness dashboard data

---

## Security Features

NutriLabel includes the following security controls:

- HTTPS custom domains
- Backend security headers
- Restricted production CORS allowlist
- Protected `/db-status` endpoint using admin token
- Account token-based authentication
- Profile ownership checks
- Profile-specific history separation
- Profile-specific food log separation
- Mandatory profile name validation
- Maximum six profiles per shared login
- OCR file validation
- Non-image OCR upload rejection
- Invalid barcode rejection
- SQLAlchemy ORM usage
- Logout confirmation
- Local app state clearing on logout
- No backend secrets in frontend public environment variables
- Gitleaks and npm audit testing documented in the pentest report

Known remaining hardening items:

- Frontend static-site clickjacking headers should be configured in Render.
- Frontend dependency vulnerabilities from `npm audit` require controlled Expo-compatible remediation.
- Stronger individual authentication, rate limiting, and production privacy policy are recommended before real public release.

---

## Testing and Validation

The project includes security and testing documentation:

```text
Nutrilabel Security Plan.pdf
Penetration Testing Iteration 3.pdf
```

The penetration testing report includes evidence for:

- health endpoint
- protected `/db-status`
- login success and failure
- profile authentication
- profile ownership
- history separation
- food log separation
- invalid analysis payload
- SQL-style input handling
- invalid barcode rejection
- valid barcode lookup
- OCR missing file rejection
- OCR non-image rejection
- OCR nutrition validation
- CORS validation
- backend security headers
- frontend clickjacking test
- awareness endpoint validation
- product image URL handling
- logout confirmation
- npm audit
- Gitleaks
- Nmap
- Nikto
- SQLmap
- SecurityHeaders / Mozilla Observatory
- SSL Labs

---

## Demo Flow

A recommended demo flow is:

1. Open NutriLabel web or APK.
2. Login with demo credentials.
3. Select or create a profile.
4. Open Home and check selected profile.
5. Play the profile-based learning game.
6. Scan or enter a product barcode.
7. Review ingredient suitability result.
8. Check product image and nutrition values.
9. Save the product to profile history.
10. Open History and confirm the item appears only for the selected profile.
11. Open Nutrition and log food after consumption.
12. Use OCR nutrition extraction for a nutrition label image.
13. Open Learn and review recall/awareness charts.
14. Toggle high contrast mode.
15. Logout and confirm the app returns to login state.

---

## Important Notes

- This project is an academic build for FIT5120.
- It is not a medical, religious, legal, or manufacturer-certified decision system.
- Dietary results should be treated as guidance only.
- OCR and third-party product data can be incomplete or inaccurate.
- The app should return uncertain results when ingredient source or suitability is unclear.
- Real secrets must never be committed to GitHub.

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
Semester: Semester 1, 2026
Unit: FIT5120 Industry Experience
```

---

## License

This project was developed for academic coursework. Reuse, deployment, or public release should only occur with approval from the project team and subject requirements.

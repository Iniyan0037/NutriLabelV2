# NutriLabel Frontend Setup Guide

NutriLabel is a dietary ingredient analysis application built with Expo and React Native. This guide explains how to run the **frontend mobile app locally using Expo Go**.

The backend is already deployed on Render, so you do **not** need to set up Flask, PostgreSQL, OCR, or Open Food Facts locally to test the app.

---

## Deployed Backend

The frontend connects to the deployed Iteration 2 backend:

```env
EXPO_PUBLIC_API_BASE_URL=https://nutrilabel-backend-iteration2.onrender.com
```

Backend features already hosted on Render include:

- ingredient analysis
- barcode product lookup
- OCR processing
- profile saving, editing, and deleting
- history saving, viewing, and deleting
- recommendations
- PostgreSQL database connection

You only need to set up and run the frontend.

---

## Prerequisites

Install the following before starting:

- Node.js LTS
- npm
- Expo Go app on your phone

Expo Go can be installed from:

- Android: Google Play Store
- iOS: App Store

Check that Node.js and npm are installed:

```bash
node -v
npm -v
```

If these commands do not work, install Node.js LTS from:

```text
https://nodejs.org/
```

---

## 1. Clone or Download the Repository

Clone the repository:

```bash
git clone <your-repository-url>
```

Then open the project folder:

```bash
cd <your-repository-folder>
```

If you downloaded the ZIP from GitHub, extract it first and then open the extracted project folder.

---

## 2. Open the Frontend Folder

Go into the frontend directory:

```bash
cd Frontend
```

---

## 3. Install Frontend Dependencies

Run:

```bash
npm install
```

This installs all required Expo and React Native packages.

---

## 4. Create or Check the `.env` File

Inside the `Frontend` folder, create a file named:

```text
.env
```

Add this line:

```env
EXPO_PUBLIC_API_BASE_URL=https://nutrilabel-backend-iteration2.onrender.com
```

Do not add backend secrets here. The frontend `.env` should only contain the public backend URL.

Do **not** put any of these in the frontend:

```text
DATABASE_URL
OCR API key
database password
Render secrets
private tokens
```

Those are already configured securely on the deployed Render backend.

---

## 5. Start the Frontend

Run:

```bash
npm start
```

or:

```bash
npx expo start
```

Expo will start Metro Bundler and show a QR code in the terminal or browser.

---

## 6. Open the App on Mobile

### Android

1. Open the Expo Go app.
2. Scan the QR code shown by Expo.
3. NutriLabel will open on your phone.

### iOS

1. Open the Camera app.
2. Scan the QR code shown by Expo.
3. Tap the Expo link.
4. NutriLabel will open in Expo Go.

Your phone and computer should normally be connected to the same Wi-Fi network.

If the QR code does not work, start Expo using tunnel mode:

```bash
npx expo start --tunnel
```

Tunnel mode is slower, but it is more reliable if your phone and laptop are on different networks or if local network access is blocked.

---

## 7. Run the Web Version Locally

To test the web version locally, run:

```bash
npm start
```

Then press:

```text
w
```

This opens the app in your browser.

The deployed backend is still used, so no backend setup is required.

---

## 8. Main Features to Test

After opening the app, test the following flows.

### Profile Flow

1. Open the app.
2. Go to the profile/questionnaire section.
3. Create a dietary profile.
4. Enter a profile name.
5. Save the profile.
6. Open saved profiles.
7. Edit the profile.
8. Delete the profile.

### Manual Ingredient Analysis

Use this sample input:

```text
INGREDIENTS: SUGAR, VEGETABLE OIL, HAZELNUTS, SKIM MILK POWDER, SOY LECITHIN, VANILLIN. CONTAINS HAZELNUTS, MILK, SOY.
```

Select:

```text
Vegan + Nut-Free
```

Expected result:

```text
Restricted
```

The system should identify milk and hazelnuts as restricted ingredients.

### Barcode Analysis

1. Open the barcode scanner.
2. Allow camera permission.
3. Scan a packaged food barcode.
4. Wait for the backend to retrieve product data from Open Food Facts.
5. Check that the result screen displays product suitability.

If a product is not found, try another common supermarket product. Some products may not exist in Open Food Facts.

### OCR Analysis

1. Open the OCR/image upload feature.
2. Upload or capture an ingredient label image.
3. Wait for OCR extraction.
4. Review the extracted ingredient text.
5. Run analysis.

OCR works best with:

- clear lighting
- flat label
- readable text
- no blur
- minimal glare

### History Flow

1. Complete an analysis.
2. Open History.
3. Confirm the saved result appears.
4. Tap the history item.
5. Confirm the same result screen opens.
6. Remove the history item if needed.

### Accessibility Flow

1. Turn on high contrast mode.
2. Check that the main screens update consistently.
3. Open a result screen.
4. Press the Read Aloud button.
5. Confirm that the button changes between Start and Stop.
6. Confirm result statuses use icons and text, not colour only.

---

## 9. Troubleshooting

### `npm` is not recognized

Install Node.js LTS from:

```text
https://nodejs.org/
```

Then close and reopen the terminal.

Check again:

```bash
node -v
npm -v
```

---

### Expo QR Code Does Not Open on Phone

Try tunnel mode:

```bash
npx expo start --tunnel
```

Also check:

- Expo Go is installed
- phone and laptop are on the same Wi-Fi
- VPN is turned off
- firewall is not blocking Expo
- the terminal is still running Expo

---

### App Opens but API Calls Fail

Check that `Frontend/.env` contains:

```env
EXPO_PUBLIC_API_BASE_URL=https://nutrilabel-backend-iteration2.onrender.com
```

Then restart Expo with cache cleared:

```bash
npx expo start --clear
```

---

### Camera Does Not Work

Make sure camera permission is allowed on the phone.

On mobile:

1. close Expo Go
2. reopen the app
3. allow camera permission when prompted

If permission was denied earlier, enable it manually in phone settings.

---

### OCR Gives Poor Results

Use a clearer image:

- better lighting
- less blur
- ingredient text closer to camera
- avoid reflections
- keep label flat

OCR text should always be reviewed before analysis.

---

### Changes Are Not Appearing

Clear the Expo cache:

```bash
npx expo start --clear
```

If testing the browser version, hard refresh:

```text
Ctrl + Shift + R
```

---

## 10. Important Notes for Tutors and Testers

Only the frontend needs to be run locally.

The backend, database, OCR integration, and product lookup are already deployed and configured on Render.

The mobile app is tested through Expo Go. This avoids needing to install a standalone Android or iOS build.

The deployed website can be used for browser testing, but mobile camera features are best tested through Expo Go.

---

## 11. Technology Stack

### Frontend

```text
Expo
React Native
React Native Web
React Navigation
Expo Camera
Expo Image Picker
Expo Speech
Expo Haptics
html5-qrcode
```

### Backend

Already deployed on Render:

```text
Python
Flask
SQLAlchemy
Gunicorn
PostgreSQL
```

### External APIs

Handled by the deployed backend:

```text
Open Food Facts
OCR.space
```

---

## 12. Quick Start Summary

1. Open the frontend folder:

    ```bash
    cd Frontend
    ```

2. Install dependencies:

    ```bash
    npm install
    ```

3. Create a `.env` file inside the `Frontend` folder.

4. Add this line to the `.env` file:

    ```env
    EXPO_PUBLIC_API_BASE_URL=https://nutrilabel-backend-iteration2.onrender.com
    ```

5. Start Expo:

    ```bash
    npm start
    ```

6. Scan the QR code using the Expo Go app on your phone.

If the QR code does not work, start Expo using tunnel mode:

```bash
npx expo start --tunnel
```

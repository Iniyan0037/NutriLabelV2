# NutriLabel V3 Merged Build Notes

This merged build uses `NutriLabelV2-iteration-2` as the working base and adds Iteration 3 features aligned with the A&D report:

- Epic 7: Dietary Awareness Learning Game
- Epic 8: Allergen and Food Awareness Dashboard, additive/E-number view, personal insights, awareness tips
- Epic 9: Macro and Nutrition Tracking, food log, daily summary, nutrition goals, weekly trend
- Pivot update: animated intro screen, family login screen, maximum six profiles per family login, profile-scoped history, profile-scoped nutrition logs

## Frontend local test

```bash
cd Frontend
npm install
npx expo start --clear
```

Use Expo Go for mobile or press `w` for web.

## Frontend environment

Create or keep `Frontend/.env`:

```env
EXPO_PUBLIC_API_BASE_URL=https://nutrilabel-backend-iteration2.onrender.com
```

For local backend testing, replace the value with your local Flask server URL.

## Backend local test

```bash
cd Backend
pip install -r requirements.txt
python app.py
```

The backend still requires `DATABASE_URL`. OCR still requires `OCR_SPACE_API_KEY` or `OCR_API_KEY`.

## Important backend changes

New endpoints:

- `POST /auth/register`
- `POST /auth/login`
- `GET /awareness/allergens`
- `GET /awareness/additives`
- `GET /awareness/insights`
- `GET /awareness/tips`
- `POST /nutrition/log`
- `GET /nutrition/log`
- `DELETE /nutrition/log/<id>`
- `GET /nutrition/goals`
- `PUT /nutrition/goals`
- `GET /nutrition/summary`
- `GET /nutrition/trends`

New database tables:

- `user_accounts`
- `food_logs`
- `nutrition_goals`
- `allergen_info`
- `awareness_tips`

Existing tables extended safely:

- `profiles.account_id`
- `history.account_id`
- `history.profile_id`

The backend has a startup migration helper that adds these missing columns if the existing Render database does not have them.

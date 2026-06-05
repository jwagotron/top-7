# E2E Auth State Setup

Authenticated tests require pre-generated session files stored in:

```
src/tests/e2e/auth-state/athlete.json
src/tests/e2e/auth-state/coach.json
```

These files are **not committed to version control** (`.gitignore`d). They are generated automatically by `global-setup.js` when the required environment variables are present.

## How to generate auth state

1. Set the following environment variables:

```bash
export E2E_ATHLETE_EMAIL=athlete@example.com
export E2E_ATHLETE_PASSWORD=yourpassword

export E2E_COACH_EMAIL=coach@example.com
export E2E_COACH_PASSWORD=yourpassword

# Optional — defaults to http://localhost:5173
export BASE_URL=http://localhost:5173
```

2. Start the dev server (if not already running):

```bash
npm run dev
```

3. Run Playwright — `global-setup.js` will log in as each user and write the JSON files:

```bash
npx playwright test --config src/tests/e2e/playwright.config.js
```

The files will be created at:
- `src/tests/e2e/auth-state/athlete.json`
- `src/tests/e2e/auth-state/coach.json`

## Missing credentials behaviour

If any env vars are missing, `global-setup.js` prints a warning and exits without error. Tests that require authentication are automatically **skipped** (via `requireAuthState` helper). All unauthenticated tests continue to run normally.
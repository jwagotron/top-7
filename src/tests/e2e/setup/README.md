# E2E Test Setup

## Prerequisites

```bash
npx playwright install
```

## Auth State Setup

Before running tests that require authentication, create the auth state files:

### Athlete session
```bash
npx playwright codegen --save-storage=tests/e2e/auth-state/athlete.json http://localhost:5173/login
# Log in as an athlete account, then close the browser
```

### Coach session  
```bash
npx playwright codegen --save-storage=tests/e2e/auth-state/coach.json http://localhost:5173/login
# Log in as a coach account, then close the browser
```

## Running Tests

```bash
# All tests
npx playwright test tests/e2e/

# Single file
npx playwright test tests/e2e/auth.spec.js

# With UI (headed mode)
npx playwright test tests/e2e/ --headed

# Generate HTML report
npx playwright test tests/e2e/ --reporter=html && npx playwright show-report
```

## Environment Variables

```bash
BASE_URL=http://localhost:5173      # App URL
ATHLETE_EMAIL=athlete@test.com
ATHLETE_PASS=Test1234!
COACH_EMAIL=coach@test.com
COACH_PASS=Test1234!
```

## Test Files

| File | Coverage |
|------|----------|
| `auth.spec.js` | Login, register, forgot password, reset password, route protection |
| `onboarding.spec.js` | Role selection, athlete setup, coach team creation |
| `athlete-flows.spec.js` | Dashboard, My Plan, Goals, Settings, Join Team, Mobile nav |
| `coach-flows.spec.js` | Coach Panel, Workout Builder, Mobile nav |
| `join-team.spec.js` | Join team page (unauthenticated + authenticated) |
| `accessibility.spec.js` | Keyboard navigation, ARIA, autocomplete, modals |
| `security.spec.js` | Route access control, unauthenticated redirects |
| `data-persistence.spec.js` | Create/reload persistence, optimistic updates |

## Known Limitations

- Auth-dependent tests require saved sessions (`auth-state/*.json`)
- Some tests are conditional on data existing (e.g., "if workout exists today")
- Real-time subscription tests require a live backend
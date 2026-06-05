/* eslint-env node */
/* eslint-disable no-undef */
// @ts-check
const path = require('path');
const fs   = require('fs');

const AUTH_STATE_DIR = path.join(__dirname, '..', 'auth-state');

const PATHS = {
  athlete: path.join(AUTH_STATE_DIR, 'athlete.json'),
  coach:   path.join(AUTH_STATE_DIR, 'coach.json'),
};

// Only export the path if the file actually exists — otherwise export undefined.
// test.use({ storageState: undefined }) is a no-op in Playwright, which prevents
// the ENOENT crash that occurs when the file path is set but the file is missing.
const ATHLETE_AUTH = fs.existsSync(PATHS.athlete) ? PATHS.athlete : undefined;
const COACH_AUTH   = fs.existsSync(PATHS.coach)   ? PATHS.coach   : undefined;

/**
 * Call inside test.beforeEach to skip the test if the auth-state file is missing.
 *
 * @param {Function} skip  — the `skip` function from the Playwright test fixture
 * @param {'athlete'|'coach'} role
 */
function requireAuthState(skip, role) {
  const filePath = PATHS[role];
  if (!fs.existsSync(filePath)) {
    skip(
      `Auth state for "${role}" not found (${filePath}).\n` +
      `  Set E2E_${role.toUpperCase()}_EMAIL and E2E_${role.toUpperCase()}_PASSWORD ` +
      `env vars and re-run to enable these tests.`
    );
  }
}

module.exports = { requireAuthState, ATHLETE_AUTH, COACH_AUTH };
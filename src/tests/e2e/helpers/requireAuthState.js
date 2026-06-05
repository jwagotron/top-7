/* eslint-env node */
// @ts-check
/**
 * Call at the top of any describe block that needs a saved auth-state file.
 * If the file doesn't exist (credentials were not provided), every test in
 * the block is skipped with a clear human-readable message instead of
 * crashing with ENOENT.
 *
 * Usage:
 *   const { requireAuthState } = require('./helpers/requireAuthState');
 *   test.use({ storageState: ATHLETE_AUTH });
 *   test.beforeEach(({ skip }) => requireAuthState(skip, 'athlete'));
 */
const path = require('path');
const fs   = require('fs');

const AUTH_STATE_DIR = path.join(__dirname, '..', 'auth-state');

const PATHS = {
  athlete: path.join(AUTH_STATE_DIR, 'athlete.json'),
  coach:   path.join(AUTH_STATE_DIR, 'coach.json'),
};

/**
 * Exported path constants — use these in test.use({ storageState: ATHLETE_AUTH })
 * so the path is consistent everywhere.
 */
const ATHLETE_AUTH = PATHS.athlete;
const COACH_AUTH   = PATHS.coach;

/**
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
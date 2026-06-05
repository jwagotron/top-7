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
 * Returns true if the auth-state file exists for the given role.
 * Use with test.skip() inside beforeEach:
 *   test.beforeEach(async () => {
 *     test.skip(!requireAuthState('athlete'), 'Athlete auth state not available');
 *   });
 *
 * @param {'athlete'|'coach'} role
 * @returns {boolean}
 */
function requireAuthState(role) {
  return fs.existsSync(PATHS[role]);
}

module.exports = { requireAuthState, ATHLETE_AUTH, COACH_AUTH };
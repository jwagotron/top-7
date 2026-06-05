/* eslint-env node */
// @ts-check
const { chromium } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const AUTH_STATE_DIR = path.join(__dirname, 'auth-state');

async function loginAndSave(browser, email, password, outputFile, role) {
  console.log(`\n[global-setup] Logging in as ${role} (${email})…`);
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(`${BASE_URL}/login`);
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.getByRole('button', { name: /^log in$/i }).click();

  // Wait until redirected away from /login (auth complete)
  await page.waitForURL(url => !url.includes('/login'), { timeout: 20000 });

  await context.storageState({ path: outputFile });
  await context.close();
  console.log(`[global-setup] ✓ Saved ${role} auth state → ${outputFile}`);
}

module.exports = async function globalSetup() {
  const athleteEmail    = process.env.E2E_ATHLETE_EMAIL;
  const athletePassword = process.env.E2E_ATHLETE_PASSWORD;
  const coachEmail      = process.env.E2E_COACH_EMAIL;
  const coachPassword   = process.env.E2E_COACH_PASSWORD;

  const missingAthlete = !athleteEmail || !athletePassword;
  const missingCoach   = !coachEmail   || !coachPassword;

  if (missingAthlete || missingCoach) {
    const missing = [];
    if (!athleteEmail)    missing.push('E2E_ATHLETE_EMAIL');
    if (!athletePassword) missing.push('E2E_ATHLETE_PASSWORD');
    if (!coachEmail)      missing.push('E2E_COACH_EMAIL');
    if (!coachPassword)   missing.push('E2E_COACH_PASSWORD');
    console.warn(
      `\n[global-setup] ⚠️  Missing env vars: ${missing.join(', ')}\n` +
      `  Authenticated tests will be skipped — auth-state files won't be created.\n` +
      `  Set the variables above to enable full test coverage.\n`
    );
    return; // Don't fail — unauthenticated tests still run
  }

  // Ensure the auth-state directory exists
  fs.mkdirSync(AUTH_STATE_DIR, { recursive: true });

  const browser = await chromium.launch();

  await loginAndSave(
    browser,
    athleteEmail,
    athletePassword,
    path.join(AUTH_STATE_DIR, 'athlete.json'),
    'athlete'
  );

  await loginAndSave(
    browser,
    coachEmail,
    coachPassword,
    path.join(AUTH_STATE_DIR, 'coach.json'),
    'coach'
  );

  await browser.close();
};
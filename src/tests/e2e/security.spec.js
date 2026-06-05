/* eslint-env node */
/* eslint-disable no-undef */
// @ts-check
const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

test.describe('Security — Route Access Control', () => {

  test('Unauthenticated — /admin redirects to /login', async ({ page }) => {
    await page.goto(BASE_URL + '/admin');
    await expect(page).toHaveURL(/\/login/, { timeout: 8000 });
  });

  test('Unauthenticated — /coach redirects to /login', async ({ page }) => {
    await page.goto(BASE_URL + '/coach');
    await expect(page).toHaveURL(/\/login/, { timeout: 8000 });
  });

  test('Unauthenticated — /settings redirects to /login', async ({ page }) => {
    await page.goto(BASE_URL + '/settings');
    await expect(page).toHaveURL(/\/login/, { timeout: 8000 });
  });

  test('Unauthenticated — /goals redirects to /login', async ({ page }) => {
    await page.goto(BASE_URL + '/goals');
    await expect(page).toHaveURL(/\/login/, { timeout: 8000 });
  });

  test('Unauthenticated — /analytics redirects to /login', async ({ page }) => {
    await page.goto(BASE_URL + '/analytics');
    await expect(page).toHaveURL(/\/login/, { timeout: 8000 });
  });

  test('Unauthenticated — / redirects to /login', async ({ page }) => {
    await page.goto(BASE_URL + '/');
    await expect(page).toHaveURL(/\/login/, { timeout: 8000 });
  });

  test('Unauthenticated — /workout-builder redirects to /login', async ({ page }) => {
    await page.goto(BASE_URL + '/workout-builder');
    await expect(page).toHaveURL(/\/login/, { timeout: 8000 });
  });

  // Public routes that should NOT redirect
  test('/join is accessible without authentication', async ({ page }) => {
    await page.goto(BASE_URL + '/join');
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.getByText(/join a team/i)).toBeVisible();
  });

  test('/login is accessible without authentication', async ({ page }) => {
    await page.goto(BASE_URL + '/login');
    await expect(page).not.toHaveURL(/\/$/);
    await expect(page.getByText(/welcome back/i)).toBeVisible();
  });

  test('/register is accessible without authentication', async ({ page }) => {
    await page.goto(BASE_URL + '/register');
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('/forgot-password is accessible without authentication', async ({ page }) => {
    await page.goto(BASE_URL + '/forgot-password');
    await expect(page).not.toHaveURL(/\/login/);
  });

});

test.describe('Security — Athlete cannot access Admin', () => {
  const { requireAuthState, ATHLETE_AUTH } = require('./helpers/requireAuthState');
  test.use({ storageState: ATHLETE_AUTH || { cookies: [], origins: [] } });
  test.beforeEach(async () => {
    test.skip(!requireAuthState('athlete'), 'Athlete auth state not available — set E2E_ATHLETE_EMAIL / E2E_ATHLETE_PASSWORD and re-run');
  });

  test('Athlete visiting /admin is redirected or shown access denied', async ({ page }) => {
    await page.goto(BASE_URL + '/admin');
    // Either redirected away or page shows access denied
    const isRedirected = !page.url().includes('/admin');
    const hasDenied = await page.getByText(/access denied|forbidden|unauthorized|403/i).isVisible().catch(() => false);
    const isHome = page.url().endsWith('/') || page.url().includes('/?');
    expect(isRedirected || hasDenied || isHome).toBe(true);
  });

});
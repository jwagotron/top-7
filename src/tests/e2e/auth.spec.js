// @ts-check
/* eslint-env node */
const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const ATHLETE_EMAIL = process.env.ATHLETE_EMAIL || 'athlete@test.com';
const ATHLETE_PASS  = process.env.ATHLETE_PASS  || 'Test1234!';
const COACH_EMAIL   = process.env.COACH_EMAIL   || 'coach@test.com';
const COACH_PASS    = process.env.COACH_PASS    || 'Test1234!';

// ────────────────────────────────────────────────────────────────────────────
// AUTH FLOWS
// ────────────────────────────────────────────────────────────────────────────

test.describe('Authentication', () => {

  test('unauthenticated user is redirected to /login', async ({ page }) => {
    await page.goto(BASE_URL + '/');
    await expect(page).toHaveURL(/\/login/);
  });

  test('unauthenticated user visiting /coach is redirected to /login', async ({ page }) => {
    await page.goto(BASE_URL + '/coach');
    await expect(page).toHaveURL(/\/login/);
  });

  test('Login page renders all required elements', async ({ page }) => {
    await page.goto(BASE_URL + '/login');
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.getByRole('button', { name: /log in/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /continue with google/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /create one/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /forgot password/i })).toBeVisible();
  });

  test('Login shows error on wrong credentials', async ({ page }) => {
    await page.goto(BASE_URL + '/login');
    await page.fill('#email', 'wrong@example.com');
    await page.fill('#password', 'wrongpassword');
    await page.getByRole('button', { name: /^log in$/i }).click();
    // Button shows spinner during loading
    await expect(page.getByRole('button', { name: /logging in/i })).toBeVisible();
    // Error message appears
    await expect(page.locator('text=Invalid email or password').or(page.locator('[class*=destructive]'))).toBeVisible({ timeout: 10000 });
  });

  test('Login button is disabled while loading', async ({ page }) => {
    await page.goto(BASE_URL + '/login');
    await page.fill('#email', 'test@test.com');
    await page.fill('#password', 'password');
    await page.getByRole('button', { name: /^log in$/i }).click();
    // Check button disabled state immediately after click
    await expect(page.getByRole('button', { name: /logging in/i })).toBeDisabled();
  });

  test('Register page link navigates correctly', async ({ page }) => {
    await page.goto(BASE_URL + '/login');
    await page.getByRole('link', { name: /create one/i }).click();
    await expect(page).toHaveURL(/\/register/);
  });

  test('Forgot password page link navigates correctly', async ({ page }) => {
    await page.goto(BASE_URL + '/login');
    await page.getByRole('link', { name: /forgot password/i }).click();
    await expect(page).toHaveURL(/\/forgot-password/);
  });

  test('Register page renders all elements', async ({ page }) => {
    await page.goto(BASE_URL + '/register');
    await expect(page.locator('input[type=email]')).toBeVisible();
    await expect(page.locator('input[type=password]').first()).toBeVisible();
    await expect(page.getByRole('button', { name: /continue with google/i })).toBeVisible();
  });

  test('Forgot password page shows email input', async ({ page }) => {
    await page.goto(BASE_URL + '/forgot-password');
    await expect(page.locator('input[type=email]')).toBeVisible();
  });

  test('Forgot password — always shows success message (no email enumeration)', async ({ page }) => {
    await page.goto(BASE_URL + '/forgot-password');
    await page.fill('input[type=email]', 'nonexistent@example.com');
    await page.getByRole('button', { name: /reset|send/i }).click();
    // Should show success regardless of whether email exists
    await expect(page.locator('text=/check your email|sent|success/i')).toBeVisible({ timeout: 10000 });
  });

  test('Reset password page reads token from URL', async ({ page }) => {
    await page.goto(BASE_URL + '/reset-password?token=fake-token-123');
    // Should show the new password form (not a redirect)
    await expect(page.locator('input[type=password]').first()).toBeVisible();
  });

  test('/join route is accessible without authentication', async ({ page }) => {
    await page.goto(BASE_URL + '/join');
    // Should render the join page, not redirect to login
    await expect(page.locator('text=/join a team/i')).toBeVisible();
  });

});
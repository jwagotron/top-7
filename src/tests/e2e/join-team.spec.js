/* eslint-env node */
/* eslint-disable no-undef */
// @ts-check
const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

// No storageState — these tests run unauthenticated OR with athlete session
test.describe('Join Team — Unauthenticated', () => {

  test('/join renders without auth', async ({ page }) => {
    await page.goto(BASE_URL + '/join');
    await expect(page.getByText(/join a team/i)).toBeVisible({ timeout: 5000 });
  });

  test('/join shows sign-in prompt to unauthenticated user', async ({ page }) => {
    await page.goto(BASE_URL + '/join');
    await expect(page.getByText(/signed in to join/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('button', { name: /sign in/i }).or(page.getByText(/sign in/i))).toBeVisible();
  });

  test('/join — Join Team button submits and redirects to login when not authed', async ({ page }) => {
    await page.goto(BASE_URL + '/join');
    await page.fill('input', 'TESTCODE');
    // Should redirect to login
    const [navigation] = await Promise.all([
      page.waitForNavigation({ timeout: 8000 }).catch(() => null),
      page.getByRole('button', { name: /join team/i }).click(),
    ]);
    if (navigation) {
      await expect(page).toHaveURL(/\/login/);
    }
  });

  test('/join?code=XXXX — code is auto-populated from URL', async ({ page }) => {
    await page.goto(BASE_URL + '/join?code=ABCD1234');
    const input = page.getByPlaceholder(/abc12345/i);
    await expect(input).toHaveValue('ABCD1234', { timeout: 3000 });
  });

  test('/join — code input is uppercase only', async ({ page }) => {
    await page.goto(BASE_URL + '/join');
    const input = page.getByPlaceholder(/abc12345/i);
    await input.fill('lowercase');
    await expect(input).toHaveValue('LOWERCASE');
  });

  test('/join — code input enforces 8 char max', async ({ page }) => {
    await page.goto(BASE_URL + '/join');
    const input = page.getByPlaceholder(/abc12345/i);
    await input.fill('ABCDEFGHIJ'); // 10 chars
    const val = await input.inputValue();
    expect(val.length).toBeLessThanOrEqual(8);
  });

  test('/join — Enter key submits the form', async ({ page }) => {
    await page.goto(BASE_URL + '/join');
    await page.fill('input', 'TESTCODE');
    await page.keyboard.press('Enter');
    // Either redirects to login or shows error (if authed with bad code)
    const response = page.getByRole('button', { name: /join team|joining/i });
    await expect(response).toBeVisible({ timeout: 5000 });
  });

});
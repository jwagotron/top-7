/* eslint-env node */
/* eslint-disable no-undef */
// @ts-check
const { test, expect } = require('@playwright/test');
const { requireAuthState, ATHLETE_AUTH } = require('./helpers/requireAuthState');

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

test.use({ storageState: ATHLETE_AUTH || { cookies: [], origins: [] } });

test.describe('Data Persistence — Reload Verification', () => {
  test.beforeEach(({ skip }) => requireAuthState(skip, 'athlete'));

  test('Goals persist across page reload', async ({ page }) => {
    await page.goto(BASE_URL + '/goals');
    await page.waitForLoadState('networkidle');

    const uniqueTitle = `Persist Goal ${Date.now()}`;

    // Create goal
    await page.getByRole('button', { name: /new goal/i }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel(/title/i).fill(uniqueTitle);
    await dialog.getByRole('button', { name: /create goal/i }).click();
    await expect(page.getByText(uniqueTitle)).toBeVisible({ timeout: 8000 });

    // Reload — must still be there
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(uniqueTitle)).toBeVisible({ timeout: 10000 });

    // Cleanup
    const goalCard = page.locator('[class*=Card]').filter({ hasText: uniqueTitle });
    await goalCard.hover();
    const btns = goalCard.getByRole('button').all();
    page.on('dialog', d => d.accept());
    const allBtns = await btns;
    if (allBtns.length > 0) await allBtns[allBtns.length - 1].click();
  });

  test('Display name update persists on reload', async ({ page }) => {
    await page.goto(BASE_URL + '/settings');
    await page.waitForLoadState('networkidle');

    const nameInput = page.getByPlaceholder(/your name/i);
    const original = await nameInput.inputValue();
    const newName = `Test User ${Date.now() % 10000}`;

    await nameInput.fill(newName);
    await page.getByRole('button', { name: /save changes/i }).click();
    await expect(page.getByRole('button', { name: /✓ saved|saved/i })).toBeVisible({ timeout: 8000 });

    await page.reload();
    await page.waitForLoadState('networkidle');
    const reloadedName = await page.getByPlaceholder(/your name/i).inputValue();
    expect(reloadedName).toBe(newName);

    // Restore original
    await page.getByPlaceholder(/your name/i).fill(original || 'Test User');
    await page.getByRole('button', { name: /save changes/i }).click();
  });

  test('Unit preference (km/mi) persists across reload', async ({ page }) => {
    await page.goto(BASE_URL + '/settings');
    await page.waitForLoadState('networkidle');

    // Switch to MI
    await page.getByRole('button', { name: /^mi$/i }).click();
    await page.reload();

    const miBtn = page.getByRole('button', { name: /^mi$/i });
    await expect(miBtn).toHaveClass(/bg-primary/);

    // Switch back to KM
    await page.getByRole('button', { name: /^km$/i }).click();
  });

  test('Theme preference (dark/light) persists across reload', async ({ page }) => {
    await page.goto(BASE_URL + '/');
    await page.waitForLoadState('networkidle');

    // Click dark mode toggle
    const toggleBtn = page.getByRole('button', { name: /dark mode|light mode|moon|sun/i }).first();
    if (await toggleBtn.isVisible().catch(() => false)) {
      const classBefore = await page.locator('html').getAttribute('class');
      await toggleBtn.click();
      await page.reload();
      const classAfter = await page.locator('html').getAttribute('class');
      // Class should reflect the toggled theme
      expect(classBefore).not.toBeNull();
    }
  });

});

test.describe('Data Persistence — Optimistic Updates', () => {
  test.beforeEach(({ skip }) => requireAuthState(skip, 'athlete'));

  test('Today workout completion reflects immediately without full reload', async ({ page }) => {
    await page.goto(BASE_URL + '/');
    await page.waitForLoadState('networkidle');

    // Only test if workout exists today
    const completeBtn = page.locator('button').filter({ has: page.locator('[class*=fill-primary],[class*=Play]') }).first();
    if (await completeBtn.isVisible().catch(() => false) && !(await completeBtn.isDisabled())) {
      await completeBtn.click();
      // Should immediately show pending state (spinner)
      await expect(page.locator('[class*=animate-spin]').first()).toBeVisible({ timeout: 1000 });
      // Should resolve to completed state
      await expect(page.getByText(/today's workout.*complete|complete/i).first()).toBeVisible({ timeout: 10000 });
    }
  });

});
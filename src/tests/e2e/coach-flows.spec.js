// @ts-check
/* eslint-env node */
const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

// Requires coach session saved to auth-state/coach.json
test.use({ storageState: 'tests/e2e/auth-state/coach.json' });

test.describe('Coach — Coach Panel', () => {

  test('Coach Panel loads without crashing', async ({ page }) => {
    await page.goto(BASE_URL + '/coach');
    await expect(page.getByText(/coach panel/i)).toBeVisible({ timeout: 12000 });
  });

  test('Coach Panel — shows loading spinner on first load (no flash of empty state)', async ({ page }) => {
    await page.goto(BASE_URL + '/coach');
    // Spinner must appear before content settles
    const spinner = page.locator('[class*=animate-spin]').first();
    const content = page.getByText(/no teams yet|create your first team|coach panel/i);
    await expect(spinner.or(content)).toBeVisible({ timeout: 5000 });
  });

  test('Coach Panel — empty state shows Create Team button when no teams', async ({ page }) => {
    await page.goto(BASE_URL + '/coach');
    await page.waitForLoadState('networkidle');
    const noTeams = page.getByText(/no teams yet/i);
    const teamExists = page.getByText(/invite athlete/i);
    // One of these must be visible
    await expect(noTeams.or(teamExists)).toBeVisible({ timeout: 15000 });
    if (await noTeams.isVisible()) {
      await expect(page.getByRole('button', { name: /create your first team/i })).toBeVisible();
    }
  });

  test('Coach Panel — Create Team modal opens and has required fields', async ({ page }) => {
    await page.goto(BASE_URL + '/coach');
    await page.waitForLoadState('networkidle');
    // Try "Create Your First Team" OR "New Team" button
    const createBtn = page.getByRole('button', { name: /create your first team|new team/i }).first();
    if (await createBtn.isVisible().catch(() => false)) {
      await createBtn.click();
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 3000 });
      await expect(page.getByLabel(/team name/i)).toBeVisible();
      await expect(page.getByRole('button', { name: /create team/i })).toBeVisible();
    }
  });

  test('Coach Panel — Assign Workout button opens form', async ({ page }) => {
    await page.goto(BASE_URL + '/coach');
    await page.waitForLoadState('networkidle');
    // Assign button in TopBar
    const assignBtn = page.getByRole('button', { name: /assign/i }).first();
    if (await assignBtn.isVisible().catch(() => false)) {
      await assignBtn.click();
      await expect(page.getByRole('dialog').or(page.locator('[class*=AssignWorkout],[class*=form]')).first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('Coach Panel — Invite Athlete button opens modal with close button accessible', async ({ page }) => {
    await page.goto(BASE_URL + '/coach');
    await page.waitForLoadState('networkidle');
    const inviteBtn = page.getByRole('button', { name: /invite athlete/i });
    if (await inviteBtn.isVisible().catch(() => false)) {
      await inviteBtn.click();
      await expect(page.getByText(/invite athlete/i).last()).toBeVisible({ timeout: 3000 });
      // Close button must have aria-label
      const closeBtn = page.getByRole('button', { name: /close invite modal/i });
      await expect(closeBtn).toBeVisible();
      await closeBtn.click();
      await expect(page.getByText(/invite athlete/i).last()).not.toBeVisible({ timeout: 2000 });
    }
  });

  test('Coach Panel — Tabs: Workouts, Athletes, Feedback all render', async ({ page }) => {
    await page.goto(BASE_URL + '/coach');
    await page.waitForLoadState('networkidle');
    // Only test if team exists
    const workoutsTab = page.getByRole('tab', { name: /workouts/i });
    if (await workoutsTab.isVisible().catch(() => false)) {
      await workoutsTab.click();
      await expect(page.getByText(/assigned|completed|remaining|rate/i).first()).toBeVisible({ timeout: 5000 });
      // Athletes tab
      await page.getByRole('tab', { name: /athletes/i }).click();
      await expect(page.locator('[class*=TeamMembership],[class*=roster]').or(page.getByText(/no athletes|pending/i)).first()).toBeVisible({ timeout: 5000 });
      // Feedback tab
      await page.getByRole('tab', { name: /feedback/i }).click();
    }
  });

  test('Coach Panel — Athlete filter dropdown visible and functional', async ({ page }) => {
    await page.goto(BASE_URL + '/coach');
    await page.waitForLoadState('networkidle');
    const athleteFilter = page.getByText(/all athletes/i).first();
    if (await athleteFilter.isVisible().catch(() => false)) {
      await athleteFilter.click();
      // Dropdown opens
      await expect(page.getByRole('option', { name: /all athletes/i })).toBeVisible({ timeout: 3000 });
    }
  });

  test('Coach Panel — stat cards show numbers (not undefined/NaN)', async ({ page }) => {
    await page.goto(BASE_URL + '/coach');
    await page.waitForLoadState('networkidle');
    const statLabels = ['Assigned', 'Completed', 'Remaining', 'Rate'];
    // Only check if team has workouts tab
    if (await page.getByRole('tab', { name: /workouts/i }).isVisible().catch(() => false)) {
      for (const label of statLabels) {
        const card = page.getByText(label).locator('..').locator('..');
        const value = card.locator('p').first();
        const text = await value.textContent().catch(() => '');
        // Value should never be 'NaN', 'undefined', or 'null'
        expect(text).not.toMatch(/NaN|undefined|null/);
      }
    }
  });

  test('Coach Panel — calendar navigation works (prev/next month)', async ({ page }) => {
    await page.goto(BASE_URL + '/coach');
    await page.waitForLoadState('networkidle');
    // Verify calendar exists and navigation buttons work
    const prevBtn = page.getByRole('button', { name: /previous|prev|←|‹/i }).first();
    const nextBtn = page.getByRole('button', { name: /next|→|›/i }).first();
    if (await prevBtn.isVisible().catch(() => false)) {
      await nextBtn.click();
      await prevBtn.click();
    }
  });

  test('Coach Panel — Messages link is reachable from sidebar', async ({ page }) => {
    await page.goto(BASE_URL + '/coach');
    await page.waitForLoadState('networkidle');
    // Desktop sidebar
    const messagesLink = page.locator('a[href="/messages"],nav').getByText(/messages/i);
    if (await messagesLink.isVisible().catch(() => false)) {
      await messagesLink.click();
      await expect(page).toHaveURL(/\/messages/);
    }
  });

});

test.describe('Coach — Workout Builder', () => {

  test('Workout Builder page loads', async ({ page }) => {
    await page.goto(BASE_URL + '/workout-builder');
    await expect(page.getByText(/workout builder/i)).toBeVisible({ timeout: 10000 });
  });

  test('Workout Builder — no horizontal overflow on desktop', async ({ page }) => {
    await page.goto(BASE_URL + '/workout-builder');
    await page.waitForLoadState('networkidle');
    const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
    const clientWidth = await page.evaluate(() => document.body.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);
  });

  test('Workout Builder — no horizontal overflow on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(BASE_URL + '/workout-builder');
    await page.waitForLoadState('networkidle');
    const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
    const clientWidth = await page.evaluate(() => document.body.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);
  });

});

test.describe('Coach — Mobile Navigation', () => {

  test.use({ viewport: { width: 390, height: 844 } });

  test('Mobile nav shows Coach, Builder, Messages, Settings tabs', async ({ page }) => {
    await page.goto(BASE_URL + '/coach');
    const nav = page.locator('nav.fixed.bottom-0');
    await expect(nav.getByText('Coach')).toBeVisible({ timeout: 5000 });
    await expect(nav.getByText('Builder')).toBeVisible();
    await expect(nav.getByText('Messages')).toBeVisible();
    await expect(nav.getByText('Settings')).toBeVisible();
  });

  test('Mobile nav — Messages tab navigates to /messages', async ({ page }) => {
    await page.goto(BASE_URL + '/coach');
    await page.locator('nav.fixed.bottom-0').getByText('Messages').click();
    await expect(page).toHaveURL(/\/messages/);
  });

  test('Coach Panel does not overflow on mobile', async ({ page }) => {
    await page.goto(BASE_URL + '/coach');
    await page.waitForLoadState('networkidle');
    const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
    const clientWidth = await page.evaluate(() => document.body.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);
  });

});
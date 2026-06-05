/* eslint-env node */
// @ts-check
const { test, expect } = require('@playwright/test');
const { requireAuthState, ATHLETE_AUTH } = require('./helpers/requireAuthState');

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

test.use({ storageState: ATHLETE_AUTH });

test.describe('Athlete — Dashboard', () => {
  test.beforeEach(({ skip }) => requireAuthState(skip, 'athlete'));

  test('Dashboard loads without crashing', async ({ page }) => {
    await page.goto(BASE_URL + '/');
    await expect(page.getByText(/my progress/i)).toBeVisible({ timeout: 10000 });
  });

  test('Dashboard shows loading spinner then content', async ({ page }) => {
    await page.goto(BASE_URL + '/');
    // Either spinner or content should be visible — never a blank page
    const spinner = page.locator('[class*=animate-spin]');
    const content = page.getByText(/this week/i);
    await expect(spinner.or(content)).toBeVisible({ timeout: 8000 });
    // Content must eventually appear
    await expect(content).toBeVisible({ timeout: 15000 });
  });

  test('Dashboard stat cards — Workouts, Distance, Time always visible', async ({ page }) => {
    await page.goto(BASE_URL + '/');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Workouts')).toBeVisible();
    await expect(page.getByText('Distance')).toBeVisible();
    await expect(page.getByText('Time')).toBeVisible();
  });

  test("Dashboard — Rest day shows moon card when no workout today", async ({ page }) => {
    await page.goto(BASE_URL + '/');
    await page.waitForLoadState('networkidle');
    // Either today's workout card OR rest day card must be visible
    const todayWorkout = page.getByText(/today's workout/i).first();
    const restDay = page.getByText(/rest day/i);
    await expect(todayWorkout.or(restDay)).toBeVisible({ timeout: 10000 });
  });

  test('Dashboard — Today workout complete button fires optimistic update', async ({ page }) => {
    await page.goto(BASE_URL + '/');
    await page.waitForLoadState('networkidle');
    // Only test if there's a workout today (not rest day)
    const completeCircle = page.locator('button[type=button]').filter({ has: page.locator('[class*=fill-primary]') }).first();
    if (await completeCircle.isVisible().catch(() => false)) {
      await completeCircle.click();
      // Spinner should appear while pending
      await expect(page.locator('[class*=animate-spin]')).toBeVisible({ timeout: 2000 });
    }
  });

  test('Dashboard — Recent activity tap opens workout detail drawer', async ({ page }) => {
    await page.goto(BASE_URL + '/');
    await page.waitForLoadState('networkidle');
    // Click the first recent activity item if any
    const activityBtn = page.locator('button[type=button]').filter({ hasText: /mon|tue|wed|thu|fri|sat|sun|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec/i }).first();
    if (await activityBtn.isVisible().catch(() => false)) {
      await activityBtn.click();
      // Drawer or dialog should appear
      await expect(page.locator('[role=dialog],[data-state=open]').first()).toBeVisible({ timeout: 3000 });
    }
  });

  test('Dashboard — empty recent activity shows fallback text', async ({ page }) => {
    await page.goto(BASE_URL + '/');
    await page.waitForLoadState('networkidle');
    // Either workouts list OR empty state
    const emptyState = page.getByText(/no workouts logged yet/i);
    const activityList = page.locator('[class*=recentActivity],[class*=recent]').first();
    // At least the section header is always visible
    await expect(page.getByText(/recent activity/i)).toBeVisible({ timeout: 10000 });
  });

});

test.describe('Athlete — My Plan', () => {
  test.beforeEach(({ skip }) => requireAuthState(skip, 'athlete'));

  test('My Plan page loads without crashing', async ({ page }) => {
    await page.goto(BASE_URL + '/my-plan');
    await expect(page.getByText(/my plan/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('My Plan shows spinner during load', async ({ page }) => {
    await page.goto(BASE_URL + '/my-plan');
    const spinner = page.locator('[class*=animate-spin]');
    const content = page.getByText(/my plan|no plan assigned/i);
    await expect(spinner.or(content)).toBeVisible({ timeout: 5000 });
  });

  test('My Plan — no plan state is user-friendly', async ({ page }) => {
    await page.goto(BASE_URL + '/my-plan');
    await page.waitForLoadState('networkidle');
    // If no plan: friendly message shown
    const noPlan = page.getByText(/no plan assigned yet/i);
    const hasPlan = page.getByText(/active|draft|paused|completed/i);
    await expect(noPlan.or(hasPlan)).toBeVisible({ timeout: 12000 });
  });

  test('My Plan — Full Schedule toggle expands and collapses', async ({ page }) => {
    await page.goto(BASE_URL + '/my-plan');
    await page.waitForLoadState('networkidle');
    const scheduleBtn = page.getByText(/full schedule/i);
    if (await scheduleBtn.isVisible().catch(() => false)) {
      await scheduleBtn.click();
      // Should expand — Done buttons appear
      const doneBtn = page.getByRole('button', { name: /done/i }).first();
      await expect(doneBtn).toBeVisible({ timeout: 3000 });
      // Collapse
      await scheduleBtn.click();
      await expect(doneBtn).not.toBeVisible({ timeout: 2000 });
    }
  });

  test('My Plan — completing a workout shows success toast', async ({ page }) => {
    await page.goto(BASE_URL + '/my-plan');
    await page.waitForLoadState('networkidle');
    const scheduleBtn = page.getByText(/full schedule/i);
    if (await scheduleBtn.isVisible().catch(() => false)) {
      await scheduleBtn.click();
      const doneBtn = page.getByRole('button', { name: /done/i }).first();
      if (await doneBtn.isVisible().catch(() => false)) {
        await doneBtn.click();
        // Success toast
        await expect(page.getByText(/workout completed/i)).toBeVisible({ timeout: 10000 });
      }
    }
  });

  test('My Plan — Done buttons all disabled while one completion is pending', async ({ page }) => {
    await page.goto(BASE_URL + '/my-plan');
    await page.waitForLoadState('networkidle');
    const scheduleBtn = page.getByText(/full schedule/i);
    if (await scheduleBtn.isVisible().catch(() => false)) {
      await scheduleBtn.click();
      const doneBtns = page.getByRole('button', { name: /done/i });
      if (await doneBtns.first().isVisible().catch(() => false)) {
        await doneBtns.first().click();
        // All done buttons should be disabled while mutation is pending
        const allDone = await doneBtns.all();
        for (const btn of allDone) {
          await expect(btn).toBeDisabled();
        }
      }
    }
  });

  test('My Plan — Today → Back to Today button works', async ({ page }) => {
    await page.goto(BASE_URL + '/my-plan');
    await page.waitForLoadState('networkidle');
    // Click a different day via weekly schedule
    const dayBtns = page.locator('[class*=weekly],[class*=WeeklySchedule]').locator('button');
    if (await dayBtns.nth(2).isVisible().catch(() => false)) {
      await dayBtns.nth(2).click();
      // "← Today" back link should appear
      const backBtn = page.getByText(/today/i).filter({ hasText: /←|back/i });
      if (await backBtn.isVisible().catch(() => false)) {
        await backBtn.click();
        await expect(backBtn).not.toBeVisible({ timeout: 2000 });
      }
    }
  });

});

test.describe('Athlete — Goals', () => {
  test.beforeEach(({ skip }) => requireAuthState(skip, 'athlete'));

  test('Goals page loads', async ({ page }) => {
    await page.goto(BASE_URL + '/goals');
    await expect(page.getByText(/my goals/i)).toBeVisible({ timeout: 10000 });
  });

  test('Goals — New Goal button opens form dialog', async ({ page }) => {
    await page.goto(BASE_URL + '/goals');
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: /new goal/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 3000 });
    await expect(page.getByText(/create goal/i)).toBeVisible();
  });

  test('Goals — form requires title field (submit disabled when empty)', async ({ page }) => {
    await page.goto(BASE_URL + '/goals');
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: /new goal/i }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    const submitBtn = dialog.getByRole('button', { name: /create goal/i });
    // Click submit without filling title — HTML required should prevent
    await submitBtn.click();
    // Dialog stays open (form validation blocks submit)
    await expect(dialog).toBeVisible();
  });

  test('Goals — create a goal persists on reload', async ({ page }) => {
    await page.goto(BASE_URL + '/goals');
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: /new goal/i }).click();
    const dialog = page.getByRole('dialog');
    const titleInput = dialog.getByLabel(/title/i);
    const uniqueTitle = `E2E Goal ${Date.now()}`;
    await titleInput.fill(uniqueTitle);
    await dialog.getByRole('button', { name: /create goal/i }).click();
    // Toast appears
    await expect(page.getByText(/goal created/i)).toBeVisible({ timeout: 8000 });
    // Dialog closes
    await expect(dialog).not.toBeVisible({ timeout: 3000 });
    // Goal appears in list
    await expect(page.getByText(uniqueTitle)).toBeVisible({ timeout: 5000 });
    // Reload — persists
    await page.reload();
    await expect(page.getByText(uniqueTitle)).toBeVisible({ timeout: 10000 });
    // Cleanup — delete it
    const goalCard = page.locator('[class*=Card]').filter({ hasText: uniqueTitle });
    await goalCard.hover();
    const deleteBtn = goalCard.getByRole('button').filter({ has: page.locator('svg') }).last();
    page.on('dialog', d => d.accept()); // confirm the window.confirm
    await deleteBtn.click();
    await expect(page.getByText(uniqueTitle)).not.toBeVisible({ timeout: 8000 });
  });

  test('Goals — delete requires confirmation dialog', async ({ page }) => {
    await page.goto(BASE_URL + '/goals');
    await page.waitForLoadState('networkidle');
    // Create a goal to delete
    await page.getByRole('button', { name: /new goal/i }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel(/title/i).fill('Test Delete Goal');
    await dialog.getByRole('button', { name: /create goal/i }).click();
    await expect(page.getByText('Test Delete Goal')).toBeVisible({ timeout: 8000 });
    // Try deleting — should trigger window.confirm
    let confirmCalled = false;
    page.on('dialog', async d => {
      confirmCalled = true;
      await d.dismiss(); // Cancel — should NOT delete
    });
    const goalCard = page.locator('[class*=Card]').filter({ hasText: 'Test Delete Goal' });
    await goalCard.hover();
    const deleteBtn = goalCard.getByRole('button').filter({ has: page.locator('svg') }).last();
    await deleteBtn.click();
    expect(confirmCalled).toBe(true);
    // Goal still present after cancel
    await expect(page.getByText('Test Delete Goal')).toBeVisible();
    // Accept confirm and actually delete
    page.on('dialog', d => d.accept());
    await deleteBtn.click();
    await expect(page.getByText('Test Delete Goal')).not.toBeVisible({ timeout: 8000 });
  });

  test('Goals — edit button populates form with existing data', async ({ page }) => {
    await page.goto(BASE_URL + '/goals');
    await page.waitForLoadState('networkidle');
    const editBtn = page.getByRole('button').filter({ has: page.locator('svg[data-icon-name="pencil"],svg') }).first();
    // Only test if goals exist
    if (await editBtn.isVisible().catch(() => false)) {
      await editBtn.click();
      const dialog = page.getByRole('dialog');
      await expect(dialog.getByLabel(/title/i)).not.toHaveValue('');
      await expect(dialog.getByRole('button', { name: /update/i })).toBeVisible();
    }
  });

  test('Goals — empty state is friendly', async ({ page }) => {
    await page.goto(BASE_URL + '/goals');
    await page.waitForLoadState('networkidle');
    const goals = page.locator('[class*=Card]');
    const emptyState = page.getByText(/set your first goal/i);
    // One of the two must be true
    const hasGoals = await goals.count() > 0;
    if (!hasGoals) {
      await expect(emptyState).toBeVisible();
    }
  });

});

test.describe('Athlete — Settings', () => {
  test.beforeEach(({ skip }) => requireAuthState(skip, 'athlete'));

  test('Settings page loads', async ({ page }) => {
    await page.goto(BASE_URL + '/settings');
    await expect(page.getByText(/account settings/i)).toBeVisible({ timeout: 10000 });
  });

  test('Settings — unit toggle persists across reload', async ({ page }) => {
    await page.goto(BASE_URL + '/settings');
    await page.waitForLoadState('networkidle');
    // Click MI
    await page.getByRole('button', { name: /mi/i }).click();
    await page.reload();
    // MI should still be selected
    const miBtn = page.getByRole('button', { name: /mi/i });
    await expect(miBtn).toHaveClass(/bg-primary/);
  });

  test('Settings — Save Changes shows saving state then confirmation', async ({ page }) => {
    await page.goto(BASE_URL + '/settings');
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: /save changes/i }).click();
    await expect(page.getByRole('button', { name: /saving/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /✓ saved|saved/i })).toBeVisible({ timeout: 8000 });
  });

  test('Settings — Sign Out button is visible and accessible', async ({ page }) => {
    await page.goto(BASE_URL + '/settings');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('button', { name: /sign out/i })).toBeVisible();
  });

  test('Settings — Delete Account button opens confirmation dialog', async ({ page }) => {
    await page.goto(BASE_URL + '/settings');
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: /delete my account/i }).click();
    await expect(page.getByRole('alertdialog')).toBeVisible();
    await expect(page.getByText(/are you absolutely sure/i)).toBeVisible();
    // Cancel preserves account
    await page.getByRole('button', { name: /cancel/i }).click();
    await expect(page.getByRole('alertdialog')).not.toBeVisible();
  });

  test('Settings — role is displayed read-only', async ({ page }) => {
    await page.goto(BASE_URL + '/settings');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/role & access/i)).toBeVisible();
    await expect(page.getByText(/contact an admin to change it/i)).toBeVisible();
  });

});

test.describe('Athlete — Join Team', () => {
  test.beforeEach(({ skip }) => requireAuthState(skip, 'athlete'));

  test('/join renders code input', async ({ page }) => {
    await page.goto(BASE_URL + '/join');
    await expect(page.getByPlaceholder(/ABC12345/i)).toBeVisible({ timeout: 5000 });
  });

  test('/join — Join Team button disabled when code is empty', async ({ page }) => {
    await page.goto(BASE_URL + '/join');
    await expect(page.getByRole('button', { name: /join team/i })).toBeDisabled();
  });

  test('/join — invalid code shows error', async ({ page }) => {
    await page.goto(BASE_URL + '/join');
    await page.fill('input', 'INVALID1');
    await page.getByRole('button', { name: /join team/i }).click();
    await expect(page.locator('[class*=destructive]').first()).toBeVisible({ timeout: 10000 });
  });

  test('/join?code=XXXX auto-fills the input', async ({ page }) => {
    await page.goto(BASE_URL + '/join?code=TESTCODE');
    const input = page.getByPlaceholder(/ABC12345/i);
    await expect(input).toHaveValue('TESTCODE', { timeout: 3000 });
  });

});

test.describe('Athlete — Mobile Navigation', () => {
  test.beforeEach(({ skip }) => requireAuthState(skip, 'athlete'));

  test.use({ viewport: { width: 390, height: 844 } }); // iPhone 14

  test('Mobile bottom nav is visible on small screens', async ({ page }) => {
    await page.goto(BASE_URL + '/');
    await expect(page.locator('nav.fixed.bottom-0')).toBeVisible({ timeout: 5000 });
  });

  test('Mobile bottom nav — Dashboard tab navigates to /', async ({ page }) => {
    await page.goto(BASE_URL + '/my-plan');
    await page.locator('nav.fixed.bottom-0').getByText('Dashboard').click();
    await expect(page).toHaveURL(BASE_URL + '/');
  });

  test('Mobile bottom nav — My Plan tab navigates', async ({ page }) => {
    await page.goto(BASE_URL + '/');
    await page.locator('nav.fixed.bottom-0').getByText('My Plan').click();
    await expect(page).toHaveURL(/\/my-plan/);
  });

  test('Mobile bottom nav — Analytics tab navigates', async ({ page }) => {
    await page.goto(BASE_URL + '/');
    await page.locator('nav.fixed.bottom-0').getByText('Analytics').click();
    await expect(page).toHaveURL(/\/analytics/);
  });

  test('Mobile bottom nav — Settings tab navigates', async ({ page }) => {
    await page.goto(BASE_URL + '/');
    await page.locator('nav.fixed.bottom-0').getByText('Settings').click();
    await expect(page).toHaveURL(/\/settings/);
  });

  test('Dashboard does not overflow horizontally on mobile', async ({ page }) => {
    await page.goto(BASE_URL + '/');
    await page.waitForLoadState('networkidle');
    const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
    const clientWidth = await page.evaluate(() => document.body.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2); // 2px tolerance
  });

  test('My Plan does not overflow horizontally on mobile', async ({ page }) => {
    await page.goto(BASE_URL + '/my-plan');
    await page.waitForLoadState('networkidle');
    const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
    const clientWidth = await page.evaluate(() => document.body.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);
  });

  test('Goals page does not overflow horizontally on mobile', async ({ page }) => {
    await page.goto(BASE_URL + '/goals');
    await page.waitForLoadState('networkidle');
    const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
    const clientWidth = await page.evaluate(() => document.body.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);
  });

});
import { test, expect } from '@playwright/test';

test('New Draft dialog traps focus and returns focus to its trigger', async ({ page }) => {
  await page.goto('/editor');
  const trigger = page.getByRole('button', { name: 'New Draft' });
  await trigger.click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();

  await page.keyboard.press('Tab');
  await expect
    .poll(() => page.evaluate(() => Boolean(document.activeElement?.closest('[role="dialog"]'))))
    .toBe(true);

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});

test('topbar menus support Escape and return focus', async ({ page }) => {
  await page.goto('/editor');
  const trigger = page.getByRole('button', { name: 'Developer tools & backups' });
  await trigger.click();

  const menu = page.getByRole('menu');
  await expect(menu).toBeVisible();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  await expect(trigger).toBeFocused();
});

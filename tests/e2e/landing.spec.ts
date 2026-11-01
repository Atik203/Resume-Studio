import { test, expect } from '@playwright/test';

test('public page scrolls and the theme toggle flips the theme', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  await page.evaluate(() => window.scrollTo(0, 1200));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(100);

  const wasDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
  await page.getByRole('button', { name: 'Toggle light and dark theme' }).click();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.classList.contains('dark')))
    .toBe(!wasDark);
});

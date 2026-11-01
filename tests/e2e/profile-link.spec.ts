import { test, expect } from '@playwright/test';

test('profile link editor rejects an invalid URL without crashing the app', async ({ page }) => {
  await page.goto('/editor');
  await page.getByRole('button', { name: 'Edit Details' }).click();

  const urlInput = page.getByLabel('Link URL').first();
  await urlInput.fill('https://');
  await urlInput.blur();

  await expect(page.getByText(/Use a full http\(s\) or mailto URL/)).toBeVisible();
  await expect(page.getByText('Project profile or content library is invalid')).toHaveCount(0);

  await urlInput.fill('https://example.org');
  await urlInput.blur();
  await expect(page.getByText(/Use a full http\(s\) or mailto URL/)).toBeHidden();
});

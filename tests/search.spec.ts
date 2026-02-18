import { test, expect } from './utils/test-utils';

test.describe('搜索功能', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.waitForSelector('#email');
    await page.fill('#email', 'jason0124@xjh.com');
    await page.fill('#password', 'jason4271735');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
  });

  test('搜索基金', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="搜索"]');
    await searchInput.fill('160724'); // 基金代码
    await searchInput.press('Enter');

    await expect(page.locator('text=160724')).toBeVisible();
  });

  test('搜索股票', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="搜索"]');
    await searchInput.fill('600000'); // 股票代码
    await searchInput.press('Enter');

    await expect(page.locator('text=600000')).toBeVisible();
  });
});

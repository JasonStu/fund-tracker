import { test, expect } from './utils/test-utils';

test.describe('搜索功能', () => {
  test.use({ storageState: undefined }); // 重置状态

  test('搜索基金', async ({ loggedInPage: page }) => {
    const searchInput = page.locator('input[placeholder*="搜索"]');
    await searchInput.fill('160724');
    await searchInput.press('Enter');

    // 等待搜索结果
    await page.waitForSelector('text=160724', { timeout: 10000 });
    await expect(page.locator('text=160724')).toBeVisible();
  });

  test('搜索股票', async ({ loggedInPage: page }) => {
    const searchInput = page.locator('input[placeholder*="搜索"]');
    await searchInput.fill('600000');
    await searchInput.press('Enter');

    // 等待搜索结果
    await page.waitForSelector('text=600000', { timeout: 10000 });
    await expect(page.locator('text=600000')).toBeVisible();
  });
});

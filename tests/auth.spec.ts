import { test, expect } from './utils/test-utils';

test.describe('认证', () => {
  test('管理员登录', async ({ page }) => {
    await page.goto('/login');
    await page.waitForSelector('#email');
    await page.fill('#email', 'jason0124@xjh.com');
    await page.fill('#password', 'jason4271735');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/');
    await expect(page.locator('text=仪表盘')).toBeVisible();
  });

  test('登出', async ({ page }) => {
    await page.goto('/login');
    await page.waitForSelector('#email');
    await page.fill('#email', 'jason0124@xjh.com');
    await page.fill('#password', 'jason4271735');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');

    await page.click('button:has-text("登出")');
    await expect(page).toHaveURL('/login');
  });
});

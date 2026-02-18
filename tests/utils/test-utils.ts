import { test as base } from '@playwright/test';

export const test = base.extend({
  // 登录状态
  loggedInPage: async ({ page }, use) => {
    const adminEmail = process.env.ADMIN_EMAIL || 'jason0124@xjh.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'jason4271735';

    await page.goto('/login');
    await page.fill('input[type="email"]', adminEmail);
    await page.fill('input[type="password"]', adminPassword);
    await page.click('button[type="submit"]');

    await page.waitForURL('/');
    await use(page);
  },
});

export { expect } from '@playwright/test';

import { test as base } from '@playwright/test';

export const test = base.extend({
  // 登录状态
  loggedInPage: async ({ page }, use) => {
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD environment variables are required');
    }

    await page.goto('/login');
    await page.waitForSelector('#email');
    await page.fill('#email', adminEmail);
    await page.fill('#password', adminPassword);
    await page.click('button[type="submit"]');

    await page.waitForURL('/');
    await page.waitForLoadState('networkidle');
    await use(page);
  },
});

export { expect } from '@playwright/test';

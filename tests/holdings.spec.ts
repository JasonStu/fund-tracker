import { test, expect } from './utils/test-utils';

test.describe('持仓管理', () => {
  test.use({ storageState: undefined });

  test('添加基金持仓', async ({ page }) => {
    // 登录
    await page.goto('/login');
    await page.waitForSelector('#email');
    await page.fill('#email', process.env.ADMIN_EMAIL || 'jason0124@xjh.com');
    await page.fill('#password', process.env.ADMIN_PASSWORD || 'jason4271735');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
    await page.waitForLoadState('networkidle');

    // 点击添加按钮
    const addButton = page.locator('button:has-text("添加持仓")').first();
    await addButton.click();

    // 搜索基金
    const searchInput = page.locator('input[placeholder*="搜索"]');
    await searchInput.fill('160724');

    // 等待搜索结果
    await page.waitForSelector('text=160724', { timeout: 10000 });

    // 填写份额
    const sharesInput = page.locator('input[name="shares"]');
    await sharesInput.fill('1000');

    // 提交
    const submitButton = page.locator('button:has-text("确定")');
    await submitButton.click();

    // 验证添加成功
    await expect(page.locator('text=160724')).toBeVisible();
  });

  test('删除持仓', async ({ page }) => {
    // 登录
    await page.goto('/login');
    await page.waitForSelector('#email');
    await page.fill('#email', process.env.ADMIN_EMAIL || 'jason0124@xjh.com');
    await page.fill('#password', process.env.ADMIN_PASSWORD || 'jason4271735');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
    await page.waitForLoadState('networkidle');

    // 删除
    const deleteButton = page.locator('button:has-text("删除")').first();
    await deleteButton.click();

    // 确认删除
    page.on('dialog', dialog => dialog.accept());
    await page.waitForTimeout(500);
  });
});

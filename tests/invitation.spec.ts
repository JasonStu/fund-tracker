import { test, expect } from './utils/test-utils';

test.describe('邀请码管理', () => {
  test.beforeEach(async ({ page }) => {
    // 登录
    await page.goto('/login');
    await page.waitForSelector('#email');
    await page.fill('#email', 'jason0124@xjh.com');
    await page.fill('#password', 'jason4271735');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
  });

  test('创建邀请码 - 自动生成', async ({ page }) => {
    await page.goto('/admin');

    // 清空邀请码输入框（自动生成）
    const codeInput = page.locator('#newCode');
    await codeInput.fill('');

    // 点击创建按钮
    const createButton = page.locator('button[type="submit"]');
    await createButton.click();

    // 等待邀请码创建成功，表格中出现新的邀请码
    const invitationCode = page.locator('table tbody tr:first-child code');
    await expect(invitationCode).toBeVisible();

    // 验证邀请码格式（8位大写字母数字）
    const codeText = await invitationCode.textContent();
    expect(codeText).toMatch(/^[A-Z0-9]{8}$/);
  });

  test('创建邀请码 - 自定义邀请码', async ({ page }) => {
    await page.goto('/admin');

    // 输入自定义邀请码
    const codeInput = page.locator('#newCode');
    await codeInput.fill('TEST1234');

    // 点击创建按钮
    const createButton = page.locator('button[type="submit"]');
    await createButton.click();

    // 验证自定义邀请码已创建
    const invitationCode = page.locator('table tbody tr:first-child code');
    await expect(invitationCode).toHaveText('TEST1234');
  });

  test('查看邀请码列表', async ({ page }) => {
    await page.goto('/admin');

    // 验证页面标题
    await expect(page.locator('h1:has-text("邀请码管理")')).toBeVisible();

    // 验证创建表单
    await expect(page.locator('#newCode')).toBeVisible();
    await expect(page.locator('#expiresAt')).toBeVisible();

    // 验证表格表头
    await expect(page.locator('th:has-text("邀请码")')).toBeVisible();
    await expect(page.locator('th:has-text("状态")')).toBeVisible();
  });

  test('删除邀请码', async ({ page }) => {
    await page.goto('/admin');

    // 先创建一个邀请码
    const codeInput = page.locator('#newCode');
    await codeInput.fill('DELTEST');
    await page.locator('button[type="submit"]').click();

    // 等待邀请码出现在列表中
    const invitationCode = page.locator('table tbody tr:first-child code');
    await expect(invitationCode).toHaveText('DELTEST');

    // 获取删除前的邀请码数量
    const rowsBefore = await page.locator('table tbody tr').count();

    // 点击删除按钮（第一个删除按钮）
    page.on('dialog', dialog => dialog.accept()); // 确认删除对话框
    await page.locator('table tbody tr:first-child button:has-text("删除")').click();

    // 验证邀请码已被删除（列表中不再显示该邀请码）
    await expect(page.locator('code:has-text("DELTEST")')).not.toBeVisible();
  });
});

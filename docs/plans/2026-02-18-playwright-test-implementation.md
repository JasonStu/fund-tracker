# Playwright 自动化测试实现计划

> **For Claude:** 使用 superpowers:subagent-driven-development 执行实现计划

**Goal:** 配置 Playwright 自动化测试框架，覆盖邀请码、认证、搜索、持仓等核心功能

**Tech Stack:** Playwright, TypeScript, Vercel 生产环境

---

## 实现步骤

### Task 1: 创建 Playwright 配置文件

**Files:**
- Create: `playwright.config.ts`

**Step 1: 创建配置文件**

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: process.env.TEST_URL || 'https://fund-tracker.vercel.app',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
```

**Step 2: 创建环境变量文件**

- Create: `.env.test`

```
TEST_URL=https://fund-tracker.vercel.app
ADMIN_EMAIL=jason0124@xjh.com
ADMIN_PASSWORD=jason4271735
```

**Step 3: 添加测试脚本到 package.json**

```json
"test": "playwright test",
"test:ui": "playwright test --ui",
"test:report": "playwright show-report"
```

**Step 4: Commit**

```bash
git add playwright.config.ts .env.test package.json
git commit -m "test: 添加Playwright配置"
```

---

### Task 2: 创建测试辅助函数

**Files:**
- Create: `tests/utils/test-utils.ts`

**Step 1: 创建辅助函数**

```typescript
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
```

**Step 2: Commit**

```bash
git add tests/utils/test-utils.ts
git commit -m "test: 添加测试辅助函数"
```

---

### Task 3: 创建认证测试

**Files:**
- Create: `tests/auth.spec.ts`

**Step 1: 创建登录测试**

```typescript
import { test, expect } from './utils/test-utils';

test.describe('认证', () => {
  test('管理员登录', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'jason0124@xjh.com');
    await page.fill('input[type="password"]', 'jason4271735');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/');
    await expect(page.locator('text=仪表盘')).toBeVisible();
  });

  test('登出', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'jason0124@xjh.com');
    await page.fill('input[type="password"]', 'jason4271735');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');

    await page.click('button:has-text("登出")');
    await expect(page).toHaveURL('/login');
  });
});
```

**Step 2: Commit**

```bash
git add tests/auth.spec.ts
git commit -m "test: 添加认证测试"
```

---

### Task 4: 创建邀请码测试

**Files:**
- Create: `tests/invitation.spec.ts`

**Step 1: 创建邀请码测试**

```typescript
import { test, expect } from './utils/test-utils';

test.describe('邀请码管理', () => {
  test.beforeEach(async ({ page }) => {
    // 登录
    await page.goto('/login');
    await page.fill('input[type="email"]', 'jason0124@xjh.com');
    await page.fill('input[type="password"]', 'jason4271735');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
  });

  test('创建邀请码 - 自动生成', async ({ page }) => {
    await page.goto('/admin');

    // 点击创建按钮（假设有创建表单）
    const codeInput = page.locator('input[placeholder*="邀请码"]');
    await codeInput.fill(''); // 空输入

    const createButton = page.locator('button:has-text("创建")');
    await createButton.click();

    // 验证邀请码已创建（自动生成8位码）
    await expect(page.locator('text=/[A-Z0-9]{8}/')).toBeVisible();
  });

  test('查看邀请码列表', async ({ page }) => {
    await page.goto('/admin');
    await expect(page.locator('text=邀请码')).toBeVisible();
  });
});
```

**Step 2: Commit**

```bash
git add tests/invitation.spec.ts
git commit -m "test: 添加邀请码测试"
```

---

### Task 5: 创建搜索测试

**Files:**
- Create: `tests/search.spec.ts`

**Step 1: 创建搜索测试**

```typescript
import { test, expect } from './utils/test-utils';

test.describe('搜索功能', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'jason0124@xjh.com');
    await page.fill('input[type="password"]', 'jason4271735');
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
```

**Step 2: Commit**

```bash
git add tests/search.spec.ts
git commit -m "test: 添加搜索测试"
```

---

### Task 6: 创建持仓测试

**Files:**
- Create: `tests/holdings.spec.ts`

**Step 1: 创建持仓测试**

```typescript
import { test, expect } from './utils/test-utils';

test.describe('持仓管理', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'jason0124@xjh.com');
    await page.fill('input[type="password"]', 'jason4271735');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
  });

  test('添加基金持仓', async ({ page }) => {
    // 点击添加按钮
    const addButton = page.locator('button:has-text("添加持仓")').first();
    await addButton.click();

    // 搜索基金
    const searchInput = page.locator('input[placeholder*="搜索"]');
    await searchInput.fill('160724');

    // 填写份额
    await page.fill('input[name="shares"]', '1000');

    // 提交
    await page.click('button:has-text("确定")');

    // 验证添加成功
    await expect(page.locator('text=160724')).toBeVisible();
  });

  test('删除持仓', async ({ page }) => {
    // 先添加一个测试持仓
    await test.step('添加测试持仓', async () => {
      const addButton = page.locator('button:has-text("添加持仓")').first();
      await addButton.click();
      await page.fill('input[placeholder*="搜索"]', '160724');
      await page.fill('input[name="shares"]', '100');
      await page.click('button:has-text("确定")');
    });

    // 删除
    const deleteButton = page.locator('button:has-text("删除")').first();
    await deleteButton.click();

    // 确认删除
    await page.click('button:has-text("确认")');
  });
});
```

**Step 2: Commit**

```bash
git add tests/holdings.spec.ts
git commit -m "test: 添加持仓测试"
```

---

### Task 7: 运行测试验证

**Step 1: 运行测试**

```bash
npm run test
```

**Step 2: 如果失败，修复问题后重新运行**

**Step 3: Commit**

```bash
git commit -m "test: 完成所有测试用例"
```

---

## 测试账号

| 账号 | 密码 | 用途 |
|-----|------|------|
| jason0124@xjh.com | jason4271735 | 管理员测试 |

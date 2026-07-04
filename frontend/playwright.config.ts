import { defineConfig, devices } from '@playwright/test'

// Vite 默认仅绑定 localhost（IPv6），用 localhost 而非 127.0.0.1
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5173'

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  outputDir: 'test-results',
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // 不强制注入 storageState：避免 setup 的登录态污染游客用例（如商品详情、首页）。
        // 需要登录的用例通过 fixtures/helpers.ts 的 loginViaUi 显式登录，保证用例自给自足、互不干扰。
        storageState: undefined,
      },
      // 不依赖 setup：setup 仅作可选工具保留（如未来需要共享 storageState 再启用）
    },
  ],
})

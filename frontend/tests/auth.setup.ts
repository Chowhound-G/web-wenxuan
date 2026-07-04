/**
 * 全局登录 Setup（playwright.config.ts 的 setup 项目引用）
 * --------------------------------------------------
 * 在所有 chromium 项目用例前执行一次，登录普通用户并把 storageState 持久化到
 * tests/.auth/user.json，供依赖 storageState 的用例复用（避免重复登录）。
 *
 * 若后端未启动或登录失败，会跳过不阻塞；此时基于 fixtures/helpers.ts 的
 * loginViaUi 的用例会自行登录，仍可运行。
 */
import { test as setup, expect } from '@playwright/test'
import { testConfig } from './config/test.config'

const authFile = 'tests/.auth/user.json'

setup('create authenticated storage state', async ({ page }) => {
  await page.goto(testConfig.routes.login)
  await page.getByRole('tab', { name: '密码登录' }).click()
  await page.getByPlaceholder('请输入手机号或邮箱').fill(testConfig.users.normal.account)
  await page.getByPlaceholder('请输入密码（至少 6 位）').fill(testConfig.users.normal.password)
  await page.getByRole('button', { name: '登录' }).click()

  try {
    await expect(page).not.toHaveURL(/\/login/, { timeout: 8000 })
    await page.context().storageState({ path: authFile })
  } catch {
    setup.skip(true, '后端不可用或登录失败，跳过 storageState 保存')
  }
})

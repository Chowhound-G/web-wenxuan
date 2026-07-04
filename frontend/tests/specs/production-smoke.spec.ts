import { expect, test } from '@playwright/test'

test.describe('生产环境 Smoke', () => {
  test('首页可访问并展示商品入口', async ({ page }) => {
    const response = await page.goto('/', { waitUntil: 'domcontentloaded' })
    expect(response?.ok()).toBeTruthy()

    await expect(page.getByRole('heading', { name: '精选好物，一站购齐' })).toBeVisible()
    await expect(page.getByRole('searchbox', { name: '搜索' })).toBeVisible()
    await expect(page.locator('article.card').first()).toBeVisible()
  })

  test('游客打开商品详情不会被登录页拦截', async ({ page }) => {
    const response = await page.goto('/products/1', { waitUntil: 'domcontentloaded' })
    expect(response?.ok()).toBeTruthy()

    await expect(page).not.toHaveURL(/\/login/)
    await expect(page.locator('.priceMain')).toBeVisible()
    await expect(page.getByRole('heading', { name: '商品评价' })).toBeVisible()
  })
})

import type { Page, Route, TestInfo } from '@playwright/test'
import { expect, test } from '@playwright/test'

const productImages = [
  'https://images.pexels.com/photos/1092644/pexels-photo-1092644.jpeg?auto=compress&cs=tinysrgb&w=1200',
  'https://images.pexels.com/photos/18105/pexels-photo.jpg?auto=compress&cs=tinysrgb&w=1200',
  'https://images.pexels.com/photos/3394664/pexels-photo-3394664.jpeg?auto=compress&cs=tinysrgb&w=1200',
  'https://images.pexels.com/photos/3964739/pexels-photo-3964739.jpeg?auto=compress&cs=tinysrgb&w=1200',
  'https://images.pexels.com/photos/3734881/pexels-photo-3734881.jpeg?auto=compress&cs=tinysrgb&w=1200',
  'https://images.pexels.com/photos/841130/pexels-photo-841130.jpeg?auto=compress&cs=tinysrgb&w=1200',
]

const products = Array.from({ length: 12 }, (_, index) => ({
  id: index + 1,
  name:
    [
      'iPhone 15 Pro 128G',
      'MacBook Air 13 M3',
      '索尼 WH-1000XM5',
      '美的 风冷冰箱',
      '温和保湿洁面乳',
      '减震跑步鞋',
      'ThinkPad X1 Carbon',
      'AirPods Pro 2',
      '石头 扫拖机器人',
      '每日坚果 750g',
      'Keychron K2 键盘',
      'Apple Watch SE',
    ][index] ?? `精选商品 ${index + 1}`,
  description: 'Allure 响应式 smoke 数据',
  tags: JSON.stringify(['精选', '现货']),
  rating: 4.6,
  sold: 120 + index * 19,
  price: 299 + index * 420,
  originalPrice: 399 + index * 420,
  stock: 80,
  image: productImages[index % productImages.length],
  skus: [{ id: index + 1, attrs: { 规格: '默认' }, price: 299 + index * 420, stock: 80 }],
}))

const fulfillJson = (route: Route, data: unknown) =>
  route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(data),
  })

const routeMockApis = async (page: Page) => {
  await page.route('**/api/v1/products?page=1&size=12', (route) => fulfillJson(route, { code: 200, data: products }))
  await page.route('**/api/v1/products/1', (route) => fulfillJson(route, { code: 200, data: products[0] }))
  await page.route('**/api/v1/reviews**', (route) => fulfillJson(route, { code: 200, data: [] }))
  await page.route('**/api/v1/cart**', (route) => fulfillJson(route, { code: 200, data: [] }))
}

const screenshotName = (name: string) => name.replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '')

const stepWithScreenshot = async (
  page: Page,
  testInfo: TestInfo,
  name: string,
  action: () => Promise<void>,
) => {
  await test.step(name, async () => {
    try {
      await action()
    } finally {
      await testInfo.attach(`${screenshotName(name)}.png`, {
        body: await page.screenshot({ fullPage: true }),
        contentType: 'image/png',
      })
    }
  })
}

test.describe('响应式与核心购物体验 @allure', () => {
  test('桌面端首页展示现代化首屏和商品网格', async ({ page }, testInfo) => {
    await stepWithScreenshot(page, testInfo, '设置桌面端视口', async () => {
      await page.setViewportSize({ width: 1440, height: 960 })
    })

    await stepWithScreenshot(page, testInfo, '模拟商品接口', async () => {
      await routeMockApis(page)
    })

    await stepWithScreenshot(page, testInfo, '打开商城首页', async () => {
      await page.goto('/')
    })

    await stepWithScreenshot(page, testInfo, '验证桌面首屏标题', async () => {
      await expect(page.getByRole('heading', { name: '精选好物，一站购齐' })).toBeVisible()
    })

    await stepWithScreenshot(page, testInfo, '验证搜索和分类入口', async () => {
      await expect(page.getByRole('searchbox', { name: '搜索' })).toBeVisible()
      await expect(page.locator('.categoryRail .railItem')).toHaveCount(8)
    })

    await stepWithScreenshot(page, testInfo, '验证桌面商品网格和登录入口', async () => {
      await expect(page.locator('article.card')).toHaveCount(12)
      await expect(page.locator('.topActions .primary')).toContainText('登录')
    })
  })

  test('手机端首页保持两列商品布局', async ({ page }, testInfo) => {
    await stepWithScreenshot(page, testInfo, '设置手机端视口', async () => {
      await page.setViewportSize({ width: 390, height: 844 })
    })

    await stepWithScreenshot(page, testInfo, '模拟移动端商品接口', async () => {
      await routeMockApis(page)
    })

    await stepWithScreenshot(page, testInfo, '打开移动端首页', async () => {
      await page.goto('/')
    })

    await stepWithScreenshot(page, testInfo, '验证移动端首屏标题', async () => {
      await expect(page.getByRole('heading', { name: '精选好物，一站购齐' })).toBeVisible()
    })

    await stepWithScreenshot(page, testInfo, '验证移动端分类和商品卡片', async () => {
      await expect(page.locator('.cat')).toHaveCount(8)
      await expect(page.locator('article.card').first()).toBeVisible()
    })

    await stepWithScreenshot(page, testInfo, '验证移动端客服入口状态', async () => {
      await expect(page.getByRole('button', { name: '打开在线客服' })).toHaveCount(0)
    })
  })

  test('商品详情页显示购买动作和评价区域', async ({ page }, testInfo) => {
    await stepWithScreenshot(page, testInfo, '设置商品详情桌面视口', async () => {
      await page.setViewportSize({ width: 1366, height: 900 })
    })

    await stepWithScreenshot(page, testInfo, '模拟商品详情接口', async () => {
      await routeMockApis(page)
    })

    await stepWithScreenshot(page, testInfo, '打开商品详情页', async () => {
      await page.goto('/products/1')
    })

    await stepWithScreenshot(page, testInfo, '验证商品基础信息', async () => {
      await expect(page.locator('.h1')).toContainText('iPhone 15 Pro')
      await expect(page.locator('.priceMain')).toBeVisible()
    })

    await stepWithScreenshot(page, testInfo, '验证购买动作按钮', async () => {
      await expect(page.locator('.btnAdd')).toBeVisible()
      await expect(page.locator('.btnBuy')).toBeVisible()
    })

    await stepWithScreenshot(page, testInfo, '验证商品评价区域', async () => {
      await expect(page.getByRole('heading', { name: '商品评价' })).toBeVisible()
    })
  })
})

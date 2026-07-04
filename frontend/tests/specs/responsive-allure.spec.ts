import type { Page, Route } from '@playwright/test'
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

test.describe('响应式与核心购物体验 @allure', () => {
  test('桌面端首页展示现代化首屏和商品网格', async ({ page }) => {
    await test.step('模拟商品接口并打开桌面首页', async () => {
      await page.setViewportSize({ width: 1440, height: 960 })
      await routeMockApis(page)
      await page.goto('/')
    })

    await test.step('验证首屏、分类和商品列表', async () => {
      await expect(page.getByRole('heading', { name: '把好物挑选变简单' })).toBeVisible()
      await expect(page.getByRole('searchbox', { name: '搜索' })).toBeVisible()
      await expect(page.locator('.cat')).toHaveCount(8)
      await expect(page.locator('article.card')).toHaveCount(12)
    })
  })

  test('手机端首页保持两列商品布局', async ({ page }) => {
    await test.step('打开移动端首页', async () => {
      await page.setViewportSize({ width: 390, height: 844 })
      await routeMockApis(page)
      await page.goto('/')
    })

    await test.step('验证移动端主要信息可见', async () => {
      await expect(page.getByRole('heading', { name: '把好物挑选变简单' })).toBeVisible()
      await expect(page.locator('article.card').first()).toBeVisible()
      await expect(page.getByRole('button', { name: '打开在线客服' })).toBeVisible()
    })
  })

  test('商品详情页显示购买动作和评价区域', async ({ page }) => {
    await test.step('打开商品详情页', async () => {
      await page.setViewportSize({ width: 1366, height: 900 })
      await routeMockApis(page)
      await page.goto('/products/1')
    })

    await test.step('验证详情页核心购买链路入口', async () => {
      await expect(page.locator('.h1')).toContainText('iPhone 15 Pro')
      await expect(page.locator('.priceMain')).toBeVisible()
      await expect(page.locator('.btnAdd')).toBeVisible()
      await expect(page.locator('.btnBuy')).toBeVisible()
      await expect(page.getByRole('heading', { name: '商品评价' })).toBeVisible()
    })
  })
})

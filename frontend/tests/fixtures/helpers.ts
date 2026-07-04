/**
 * 测试辅助层
 * --------------------------------------------------
 * 提供跨用例复用的能力：
 *   - loginViaUi / loginViaApi / restoreAuth : 三种登录方式
 *   - API 数据准备（addProductToCart 等）
 *   - 清理 localStorage（保证用例隔离）
 *   - 通用断言工具
 */
import { test as base, expect, type APIRequestContext, type Page } from '@playwright/test'
import { testConfig } from '../config/test.config'

/**
 * 清空所有持久化状态，保证用例隔离（重点清 auth/cart/orders 等）。
 * 注意：用一次性 clear（goto + localStorage.clear）而非 addInitScript——
 * addInitScript 会在每次导航都执行，会清掉用例中途登录写入的 token，导致登录态丢失。
 */
export async function resetStorage(page: Page) {
  await page.goto(testConfig.routes.home)
  await page.evaluate((keys) => keys.forEach((k) => window.localStorage.removeItem(k)), Object.values(testConfig.storageKeys))
}

/** 通过 UI 完成普通用户登录（密码模式） */
export async function loginViaUi(
  page: Page,
  account: string = testConfig.users.normal.account,
  password: string = testConfig.users.normal.password,
) {
  await page.goto(testConfig.routes.login)
  // 默认即"密码登录" tab，确保切换
  await page.getByRole('tab', { name: '密码登录' }).click()
  await page.getByPlaceholder('请输入手机号或邮箱').fill(account)
  await page.getByPlaceholder('请输入密码（至少 6 位）').fill(password)
  await page.getByRole('button', { name: '登录' }).click()
  // 等待跳转离开 /login
  await expect(page).not.toHaveURL(/\/login/)
}

/** 通过 API 登录，返回 token（用于 API 测试 / 联合测试的数据准备） */
export async function loginViaApi(
  request: APIRequestContext,
  account: string = testConfig.users.normal.account,
  password: string = testConfig.users.normal.password,
): Promise<string> {
  const res = await request.post(`${testConfig.apiBase}${testConfig.endpoints.auth.login}`, {
    data: { account, password },
  })
  // 兼容后端可能未启或账号未注册的情况：返回体里取 token
  const body = await res.json().catch(() => ({}))
  const token = body?.data?.token ?? body?.token
  if (!token) throw new Error(`API 登录未返回 token，HTTP ${res.status()}，body=${JSON.stringify(body)}`)
  return token as string
}

/** 通过 UI 登录管理员后台 */
export async function loginAdminViaUi(
  page: Page,
  account: string = testConfig.users.admin.account,
  password: string = testConfig.users.admin.password,
) {
  await page.goto(testConfig.routes.adminLogin)
  await page.getByPlaceholder('默认 admin').fill(account)
  await page.getByPlaceholder('默认 123456').fill(password)
  await page.getByRole('button', { name: '进入管理后台' }).click()
  await expect(page).toHaveURL(/\/admin\/kb/)
}

/**
 * 导航到商品详情页，并等待商品接口返回，确保页面完全加载。
 * 解决 Vue Router 异步加载组件 + 商品接口请求导致的偶发"元素未就绪"问题。
 *
 * 注意：详情页会并发请求 reviews 接口，而当前后端对 /v1/reviews 要求登录（游客访问返回 401），
 * 该 401 会触发全局 app:unauthorized → 跳转 /login，导致详情页无法渲染。
 * 这是后端的真实问题（商品评价本应游客可见），但为不阻塞详情页主流程测试，
 * 这里 mock reviews 接口返回空成功响应。若未来后端修复，可移除此 mock。
 */
export async function gotoProductDetail(page: Page, productId: string | number = testConfig.data.productId) {
  // mock reviews 接口，避免 401 触发全局跳转
  await page.route('**/v1/reviews*', (r) =>
    r.fulfill({ status: 200, contentType: 'application/json', body: '{"code":200,"data":[]}' }),
  )
  const productReq = page.waitForResponse(
    (r) => r.url().includes(`/v1/products/${productId}`) && r.request().method() === 'GET',
  )
  await page.goto(testConfig.routes.productDetail(productId))
  await productReq.catch(() => null)
  await expect(page.locator('h1.h1')).toBeVisible({ timeout: 10000 })
}

/** 通过 API 把商品加入购物车（数据准备用，比 UI 快） */
export async function addProductToCartApi(
  request: APIRequestContext,
  token: string,
  productId: string | number = testConfig.data.productId,
  skuId: string | number = '1',
  quantity = 1,
) {
  return request.post(`${testConfig.apiBase}${testConfig.endpoints.cart}/items`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { productId, skuId, quantity },
  })
}

/** 通过 UI 把商品加入购物车（详情页路径，用于联合测试） */
export async function addProductToCartUi(
  page: Page,
  productId: string | number = testConfig.data.productId,
) {
  await page.goto(testConfig.routes.productDetail(productId))
  // 选中第一个可选规格（带库存）
  const sku = page.locator('.skuBtn').first()
  await expect(sku).toBeVisible()
  await sku.click()
  await page.getByRole('button', { name: '加入购物车' }).click()
  await expect(page.getByText('已加入购物车')).toBeVisible()
}

/** 自动接受 window.confirm（退出登录/取消订单/删除文档等场景） */
export function autoAcceptConfirms(page: Page) {
  page.on('dialog', async (d) => {
    if (d.type() === 'confirm') await d.accept()
    else await d.accept()
  })
}

/**
 * 扩展 test fixture：每个用例自动重置 storage。
 * 用 `import { test, expect } from '../fixtures/helpers'` 引入。
 */
export const test = base.extend<{ cleanPage: Page }>({
  cleanPage: async ({ page }, use) => {
    await resetStorage(page)
    await use(page)
  },
})

export { expect }

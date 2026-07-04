/**
 * 模块 3/4/5：购物车 / 结算下单 / 收银台支付 测试
 * 对应文档：第六、七、八节 TC-CART / TC-CHK / TC-PAY
 */
import { test, expect, loginViaUi, autoAcceptConfirms, gotoProductDetail } from '../fixtures/helpers'
import { testConfig } from '../config/test.config'

test.describe('购物车模块 @TC-CART', () => {
  test('TC-CART-002 正向：空购物车空态', async ({ cleanPage: page }) => {
    await page.goto(testConfig.routes.cart)
    await expect(page.getByText('购物车空空如也')).toBeVisible()
  })

  test('TC-CART-001/003/005 正向：购物车展示/改数量/移除（联合）', async ({ cleanPage: page }) => {
    // 注入本地购物车数据（避开服务端 cart 状态的不确定性，保证用例稳定可复现）
    await page.goto(testConfig.routes.home)
    await page.evaluate((cartKey) => {
      window.localStorage.setItem(
        cartKey,
        JSON.stringify({
          v: 1,
          items: [
            { itemId: 't1', productId: '1', skuId: '1', title: '测试商品A', price: 99, qty: 2, cover: '' },
          ],
        }),
      )
    }, testConfig.storageKeys.cart)
    // mock 服务端 cart 接口，避免同步覆盖本地数据
    await page.route('**/v1/cart', (r) =>
      r.fulfill({ status: 200, contentType: 'application/json', body: '{"code":200,"data":[]}' }),
    )

    await page.goto(testConfig.routes.cart)
    // 展示：商品行可见
    await expect(page.locator('article.item').first()).toBeVisible()
    await expect(page.locator('.name').first()).toContainText('测试商品A')
    // 合计：共 2 件
    await expect(page.locator('.totalMeta')).toContainText(/2/)

    // 增加数量
    await page.getByRole('button', { name: '增加数量' }).first().click()
    await expect(page.locator('.qtyVal').first()).toContainText('3')

    // 移除
    await page.getByRole('button', { name: '移除' }).first().click()
    await expect(page.getByText('购物车空空如也')).toBeVisible()
  })

  test('TC-CART-004 边界：数量减到 1 后再减保持 1', async ({ cleanPage: page }) => {
    // 源码：购物车数量按钮无 disabled 逻辑，dec 用 Math.max(1, qty-1) 兜底。
    // 故 qty=1 时点"减少"，数量保持 1（与详情页 disabled 行为不同）。
    await gotoProductDetail(page)
    const addBtn = page.getByRole('button', { name: '加入购物车' })
    test.skip(!(await addBtn.isEnabled()), '加入购物车按钮不可用，跳过')
    await addBtn.click()
    await page.goto(testConfig.routes.cart)
    // 默认 qty=1，点减少后仍为 1
    await expect(page.locator('.qtyVal').first()).toContainText('1')
    await page.getByRole('button', { name: '减少数量' }).first().click()
    await expect(page.locator('.qtyVal').first()).toContainText('1')
  })
})

test.describe('结算下单 @TC-CHK', () => {
  test('TC-CHK-002 正向：空购物车结算空态', async ({ cleanPage: page }) => {
    // 未登录会被拦截，先登录
    await loginViaUi(page)
    await page.goto(testConfig.routes.checkout)
    await expect(page.getByText('购物车空空如也')).toBeVisible()
  })

  test('TC-CHK-010 安全：结算接口需鉴权（API）', async ({ request }) => {
    const res = await request.post(`${testConfig.apiBase}${testConfig.endpoints.orderCheckout}`, {
      data: { addressId: 0, couponCode: '' },
    })
    expect([401, 403, 400]).toContain(res.status())
  })

  test('TC-CHK-005 逆向：发票选企业但未填抬头时不可提交', async ({ cleanPage: page }) => {
    // 源码：地址默认选中 addr_1，"未选地址"在 UI 无法触发（无取消地址入口）。
    // 改测 canSubmit 的另一条：发票选企业但未填抬头 → 按钮 disabled + 文案"请填写发票抬头"。
    await loginViaUi(page)
    await page.evaluate((cartKey) => {
      window.localStorage.setItem(
        cartKey,
        JSON.stringify({
          v: 1,
          items: [
            { itemId: '1', productId: '1', skuId: '1', title: '测试商品', price: 99, qty: 1, cover: '' },
          ],
        }),
      )
    }, testConfig.storageKeys.cart)
    await page.goto(testConfig.routes.checkout)
    // 选择"企业"发票 radio（value=company），但不填抬头
    await page.locator('input[type=radio][value=company]').check()
    const btn = page.locator('.payBtn')
    // 按钮文案变为"请填写发票抬头"且 disabled（canSubmit 返回 false）
    await expect(btn).toContainText('请填写发票抬头')
    await expect(btn).toBeDisabled()
  })
})

test.describe('收银台/支付 @TC-PAY', () => {
  test('TC-PAY-004 逆向：orderId 缺失提示', async ({ cleanPage: page }) => {
    await loginViaUi(page)
    await page.goto(testConfig.routes.cashier) // 无 orderId query
    // canShow=false → UiEmptyState title="订单信息缺失"（UiEmptyState 把 title 渲染在 .title 元素）
    await expect(page.locator('.title').filter({ hasText: '订单信息缺失' })).toBeVisible()
  })

  test('TC-PAY-007 异常：支付失败可重试（联合）', async ({ cleanPage: page }) => {
    await loginViaUi(page)
    // 注入一个待支付订单草稿
    await page.evaluate((key) => {
      window.localStorage.setItem(
        key,
        JSON.stringify({
          id: '1',
          paymentStatus: 'INIT',
          payable: 99,
          items: [{ productId: '1', title: '测试', qty: 1, price: 99 }],
        }),
      )
    }, testConfig.storageKeys.orderDraft)

    // mock 支付接口返回 FAILED；同时 mock order/status 接口避免 401 干扰
    await page.route('**/v1/payments/*/pay', (r) =>
      r.fulfill({ status: 200, contentType: 'application/json', body: '{"code":200,"data":{"status":"FAILED"}}' }),
    )
    await page.route('**/v1/payments/*/status', (r) =>
      r.fulfill({ status: 200, contentType: 'application/json', body: '{"code":200,"data":{"status":"FAILED"}}' }),
    )
    await page.route('**/v1/orders/*', (r) =>
      r.fulfill({
        status: 200,
        contentType: 'application/json',
        body: '{"code":200,"data":{"id":1,"status":"Created","payAmount":99}}',
      }),
    )
    await page.goto(`${testConfig.routes.payResult}?orderId=1&channel=alipay&autoPay=1`)
    // FAILED 状态：badge.danger"支付失败" + "重试支付"按钮
    await expect(page.getByText('支付失败').or(page.getByRole('button', { name: '重试支付' }))).toBeVisible({
      timeout: 10000,
    })
  })
})

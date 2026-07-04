/**
 * 模块 9/10/13：收藏 / 消息 / 个人中心 + 跨模块通用 测试
 * 对应文档：第十二、十三、十六节 TC-FAV / TC-MSG / TC-GEN
 */
import { test, expect, loginViaUi, autoAcceptConfirms } from '../fixtures/helpers'
import { testConfig } from '../config/test.config'

test.describe('收藏模块 @TC-FAV', () => {
  test('TC-FAV-007 权限：未登录访问收藏跳登录', async ({ cleanPage: page }) => {
    await page.goto(testConfig.routes.favorites)
    await expect(page).toHaveURL(/\/login/)
    await expect(page.getByText('请先登录后再进行操作')).toBeVisible()
  })

  test('TC-FAV-001 正向：收藏列表加载（联合）', async ({ cleanPage: page }) => {
    await loginViaUi(page)
    const req = page.waitForResponse((r) => r.url().includes('/v1/favorites'))
    await page.goto(testConfig.routes.favorites)
    await req
    await expect(page.locator('.card').first().or(page.getByText('暂无收藏'))).toBeVisible()
  })

  test('TC-FAV-002 正向：空收藏空态', async ({ cleanPage: page }) => {
    await loginViaUi(page)
    await page.route('**/v1/favorites*', (r) =>
      r.fulfill({ status: 200, contentType: 'application/json', body: '{"code":200,"data":[]}' }),
    )
    await page.goto(testConfig.routes.favorites)
    await expect(page.getByText('暂无收藏')).toBeVisible()
  })
})

test.describe('消息中心 @TC-MSG', () => {
  test('TC-MSG-006 权限：未登录访问消息跳登录', async ({ cleanPage: page }) => {
    await page.goto(testConfig.routes.messages)
    await expect(page).toHaveURL(/\/login/)
  })

  test('TC-MSG-001 正向：消息列表加载（联合）', async ({ cleanPage: page }) => {
    await loginViaUi(page)
    const req = page.waitForResponse((r) => r.url().includes('/v1/notifications'))
    await page.goto(testConfig.routes.messages)
    await req
    await expect(page.locator('article.card').first().or(page.getByText('暂无消息'))).toBeVisible()
  })

  test('TC-MSG-005 逆向：空消息时全部已读禁用', async ({ cleanPage: page }) => {
    await loginViaUi(page)
    await page.route('**/v1/notifications*', (r) =>
      r.fulfill({ status: 200, contentType: 'application/json', body: '{"code":200,"data":[]}' }),
    )
    await page.goto(testConfig.routes.messages)
    await expect(page.getByRole('button', { name: '全部已读' })).toBeDisabled()
  })
})

test.describe('个人中心 @TC-ME', () => {
  test('未登录展示去登录入口', async ({ cleanPage: page }) => {
    await page.goto(testConfig.routes.me)
    // "未登录"在 badge 和用户名处都可能出现，用 .badge 精确定位避免 strict mode
    await expect(page.locator('.badge').filter({ hasText: '未登录' })).toBeVisible()
    await expect(page.getByRole('button', { name: '去登录' })).toBeVisible()
  })

  test('已登录显示钱包与入口', async ({ cleanPage: page }) => {
    await loginViaUi(page)
    await page.goto(testConfig.routes.me)
    await expect(page.getByText('已登录')).toBeVisible()
    await expect(page.getByRole('button', { name: '退出登录' })).toBeVisible()
  })
})

test.describe('跨模块通用 @TC-GEN', () => {
  test('TC-GEN-003 安全：输入框 XSS 不执行', async ({ cleanPage: page }) => {
    let alertFired = false
    page.on('dialog', () => (alertFired = true))
    await page.goto(testConfig.routes.login)
    await page.getByPlaceholder('请输入手机号或邮箱').fill('<script>alert(1)</script>')
    await page.getByPlaceholder('请输入手机号或邮箱').blur()
    // 校验失败提示，且无 alert 弹窗
    await expect(page.getByText('只能填写手机号或邮箱')).toBeVisible()
    expect(alertFired).toBeFalsy()
  })

  test('TC-GEN-006 安全：404 路由回首页', async ({ cleanPage: page }) => {
    await page.goto('/this-path-not-exist')
    await expect(page).toHaveURL(testConfig.routes.home)
  })

  test('TC-GEN-002 兼容：移动端视口布局', async ({ cleanPage: page, browser }) => {
    // 用移动端视口访问首页，验证不报错、有底部导航
    const ctx = await browser.newContext({
      viewport: { width: 375, height: 812 },
      isMobile: true,
    })
    const p = await ctx.newPage()
    await p.goto(testConfig.routes.home)
    await expect(p.getByRole('navigation', { name: '全局导航' })).toBeVisible()
    await p.close()
    await ctx.close()
  })

  test('TC-GEN-005 UI/UX：底部导航 5 入口', async ({ cleanPage: page }) => {
    await page.goto(testConfig.routes.home)
    const nav = page.getByRole('navigation', { name: '全局导航' })
    for (const name of ['首页', '类目', '搜索', '购物车', '我的']) {
      await expect(nav.getByText(name)).toBeVisible()
    }
  })
})

/**
 * 模块 2：商品（首页 / 类目 / 搜索 / 详情）测试
 * 对应文档：第五节 TC-PROD-001 ~ TC-PROD-020
 *
 * 选择器核准结论（源自码）：
 * - 首页搜索：原生 <input class="searchInput" type="search" placeholder="搜索商品、品牌、类目" aria-label="搜索">
 *   + <button class="searchBtn" type="submit">搜索</button>；注意 input 的 aria-label 也是"搜索"，
 *   故按钮定位需用 { name:'搜索', exact:true } 或 .searchBtn，避免误匹配 input。
 * - 类目页排序：原生 <button class="sortBtn">，选中只加 .on class（不禁用）；与类目 tab（UiButton 选中真 disabled）相反。
 * - 详情页：先等 .h1（商品名）可见即视为加载完成；规格 .skuBtn 点击同步更新库存；加载失败 panel 无重试按钮。
 * - 收藏按钮无文案，靠 aria-label="收藏"；未登录点收藏 → toast"请先登录" + 跳 /login（无 redirect 参数）。
 */
import { test, expect, gotoProductDetail } from '../fixtures/helpers'
import { testConfig } from '../config/test.config'

test.describe('商品模块 @TC-PROD', () => {
  test.describe('首页', () => {
    test('TC-PROD-001 正向：首页加载商品列表（联合）', async ({ cleanPage: page }) => {
      const productsReq = page.waitForResponse(
        (r) => r.url().includes('/v1/products') && r.request().method() === 'GET',
      )
      await page.goto(testConfig.routes.home)
      const res = await productsReq
      expect(res.status()).toBeLessThan(500)
      // 渲染商品卡（后端无数据时为空态，断言二者之一）
      const cards = page.locator('article.card')
      const empty = page.getByText('暂无推荐商品')
      await expect(cards.first().or(empty)).toBeVisible()
    })

    test('TC-PROD-002 正向：搜索框跳转搜索页', async ({ cleanPage: page }) => {
      await page.goto(testConfig.routes.home)
      await page.getByPlaceholder('搜索商品、品牌、类目').fill('手机')
      // 按钮用 exact 避开 input 的 aria-label="搜索"
      await page.getByRole('button', { name: '搜索', exact: true }).click()
      await expect(page).toHaveURL(/\/search/)
      // 中文关键词会被 URL 编码（手机 → %E6%89%8B%E6%9C%BA），断言 query 存在即可
      await expect(page).toHaveURL(/q=/)
    })

    test('TC-PROD-003 正向：类目快捷入口跳转', async ({ cleanPage: page }) => {
      await page.goto(testConfig.routes.home)
      await page.getByRole('button', { name: '手机' }).click()
      await expect(page).toHaveURL(/\/phone/)
    })

    test('TC-PROD-019 UI/UX：首页空推荐空态', async ({ cleanPage: page }) => {
      await page.route('**/v1/products*', (r) =>
        r.fulfill({ status: 200, contentType: 'application/json', body: '{"code":200,"data":[]}' }),
      )
      await page.goto(testConfig.routes.home)
      await expect(page.getByText('暂无推荐商品')).toBeVisible()
    })

    test('TC-PROD-018 异常：首页加载骨架屏', async ({ cleanPage: page }) => {
      // 慢响应期间应显示 skeleton
      await page.route('**/v1/products*', async (r) => {
        await new Promise((res) => setTimeout(res, 1500))
        await r.continue()
      })
      await page.goto(testConfig.routes.home)
      await expect(page.locator('.skeletonCard').first()).toBeVisible({ timeout: 3000 })
    })
  })

  test.describe('类目页', () => {
    test('TC-PROD-004 正向：类目页按品类筛选（联合）', async ({ cleanPage: page }) => {
      // 类目 tab 点击后 router.replace 到 /category?category=c_laptop（字符串 id，非数字）
      const catReq = page.waitForResponse((r) => r.url().includes('/v1/products'))
      await page.goto(testConfig.routes.category)
      await page.getByRole('button', { name: '电脑' }).click()
      await catReq
      await expect(page).toHaveURL(/category=c_laptop/)
    })

    test('TC-PROD-005 正向：类目页排序切换', async ({ cleanPage: page }) => {
      // 排序按钮选中只加 .on class，不禁用（与类目 tab 相反）
      await page.goto(testConfig.routes.category)
      const sortBtn = page.locator('.sortBtn', { hasText: '销量' })
      await sortBtn.click()
      await expect(sortBtn).toHaveClass(/on/)
    })
  })

  test.describe('搜索页', () => {
    test('TC-PROD-006 正向：搜索无结果空态（联合）', async ({ cleanPage: page }) => {
      await page.route('**/v1/products*', (r) =>
        r.fulfill({ status: 200, contentType: 'application/json', body: '{"code":200,"data":[]}' }),
      )
      await page.goto(`${testConfig.routes.search}?q=zzz不存在`)
      await expect(page.getByText('没有找到相关商品')).toBeVisible()
    })
  })

  test.describe('商品详情', () => {
    test('TC-PROD-007 正向：商品详情加载（联合）', async ({ cleanPage: page }) => {
      await gotoProductDetail(page)
      // .h1（商品名）可见即视为加载完成（gotoProductDetail 已等待）
      await expect(page.locator('.h1')).toBeVisible()
    })

    test('TC-PROD-008 逆向：商品 id 非数字显示不存在', async ({ cleanPage: page }) => {
      await page.goto(`${testConfig.routes.productDetail('abc')}`)
      await expect(page.getByText('商品不存在')).toBeVisible()
    })

    test('TC-PROD-009 正向：选择规格更新库存文案', async ({ cleanPage: page }) => {
      await gotoProductDetail(page)
      // 详情页加载后默认已选中一个有库存 sku；点一个未选中的规格按钮触发库存文案更新
      const skuBtns = page.locator('.skuBtn')
      const count = await skuBtns.count()
      test.skip(count === 0, '该商品无规格按钮')
      // 找一个未禁用、未选中的规格点
      const target = skuBtns.filter({ hasNot: page.locator('.on') }).first()
      if (await target.isVisible().catch(() => false)) {
        await target.click()
      }
      // 库存文案：库存 N / 无货 / 请选择规格 三者之一
      await expect(page.locator('.qtyStock')).toBeVisible()
    })

    test('TC-PROD-011 正向：加购成功（联合）', async ({ cleanPage: page }) => {
      await gotoProductDetail(page)
      // 默认已选中 sku，加入购物车按钮应可用
      const addBtn = page.getByRole('button', { name: '加入购物车' })
      await addBtn.waitFor({ state: 'visible' })
      test.skip(!(await addBtn.isEnabled()), '加入购物车按钮不可用（可能无库存 sku）')
      await addBtn.click()
      await expect(page.getByText('已加入购物车')).toBeVisible()
    })

    test('TC-PROD-013 正向：数量增减与上下限', async ({ cleanPage: page }) => {
      await gotoProductDetail(page)
      const addBtn = page.getByRole('button', { name: '加入购物车' })
      // 仅当默认选中了有库存 sku 时才有意义
      test.skip(!(await addBtn.isEnabled()), '无可用 sku，跳过数量测试')
      // 默认 qty=1，减少按钮应 disabled
      await expect(page.getByRole('button', { name: '减少数量' })).toBeDisabled()
      // 增加一次，数量值变为 2
      await page.getByRole('button', { name: '增加数量' }).click()
      await expect(page.locator('.qtyValue')).toContainText('2')
    })

    test('TC-PROD-014 权限：未登录收藏提示', async ({ cleanPage: page }) => {
      await gotoProductDetail(page)
      const favBtn = page.getByRole('button', { name: '收藏' })
      await favBtn.click()
      // toast"请先登录" + 跳 /login（无 redirect 参数，组件内手动跳转）
      await expect(page.getByText('请先登录')).toBeVisible()
      await expect(page).toHaveURL(/\/login$/)
    })

    test('TC-PROD-017 异常：商品接口 500 显示错误面板', async ({ cleanPage: page }) => {
      await page.route('**/v1/products/*', (r) => r.fulfill({ status: 500 }))
      await page.goto(testConfig.routes.productDetail())
      // 失败 panel：.panel[role=alert]，文案"加载失败"（无重试按钮）
      await expect(page.getByRole('alert')).toContainText('加载失败')
    })
  })
})

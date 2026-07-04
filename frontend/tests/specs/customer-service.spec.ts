/**
 * 模块 11：AI 客服（SSE 流式）测试
 * 对应文档：第十四节 TC-CS-001 ~ TC-CS-008
 */
import { test, expect } from '../fixtures/helpers'
import { testConfig } from '../config/test.config'

test.describe('AI 客服 @TC-CS', () => {
  test('TC-CS-001 正向：打开客服对话', async ({ cleanPage: page }) => {
    await page.goto(testConfig.routes.home)
    await page.getByRole('button', { name: '打开在线客服' }).click()
    await expect(page.getByRole('dialog', { name: '元气购在线客服' })).toBeVisible()
    await expect(page.locator('#customer-service-input')).toBeVisible()
  })

  test('TC-CS-003 正向：空输入不可发送', async ({ cleanPage: page }) => {
    await page.goto(testConfig.routes.home)
    await page.getByRole('button', { name: '打开在线客服' }).click()
    // 未输入时发送按钮 disabled
    await expect(page.locator('.chat-form button[type=submit]')).toBeDisabled()
  })

  test('TC-CS-004 正向：关闭客服', async ({ cleanPage: page }) => {
    await page.goto(testConfig.routes.home)
    await page.getByRole('button', { name: '打开在线客服' }).click()
    await page.getByRole('button', { name: '关闭在线客服' }).click()
    await expect(page.getByRole('dialog', { name: '元气购在线客服' })).toBeHidden()
  })

  test('TC-CS-002 正向：发送消息收到 SSE 流式回复（联合）', async ({ cleanPage: page }) => {
    // mock SSE 流：发送 status -> delta -> final
    const sseBody = [
      `data:{"type":"status","message":"正在查询..."}\n\n`,
      `data:{"type":"delta","text":"退款"}\n\n`,
      `data:{"type":"delta","text":"请联系客服"}\n\n`,
      `data:{"type":"final","reply":{"answer":"退款请联系客服","confidence":0.9,"citations":[],"actions":[],"hitLogs":[],"fallbackReason":null}}\n\n`,
    ].join('')
    await page.route('**/v1/customer-service/chat/stream', (r) =>
      r.fulfill({ status: 200, contentType: 'text/event-stream', body: sseBody }),
    )

    await page.goto(testConfig.routes.home)
    await page.getByRole('button', { name: '打开在线客服' }).click()
    await page.locator('#customer-service-input').fill('怎么退款')
    await page.locator('.chat-form button[type=submit]').click()
    // 最终应出现回复文本
    await expect(page.locator('.message.assistant').filter({ hasText: '退款' })).toBeVisible({
      timeout: 8000,
    })
  })

  test('TC-CS-005 异常：SSE 失败降级 HTTP（联合）', async ({ cleanPage: page }) => {
    await page.route('**/v1/customer-service/chat/stream', (r) => r.fulfill({ status: 500 }))
    await page.route('**/v1/customer-service/chat', (r) =>
      r.fulfill({
        status: 200,
        contentType: 'application/json',
        body: '{"code":200,"data":{"answer":"降级回复"}}',
      }),
    )

    await page.goto(testConfig.routes.home)
    await page.getByRole('button', { name: '打开在线客服' }).click()
    await page.locator('#customer-service-input').fill('你好')
    await page.locator('.chat-form button[type=submit]').click()
    await expect(page.locator('.message.assistant').filter({ hasText: '降级回复' })).toBeVisible({
      timeout: 8000,
    })
  })

  test('TC-CS-007 安全：回复含 script 不执行（XSS）', async ({ cleanPage: page }) => {
    let alertFired = false
    page.on('dialog', () => (alertFired = true))
    const sseBody = [
      `data:{"type":"delta","text":"<script>alert(1)</script>"}\n\n`,
      `data:{"type":"final","reply":{"answer":"<img src=x onerror=alert(1)>"}}\n\n`,
    ].join('')
    await page.route('**/v1/customer-service/chat/stream', (r) =>
      r.fulfill({ status: 200, contentType: 'text/event-stream', body: sseBody }),
    )

    await page.goto(testConfig.routes.home)
    await page.getByRole('button', { name: '打开在线客服' }).click()
    await page.locator('#customer-service-input').fill('test')
    await page.locator('.chat-form button[type=submit]').click()
    await page.waitForTimeout(1500)
    expect(alertFired).toBeFalsy()
  })

  test('TC-CS-006 边界：输入超 500 截断', async ({ cleanPage: page }) => {
    await page.goto(testConfig.routes.home)
    await page.getByRole('button', { name: '打开在线客服' }).click()
    const input = page.locator('#customer-service-input')
    await input.fill('a'.repeat(600))
    const value = await input.inputValue()
    expect(value.length).toBeLessThanOrEqual(500)
  })
})

import fs from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()
const caseFile = process.env.ZENTAO_TESTCASE_FILE || 'qa/zentao/testcases.json'
const outputDir = process.env.ZENTAO_OUTPUT_DIR || 'qa/zentao/out'
const summaryJsonPath = path.join(outputDir, 'zentao-summary.json')
const summaryMarkdownPath = path.join(outputDir, 'zentao-summary.md')

const requiredEnv = ['ZENTAO_URL', 'ZENTAO_USERNAME', 'ZENTAO_PASSWORD']

const readJson = async (filePath) => {
  const content = await fs.readFile(path.resolve(root, filePath), 'utf8')
  return JSON.parse(content)
}

const getBaseURL = (envURL) => {
  if (!envURL) throw new Error('ZENTAO_URL 未配置')
  const idx = envURL.indexOf('/zentao')
  if (idx === -1) throw new Error('ZENTAO_URL 中未找到 /zentao 路径')
  return envURL.slice(0, idx + '/zentao'.length)
}

const getProductID = (envURL) => {
  if (process.env.ZENTAO_PRODUCT_ID) return Number(process.env.ZENTAO_PRODUCT_ID)
  try {
    const match = /referer=([^&]+)/.exec(envURL)
    if (!match) return 1
    const decoded = Buffer.from(match[1], 'base64').toString('utf8')
    const idMatch = /productID=(\d+)/.exec(decoded)
    if (idMatch) return Number(idMatch[1])
  } catch {
    return 1
  }
  return 1
}

const requestJson = async (url, options = {}) => {
  const res = await fetch(url, options)
  const text = await res.text()
  let body = null
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    body = text
  }
  return { res, body, text }
}

const login = async (baseURL) => {
  const { res, body, text } = await requestJson(`${baseURL}/api.php/v1/tokens`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      account: process.env.ZENTAO_USERNAME,
      password: process.env.ZENTAO_PASSWORD,
    }),
  })
  if (!res.ok) throw new Error(`禅道登录失败 ${res.status}: ${text}`)
  if (!body?.token) throw new Error(`禅道登录响应缺少 token: ${text}`)
  return body.token
}

const authHeaders = (token) => ({
  'Content-Type': 'application/json',
  Token: token,
})

const listTestcases = async (baseURL, token, productID) => {
  const cases = []
  let page = 1
  const limit = 100

  while (page <= 20) {
    const url = `${baseURL}/api.php/v1/products/${productID}/testcases?page=${page}&limit=${limit}`
    const { res, body, text } = await requestJson(url, { headers: authHeaders(token) })
    if (!res.ok) throw new Error(`查询禅道测试用例失败 ${res.status}: ${text}`)

    const items = Array.isArray(body?.testcases) ? body.testcases : []
    cases.push(...items)
    if (items.length < limit) break
    page += 1
  }

  return cases
}

const createTestcase = async (baseURL, token, productID, testCase) => {
  const steps = Array.isArray(testCase.steps)
    ? testCase.steps.map((step, index) => ({
        desc: `${index + 1}. ${step.desc}`,
        expect: step.expect,
      }))
    : testCase.steps

  const payload = {
    title: testCase.title,
    type: testCase.type || 'feature',
    pri: testCase.pri || 2,
    stage: testCase.stage || '系统测试阶段',
    precondition: testCase.precondition || '',
    steps,
  }

  const { res, body, text } = await requestJson(`${baseURL}/api.php/v1/products/${productID}/testcases`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  })

  if (![200, 201].includes(res.status)) {
    throw new Error(`创建禅道测试用例失败 ${res.status}: ${text}`)
  }

  return body
}

const createBug = async (baseURL, token, productID, bug) => {
  const payload = {
    title: bug.title,
    pri: bug.pri || 2,
    severity: bug.severity || 2,
    type: bug.type || 'codeerror',
    openedBuild: bug.openedBuild || ['trunk'],
    steps: bug.steps,
  }

  const { res, body, text } = await requestJson(`${baseURL}/api.php/v1/products/${productID}/bugs`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  })

  if (![200, 201].includes(res.status)) {
    throw new Error(`创建禅道 Bug 失败 ${res.status}: ${text}`)
  }

  return body
}

const compactStatus = (value) => {
  if (!value || value === 'skipped') return 'skipped'
  if (value === 'success') return 'success'
  if (['failure', 'cancelled', 'timed_out'].includes(value)) return 'failed'
  return value
}

const writeOutputs = async (summary) => {
  await fs.mkdir(outputDir, { recursive: true })
  await fs.writeFile(summaryJsonPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8')

  const lines = [
    '# 禅道用例同步与执行汇总',
    '',
    `- 状态：${summary.status}`,
    `- 产品 ID：${summary.productID ?? '未配置'}`,
    `- 用例总数：${summary.totalCases}`,
    `- 新建用例：${summary.created}`,
    `- 已存在用例：${summary.existing}`,
    `- 失败用例：${summary.failed}`,
    `- 新建 Bug：${summary.bugsCreated}`,
    `- 后端测试：${summary.execution.backend}`,
    `- 前端 Allure：${summary.execution.frontend}`,
    `- Allure 报告：${summary.execution.allureReportUrl || '未生成'}`,
    `- GitHub 运行：${summary.execution.runUrl || '未提供'}`,
  ]

  if (summary.errors.length) {
    lines.push('', '## 错误', ...summary.errors.map((item) => `- ${item.title}: ${item.error}`))
  }

  await fs.writeFile(summaryMarkdownPath, `${lines.join('\n')}\n`, 'utf8')

  if (process.env.GITHUB_OUTPUT) {
    const text = `状态=${summary.status}，新建=${summary.created}，已存在=${summary.existing}，失败=${summary.failed}，Bug=${summary.bugsCreated}`
    await fs.appendFile(
      process.env.GITHUB_OUTPUT,
      [
        `status=${summary.status}`,
        `created_count=${summary.created}`,
        `existing_count=${summary.existing}`,
        `failed_count=${summary.failed}`,
        `bug_count=${summary.bugsCreated}`,
        `summary_text=${text}`,
      ].join('\n') + '\n',
      'utf8'
    )
  }
}

const buildBaseSummary = (manifest, status) => ({
  status,
  project: manifest.project,
  product: manifest.product,
  productID: null,
  totalCases: manifest.cases.length,
  created: 0,
  existing: 0,
  failed: 0,
  bugsCreated: 0,
  errors: [],
  execution: {
    backend: compactStatus(process.env.BACKEND_RESULT),
    frontend: compactStatus(process.env.FRONTEND_TEST_RESULT),
    allureReportUrl: process.env.ALLURE_REPORT_URL || '',
    runUrl: process.env.GITHUB_RUN_URL || '',
    runNumber: process.env.GITHUB_RUN_NUMBER || '',
    sha: process.env.GITHUB_SHA || '',
    commitMessage: process.env.COMMIT_MESSAGE || '',
  },
})

const shouldCreateFailureBug = (summary) => {
  if (process.env.ZENTAO_CREATE_BUG_ON_FAILURE === 'false') return false
  return ['failed', 'failure', 'cancelled', 'timed_out'].includes(summary.execution.backend)
    || ['failed', 'failure', 'cancelled', 'timed_out'].includes(summary.execution.frontend)
}

const buildFailureBug = (summary) => {
  const shortSha = summary.execution.sha ? summary.execution.sha.slice(0, 7) : 'unknown'
  const title = `[元气购][CI失败] #${summary.execution.runNumber || 'manual'} ${shortSha} 自动化测试未通过`
  const commit = summary.execution.commitMessage || '未提供'

  return {
    title,
    severity: summary.execution.frontend === 'failed' || summary.execution.backend === 'failed' ? 2 : 3,
    pri: 2,
    type: 'codeerror',
    steps: [
      '<h3>缺陷来源</h3>',
      '<p>GitHub Actions 自动化测试失败后，由元气购 CI 禅道集成脚本自动创建。</p>',
      '<h3>执行结果</h3>',
      `<p>后端测试：${summary.execution.backend}<br/>前端 Allure：${summary.execution.frontend}</p>`,
      '<h3>提交信息</h3>',
      `<p>提交：${shortSha}<br/>说明：${commit}</p>`,
      '<h3>排查入口</h3>',
      `<p>运行详情：<a href="${summary.execution.runUrl}">${summary.execution.runUrl}</a><br/>Allure 报告：<a href="${summary.execution.allureReportUrl}">${summary.execution.allureReportUrl}</a></p>`,
      '<h3>预期结果</h3>',
      '<p>后端测试和前端 Playwright smoke 测试均应通过，Allure 报告应正常生成。</p>',
      '<h3>实际结果</h3>',
      '<p>至少一个自动化测试阶段失败，请根据 GitHub Actions 日志和 Allure 报告定位原因。</p>',
    ].join('\n'),
  }
}

const main = async () => {
  const manifest = await readJson(caseFile)
  if (!Array.isArray(manifest.cases) || manifest.cases.length === 0) {
    throw new Error(`${caseFile} 没有可同步的 cases`)
  }

  const missing = requiredEnv.filter((name) => !process.env[name])
  if (missing.length) {
    const summary = buildBaseSummary(manifest, 'skipped')
    summary.errors.push({
      title: '禅道配置缺失',
      error: `缺少环境变量：${missing.join(', ')}。已跳过禅道同步。`,
    })
    await writeOutputs(summary)
    console.log(summary.errors[0].error)
    return
  }

  const baseURL = getBaseURL(process.env.ZENTAO_URL)
  const productID = getProductID(process.env.ZENTAO_URL)
  const summary = buildBaseSummary(manifest, 'success')
  summary.productID = productID

  const token = await login(baseURL)
  const existingCases = await listTestcases(baseURL, token, productID)
  const existingTitles = new Set(existingCases.map((item) => item.title).filter(Boolean))

  for (const testCase of manifest.cases) {
    if (existingTitles.has(testCase.title)) {
      summary.existing += 1
      continue
    }

    try {
      const created = await createTestcase(baseURL, token, productID, testCase)
      summary.created += 1
      if (created?.id) existingTitles.add(testCase.title)
    } catch (error) {
      summary.failed += 1
      summary.errors.push({
        title: testCase.title,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  if (shouldCreateFailureBug(summary)) {
    try {
      await createBug(baseURL, token, productID, buildFailureBug(summary))
      summary.bugsCreated += 1
    } catch (error) {
      summary.errors.push({
        title: 'CI 失败自动提交 Bug',
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  if (summary.failed > 0 || summary.errors.length > 0) summary.status = 'failed'
  await writeOutputs(summary)

  if (summary.failed > 0) process.exitCode = 1
}

main().catch(async (error) => {
  const fallback = {
    status: 'failed',
    project: '元气购电商平台',
    product: 'web-wenxuan',
    productID: null,
    totalCases: 0,
    created: 0,
    existing: 0,
    failed: 1,
    bugsCreated: 0,
    errors: [{ title: '脚本执行失败', error: error instanceof Error ? error.message : String(error) }],
    execution: {
      backend: compactStatus(process.env.BACKEND_RESULT),
      frontend: compactStatus(process.env.FRONTEND_TEST_RESULT),
      allureReportUrl: process.env.ALLURE_REPORT_URL || '',
      runUrl: process.env.GITHUB_RUN_URL || '',
      runNumber: process.env.GITHUB_RUN_NUMBER || '',
      sha: process.env.GITHUB_SHA || '',
      commitMessage: process.env.COMMIT_MESSAGE || '',
    },
  }
  await writeOutputs(fallback)
  console.error(error)
  process.exit(1)
})

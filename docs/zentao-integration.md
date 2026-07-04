# 禅道测试管理集成

元气购通过 GitHub Actions 把测试用例同步到禅道，并把 CI 执行结果、Allure 报告和禅道同步状态发送到飞书。

## 工作方式

1. `qa/zentao/testcases.json` 维护产品级测试用例。
2. CI 执行后端 Maven 测试和前端 Playwright smoke 测试。
3. `qa/zentao/sync-testcases-and-report.mjs` 登录禅道，按标题去重后创建缺失用例。
4. 脚本通过禅道传统接口创建 testtask，关联测试用例，并按 CI 阶段结果写入执行记录。
5. 如果后端或前端自动化失败，脚本会自动创建一条禅道 Bug，附 GitHub Actions 和 Allure 排查入口。
6. CI 上传 `zentao-test-management` artifact，飞书消息展示同步结果和报告入口。

testtask 走禅道传统表单接口，原因是当前禅道 REST testtask 接口不完整。实现参考 `Chowhound-G/zentao-api-automation` 里的 `testtask-api.spec.js`。

## GitHub Secrets

在仓库 `Settings -> Secrets and variables -> Actions` 增加：

```text
ZENTAO_URL       禅道登录页完整 URL，建议包含 /zentao 和 referer
ZENTAO_USERNAME  禅道账号
ZENTAO_PASSWORD  禅道密码
```

可选变量：

```text
ZENTAO_PRODUCT_ID  禅道产品 ID；不配置时从 ZENTAO_URL 的 referer 解析，解析失败默认 1
ZENTAO_CREATE_BUG_ON_FAILURE  是否在测试失败时自动创建 Bug；默认 true，设为 false 可关闭
ZENTAO_CREATE_TESTTASK  是否创建测试任务并写执行记录；默认 true，设为 false 可关闭
ZENTAO_TESTTASK_EXECUTION  禅道执行 ID；默认 3
ZENTAO_TESTTASK_BUILD  禅道版本 build ID；默认 1
```

如果 `ZENTAO_URL` 填完整登录页，例如：

```text
https://sub2.hermes.cn.mt/zentao/index.php?m=user&f=login&referer=L3plbnRhby9pbmRleC5waHA/bT1idWcmZj1icm93c2UmcHJvZHVjdElEPTE=
```

脚本会自动从 `referer` 解析产品 ID。若只填 `https://sub2.hermes.cn.mt/zentao/index.php`，请同时配置 `ZENTAO_PRODUCT_ID`，否则会使用默认产品 ID `1`。

飞书通知继续使用：

```text
FEISHU_BOT_WEBHOOK
FEISHU_BOT_SECRET
```

## 本地验证

只检查脚本是否能生成跳过报告：

```bash
node qa/zentao/sync-testcases-and-report.mjs
```

连接真实禅道：

```bash
export ZENTAO_URL='https://your-host/zentao/index.php?m=user&f=login&referer=...'
export ZENTAO_USERNAME='your-user'
export ZENTAO_PASSWORD='your-password'
node qa/zentao/sync-testcases-and-report.mjs
```

输出文件：

```text
qa/zentao/out/zentao-summary.json
qa/zentao/out/zentao-summary.md
```

## Allure 历史报告

部署成功后，CI 会把本次 Allure HTML 报告发布到：

```text
http://019f2bb81c537b9083731be895602f96.ap-northeast-1.a8g1v3.xyz/__reports/allure/<run_number>/
```

同时生成历史索引页，保留最近 20 次：

```text
http://019f2bb81c537b9083731be895602f96.ap-northeast-1.a8g1v3.xyz/__reports/allure/
```

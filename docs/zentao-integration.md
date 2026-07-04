# 禅道测试管理集成

元气购通过 GitHub Actions 把测试用例同步到禅道，并把 CI 执行结果、Allure 报告和禅道同步状态发送到飞书。

## 工作方式

1. `qa/zentao/testcases.json` 维护产品级测试用例。
2. CI 执行后端 Maven 测试和前端 Playwright smoke 测试。
3. `qa/zentao/sync-testcases-and-report.mjs` 登录禅道，按标题去重后创建缺失用例。
4. 如果后端或前端自动化失败，脚本会自动创建一条禅道 Bug，附 GitHub Actions 和 Allure 排查入口。
5. CI 上传 `zentao-test-management` artifact，飞书消息展示同步结果和报告入口。

当前只做“用例创建/同步”、“CI 失败自动提 Bug”和“CI 执行汇总”。禅道 testtask 执行记录暂不写入，因为参考项目 `Chowhound-G/zentao-api-automation` 里也说明 testtask 依赖 build 权限，暂未实现稳定接口。

## GitHub Secrets

在仓库 `Settings -> Secrets and variables -> Actions` 增加：

```text
ZENTAO_URL       禅道登录页完整 URL，包含 /zentao 和 referer
ZENTAO_USERNAME  禅道账号
ZENTAO_PASSWORD  禅道密码
```

可选变量：

```text
ZENTAO_PRODUCT_ID  禅道产品 ID；不配置时从 ZENTAO_URL 的 referer 解析，解析失败默认 1
ZENTAO_CREATE_BUG_ON_FAILURE  是否在测试失败时自动创建 Bug；默认 true，设为 false 可关闭
```

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

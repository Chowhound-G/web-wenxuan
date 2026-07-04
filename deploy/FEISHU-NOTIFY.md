# 飞书 CI/CD 通知配置

本文档说明如何把 GitHub Actions 的构建、测试、镜像构建和部署结果发送到飞书。

当前接入方式使用飞书群聊的“自定义机器人 Webhook”。它适合 CI/CD 单向通知，不需要公网服务器，也不需要配置事件回调或 WebSocket 长连接。

## 1. 创建飞书自定义机器人

1. 打开要接收通知的飞书群。
2. 进入群设置，找到“群机器人”或“机器人”。
3. 添加“自定义机器人”。
4. 复制机器人 Webhook 地址。
5. 建议开启“签名校验”，并复制签名密钥。

如果开启了“关键词校验”，请确保关键词包含 `CI/CD`，否则飞书会拒收通知。

## 2. 配置 GitHub Secrets

打开：

`https://github.com/Chowhound-G/web-wenxuan/settings/secrets/actions`

添加以下 Repository secrets：

| Secret 名 | 必填 | 说明 |
|-----------|------|------|
| `FEISHU_BOT_WEBHOOK` | 是 | 飞书自定义机器人的 Webhook 地址 |
| `FEISHU_BOT_SECRET` | 否 | 开启签名校验时填写飞书给出的签名密钥 |

不要把 Webhook 或签名密钥提交到仓库。

## 3. 通知触发时机

`.github/workflows/ci.yml` 已增加 `notify-feishu` job：

- `push main`：后端测试、镜像构建、部署结束后发送通知。
- `pull_request main`：测试和构建结束后发送通知，部署会显示为 skipped。
- `workflow_dispatch`：可以在 Actions 页面手动运行，用来测试通知配置。

通知内容包括：

- 成功或失败状态
- 仓库、工作流编号、分支、触发人
- 提交 SHA 和提交信息
- 后端构建与测试结果
- 镜像构建推送结果
- 部署结果
- GitHub Actions 运行链接
- 线上地址

## 4. 验证

配置完 Secrets 后，可以在 Actions 页面手动运行 `CI/CD` 工作流：

1. 进入 `https://github.com/Chowhound-G/web-wenxuan/actions`
2. 选择 `CI/CD`
3. 点击 `Run workflow`
4. 等待运行结束
5. 检查飞书群是否收到通知

如果没有收到：

1. 检查 `FEISHU_BOT_WEBHOOK` 是否完整。
2. 如果开启签名校验，检查 `FEISHU_BOT_SECRET` 是否正确。
3. 如果开启关键词校验，确认关键词包含 `CI/CD`。
4. 打开 Actions 的 `飞书通知` job 查看响应内容。

## 5. 什么时候需要企业自建应用

如果只是接收 CI/CD 结果通知，不需要企业自建应用。

只有在这些场景下才建议使用“企业自建应用 + 机器人”：

- 用户在飞书里给机器人发消息，机器人需要回复。
- 机器人需要读取群信息、用户信息或文档。
- 需要事件订阅、卡片交互、审批、日历等更复杂能力。

本项目当前需求是“类似邮件通知我”，自定义机器人 Webhook 足够，并且维护成本最低。

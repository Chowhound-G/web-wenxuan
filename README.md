# 元气购 Web

![CI/CD](https://github.com/Chowhound-G/web-wenxuan/actions/workflows/ci.yml/badge.svg)

一个面向 Demo / 毕设 / 作品集展示的全栈电商项目，包含商城前台、Spring Boot API、AI 客服与知识库管理后台。

[线上预览](http://019f2bb81c537b9083731be895602f96.ap-northeast-1.a8g1v3.xyz) · [CI/CD](https://github.com/Chowhound-G/web-wenxuan/actions) · [部署说明](deploy/CD-SETUP.md)

![元气购首页](docs/repo-assets/homepage.png)

## 功能

- 商品浏览、搜索、分类、详情、评价
- 购物车、结算、支付结果、订单、售后
- 登录、收藏、消息中心、钱包余额
- AI 客服、知识库文档管理、命中日志
- GitHub Actions 自动测试、构建镜像、部署、飞书通知
- Playwright + Allure 前端 smoke 测试报告
- 禅道测试用例同步与 CI 执行汇总通知

## 技术栈

| 模块 | 技术 |
| --- | --- |
| Frontend | Vue 3, TypeScript, Pinia, Vite, Playwright |
| Backend | Java 17, Spring Boot 3, MyBatis, MySQL |
| AI Service | FastAPI, RAG, LightRAG, Neo4j, pgvector |
| DevOps | Docker Compose, Nginx, GitHub Actions, GHCR |

## 快速启动

准备环境：

- Node.js 20+
- Java 17 + Maven
- MySQL 8

导入数据库：

```bash
mysql -uroot -p123456 -e "CREATE DATABASE IF NOT EXISTS web DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -uroot -p123456 --default-character-set=utf8mb4 web < back/sql/init_db.sql
```

启动后端：

```bash
cd back
mvn spring-boot:run
```

启动前端：

```bash
cd frontend
npm install
npm run dev -- --host 127.0.0.1
```

默认地址：

- 前端：`http://127.0.0.1:5173`
- 后端：`http://127.0.0.1:8080/api`
- 测试账号：`user@example.com / 123456`
- 管理员：`admin / 123456`

## 测试报告

本地运行前端 smoke 测试并生成 Allure 报告：

```bash
cd frontend
npm run test:e2e:install
npm run test:e2e:allure
npx allure generate allure-results --clean -o allure-report
```

CI/CD 会把 Allure HTML 发布到线上站点，并把公网报告入口发送到飞书机器人。

报告地址格式：

```text
http://019f2bb81c537b9083731be895602f96.ap-northeast-1.a8g1v3.xyz/__reports/allure/<run_number>/
```

禅道测试管理：

- 用例清单：`qa/zentao/testcases.json`
- 集成说明：[docs/zentao-integration.md](docs/zentao-integration.md)
- CI 会创建缺失的禅道测试用例，并把同步结果和测试执行概况发送到飞书。

## 部署

生产环境由 GitHub Actions 完成：

1. 后端测试
2. 前端 Playwright smoke + Allure 报告
3. 禅道测试用例同步与执行汇总
4. 构建并推送前后端镜像到 GHCR
5. SSH 到服务器拉取镜像并重启
6. 飞书发送结果通知

配置方式见：

- [持续部署配置](deploy/CD-SETUP.md)
- [飞书通知配置](deploy/FEISHU-NOTIFY.md)
- [禅道测试管理集成](docs/zentao-integration.md)

## 目录

```text
frontend/    Vue 商城前台
back/        Spring Boot 后端 API
ai-service/  AI 客服服务
deploy/      部署配置与说明
docs/        设计、接口与运行文档
qa/          测试管理与质量平台集成
scripts/     本地辅助脚本
```

## 常用命令

```bash
# 前端构建
npm --prefix frontend run build

# 后端测试
cd back && mvn -B clean verify

# 查看生产后端日志
ssh -i ~/.ssh/web_wenxuan_deploy -p 10033 root@38.226.195.218
cd /opt/web-wenxuan
docker compose -f docker-compose.prod-lite.yml logs -f backend
```

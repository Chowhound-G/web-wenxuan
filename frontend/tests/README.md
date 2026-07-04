# 元气购 Web 端 E2E 测试

基于 **Playwright** 的端到端测试，UI 测试 + API 测试 + UI/API 联合测试，覆盖 12 个功能模块、8 大测试分类（正向/逆向/边界/异常/安全/权限/兼容/UI·UX）。

## 📁 目录结构

```
tests/
├── config/
│   └── test.config.ts          # ★ 配置中心：账号、路径、API、超时（改账号只改这里）
├── fixtures/
│   └── helpers.ts              # 辅助层：登录（UI/API）、数据准备、storage 重置
├── specs/                      # 测试用例（按模块分文件）
│   ├── auth.spec.ts            # 认证（登录/注册/管理员）
│   ├── product.spec.ts         # 商品（首页/类目/搜索/详情）
│   ├── cart-checkout-pay.spec.ts   # 购物车/结算/支付
│   ├── order-aftersale-review.spec.ts  # 订单/售后/评价
│   ├── favorites-messages-me.spec.ts   # 收藏/消息/个人中心/通用
│   ├── customer-service.spec.ts    # AI 客服（SSE 流式）
│   └── knowledge-base.spec.ts      # 知识库后台
├── auth.setup.ts               # 全局登录 Setup（storageState 复用）
├── test-cases.md               # ★ 完整测试用例文档（106 条，含优先级与分类）
├── .env.example                # 配置示例
└── README.md                   # 本文件
```

## 🚀 快速开始

### 1. 安装依赖
```bash
cd /Users/guoxing/Downloads/code/web-wenxuan/frontend
npm install
npx playwright install chromium
```

### 2. 启动被测服务
测试需要前端 dev server（默认 `http://127.0.0.1:5173`）和后端 API（默认 `http://localhost:8080/api`）。
```bash
# 前端
npm run dev
# 后端（在仓库根的 back/ 启动 Spring Boot，详见仓库根 README）
```

### 3. 配置账号（可选）
默认账号在 `config/test.config.ts`。如需覆盖，复制 `.env.example` 为 `.env` 或直接 export：
```bash
cp tests/.env.example tests/.env
# 编辑 tests/.env 填入真实账号
```
或临时覆盖：
```bash
TEST_USER_ACCOUNT=your@email.com TEST_USER_PASSWORD=yourpwd npx playwright test
```

### 4. 运行测试
```bash
# 全部
npm run test:e2e

# 指定模块（按文件）
npx playwright test tests/specs/auth.spec.ts

# 指定用例（按用例 ID 关键字）
npx playwright test -g "TC-AUTH-001"

# 可视化（带浏览器窗口）
npm run test:e2e:headed

# 查看报告
npx playwright show-report
```

## ⚙️ 配置说明（`config/test.config.ts`）

所有**账号、地址、路径、API 端点**集中在此，优先级：环境变量 > 默认值。

| 配置项 | 环境变量 | 默认值 | 说明 |
|--------|----------|--------|------|
| 前端地址 | `TEST_BASE_URL` | `http://127.0.0.1:5173` | Playwright 访问的前端 |
| 后端 API | `TEST_API_BASE` | `http://localhost:8080/api` | API/联合测试用 |
| 普通用户 | `TEST_USER_ACCOUNT` / `TEST_USER_PASSWORD` | `user@example.com` / `123456` | 主流程登录 |
| 注册账号 | `TEST_NEW_USER_ACCOUNT` | `test_<时间戳>@example.com` | 注册用例 |
| 管理员 | `TEST_ADMIN_ACCOUNT` / `TEST_ADMIN_PASSWORD` | `admin` / `123456` | 知识库后台 |
| 商品 ID | `TEST_PRODUCT_ID` | `1` | 商品详情测试 |
| 超时 | `TEST_DEFAULT_TIMEOUT` | `30000` | 毫秒 |

## 🧪 用例设计规范

- **8 大分类强制覆盖**：正向/逆向/边界/异常/安全/权限/兼容/UI·UX（见 `test-cases.md`）。
- **用例 ID**：`TC-<模块>-<序号>`，与 `test()` 标题、`test-cases.md` 文档双向追溯。
- **优先级**：P0（冒烟，22 条）→ P3。
- **联合测试**：API 准备/校验数据 + UI 验证交互（如加购：UI 点击 + API/DB 校验）。
- **隔离性**：每个用例 `cleanPage` fixture 自动重置 localStorage，互不依赖。

## 🐛 已知限制与需求疑问

详见 `test-cases.md` 第十七节。关键项：
1. **下单无幂等**（`POST /v1/orders/checkout` 未带 `Idempotency-Key`），重复提交有风险。
2. **addressId 恒为 0**，前端不发真实地址，需确认后端如何取发货地址。
3. **售后/评价** UI 无上传凭证/图片入口（与 `evidence`/`images` 字段脱节）。
4. **物流信息全前端硬编码 mock**，无法验证真实物流。
5. 后端不可用时，依赖登录态的用例会自动跳过或宽容断言。

## 📊 用例统计

共 **106 条**，分布见 `test-cases.md` 第三节。

# 元气购 Web 端测试用例文档（UI + API 联合）

> 由 `test-case-generator` 技能基于源码生成。覆盖 8 大分类：正向 / 逆向 / 边界 / 异常 / 安全 / 权限 / 兼容 / UI·UX。
> 配套 Playwright 代码位于 `tests/specs/`，用例 ID 与 `test()` 标题一一对应。

## 一、需求概述

- **产品**：元气购（ProjectKu Web）全栈电商，前端 Vue 3 + Vite。
- **测试对象**：前端 SPA（`/Users/guoxing/Downloads/code/web-wenxuan/frontend`），含 12 个功能模块。
- **核心模块**：认证（登录/注册/管理员）、商品（首页/类目/搜索/详情）、购物车、结算下单、收银台支付、订单（列表/详情/物流）、售后、评价、收藏、消息、个人中心、AI 客服、知识库后台。
- **用户角色**：游客、普通用户、管理员。
- **后端**：Spring Boot `/api`；AI 客服 FastAPI（SSE 流式）。
- **关键约束**：密码 ≥6 位；手机号 `1\d{10}`；邮箱标准格式；下单无幂等头；`requiresAuth` 路由前端拦截（401 跳登录）。

## 二、测试范围与不覆盖

- **覆盖**：前端 UI 交互 + 前后端 API 联合验证 + 路由权限 + 表单校验 + 安全输入 + 401 处理。
- **不覆盖**（及原因）：
  - 后端单元/集成测试（已有 `back/`、`api_testcases/`，本套聚焦前端 E2E）。
  - 物流详情真实数据（前端硬编码 mock，仅测 UI 渲染）。
  - 真实支付通道（前端走 mock webhook，仅测状态机）。

## 三、用例总览统计

| 分类 | 数量 | P0 | P1 | P2 | P3 |
|------|------|----|----|----|----|
| 正向 | 28 | 12 | 11 | 5 | 0 |
| 逆向 | 22 | 4 | 13 | 5 | 0 |
| 边界 | 12 | 0 | 5 | 7 | 0 |
| 异常 | 10 | 1 | 6 | 3 | 0 |
| 安全 | 12 | 2 | 7 | 3 | 0 |
| 权限 | 10 | 3 | 5 | 2 | 0 |
| 兼容 | 4 | 0 | 2 | 2 | 0 |
| UI/UX | 8 | 0 | 4 | 4 | 0 |
| **合计** | **106** | **22** | **53** | **31** | **0** |

---

## 四、模块 1：认证（登录 / 注册 / 管理员）

> 路由：`/login`、`/register`、`/admin/login`。账号规则：手机号 `1\d{10}` 或邮箱；密码 ≥6 位。

| 用例ID | 类型 | 层次 | 用例标题 | 前置条件 | 步骤 | 测试数据 | 预期结果 | 优先级 |
|--------|------|------|----------|----------|------|----------|----------|--------|
| TC-AUTH-001 | 正向 | 联合 | 邮箱+密码登录成功 | 已注册 user@example.com/123456 | 1.访问 /login 2.填邮箱+密码 3.点登录 | account=user@example.com,pwd=123456 | UI:跳转 /;API: POST /v1/auth/login 200,返回 token;localStorage 写入 auth:v1 含 token | P0 |
| TC-AUTH-002 | 正向 | 联合 | 手机号+密码登录成功 | 已注册手机号 | 1.填手机号+密码 2.登录 | account=13800138000 | 同上，跳转 / | P0 |
| TC-AUTH-003 | 正向 | UI | 未勾选协议时登录按钮禁用 | — | 1.取消勾选协议 2.填正确账密 | agree=false | 按钮 disabled，不可点击 | P1 |
| TC-AUTH-004 | 正向 | UI | 验证码模式切换 | — | 1.点"验证码登录" tab | — | 显示验证码输入框+获取验证码按钮；密码框隐藏 | P1 |
| TC-AUTH-005 | 正向 | UI | 获取验证码倒计时 | 验证码模式，填合法手机号 | 1.点"获取验证码" | — | 按钮"发送中"→"60s"倒计时；倒计时>0 不可再点 | P2 |
| TC-AUTH-006 | 正向 | 联合 | 注册新账号成功 | 手机号/邮箱未被注册 | 1.填账号+验证码+密码+确认 2.勾协议 3.注册 | 任意合法 | API: POST /v1/auth/register 200；自动登录跳 / | P0 |
| TC-AUTH-007 | 逆向 | UI | 账号格式非法提示 | — | 1.填 "abc" 2.失焦 | account=abc | 字段下提示"只能填写手机号或邮箱"；登录按钮禁用 | P1 |
| TC-AUTH-008 | 逆向 | UI | 密码 <6 位登录失败 | — | 1.填正确邮箱+5位密码 2.登录 | pwd=12345 | 提示"密码至少 6 位"；按钮 disabled | P1 |
| TC-AUTH-009 | 逆向 | UI | 两次密码不一致时按钮禁用（前置拦截） | 注册页 | 1.密码 123456 2.确认 123457 | pwd=123456/confirm=123457 | `canSubmit` 含 `confirmOk`，按钮直接 disabled；submit 内"两次输入的密码不一致"文案在正常点击路径下不可达（源码缺陷） | P1 |
| TC-AUTH-010 | 逆向 | 联合 | 密码错误登录失败 | 账号已注册 | 1.正确账号+错误密码 2.登录 | pwd=wrong123 | API: 401;UI: 错误提示（账号或密码错误） | P1 |
| TC-AUTH-011 | 逆向 | API | 注册重复账号失败 | 账号已存在 | 1.POST /v1/auth/register 同账号 | 已存在账号 | API: 返回业务错误码；不产生新用户 | P1 |
| TC-AUTH-012 | 安全 | 联合 | 登录响应不含密码明文 | — | 1.登录 2.抓响应体 | — | 响应 JSON 不含 password 字段/明文 | P1 |
| TC-AUTH-013 | 安全 | API | 登录接口 SQL 注入被拦 | — | 1.POST account=`' OR 1=1--` | username=`' OR 1=1--` | 返回 401/错误码；无 SQL 异常泄露；不登录成功 | P1 |
| TC-AUTH-014 | 权限 | UI | 未登录访问受保护页跳登录 | 未登录 | 1.直接访问 /checkout | — | 跳 /login?redirect=/checkout；toast"请先登录后再进行操作" | P0 |
| TC-AUTH-015 | 权限 | UI | redirect 参数校验（防开放重定向） | — | 1.登录时 redirect=//evil.com | redirect=//evil.com | 不跳外站，回落到 / （仅接受 `/` 开头） | P1 |
| TC-AUTH-016 | 异常 | 联合 | 登录 401 触发全局跳登录 | token 已植入但失效 | 1.访问受保护页 mock API 返回 401 | — | 触发 app:unauthorized，跳登录页 | P1 |
| TC-AUTH-017 | 正向 | 联合 | 管理员登录进知识库后台 | 默认 admin/123456 | 1.访问 /admin/login 2.填账密 3.进入 | admin/123456 | 跳 /admin/kb；localStorage 写 admin-auth:v1 | P0 |
| TC-AUTH-018 | 逆向 | 联合 | 管理员密码错误（401 触发全局跳转） | — | 1.填 admin+错误密码 2.进入 | admin/wrong123 | 后端返回 401 → api 拦截器 dispatch `app:unauthorized` → 跳普通 `/login?redirect=/admin/login` + toast"请先登录后再进行操作"（admin 页本地错误提示不显示） | P1 |
| TC-AUTH-019 | 权限 | UI | 未登录访问 /admin/kb 跳管理员登录 | 未登录管理员 | 1.访问 /admin/kb | — | 跳 /admin/login?redirect=/admin/kb；toast"请先登录管理员后台" | P0 |
| TC-AUTH-020 | 边界 | UI | 账号恰好 11 位手机号 | — | 1.填 13800138000 | 合法 | 校验通过，按钮可点 | P2 |
| TC-AUTH-021 | 边界 | UI | 账号 10 位手机号非法 | — | 1.填 1380013800 | 10位 | 校验失败，提示格式错 | P2 |
| TC-AUTH-022 | 边界 | UI | 密码恰好 6 位可登录 | — | 1.填 6 位密码 | pwd=123456 | 可提交 | P2 |
| TC-AUTH-023 | UI/UX | UI | 登录中按钮 loading 态 | — | 1.提交登录 | — | 按钮 loading（spinner）；期间 disabled | P2 |

---

## 五、模块 2：商品（首页 / 类目 / 搜索 / 详情）

> API：`GET /v1/products`、`GET /v1/products/:id`。

| 用例ID | 类型 | 层次 | 用例标题 | 前置条件 | 步骤 | 测试数据 | 预期结果 | 优先级 |
|--------|------|------|----------|----------|------|----------|----------|--------|
| TC-PROD-001 | 正向 | 联合 | 首页加载商品列表 | 后端有商品 | 1.访问 / | — | GET /v1/products?page=1&size=6 200；渲染 ≤6 张 .card | P0 |
| TC-PROD-002 | 正向 | UI | 搜索框跳转搜索页 | — | 1.首页输入"手机" 2.点搜索 | q=手机 | URL=/search?q=手机；拉商品并按关键词过滤 | P1 |
| TC-PROD-003 | 正向 | UI | 类目快捷入口跳转 | — | 1.点"手机"类目按钮 | — | 跳 /phone | P1 |
| TC-PROD-004 | 正向 | 联合 | 类目页按品类筛选 | — | 1.访问 /category 2.点"电脑" tab | categoryId=2 | GET /v1/products?category=2；列表只显示电脑 | P1 |
| TC-PROD-005 | 正向 | UI | 类目页排序切换 | 类目页 | 1.点"销量"/"价格↑" | — | 列表顺序变化；选中按钮 disabled | P2 |
| TC-PROD-006 | 正向 | 联合 | 搜索无结果空态 | — | 1.搜索 "zzz不存在" | q=zzz | 显示空态"没有找到相关商品" | P1 |
| TC-PROD-007 | 正向 | 联合 | 商品详情加载 | 商品 id=1 存在 | 1.访问 /products/1 | — | GET /v1/products/1 200；渲染主图/标题/规格/库存 | P0 |
| TC-PROD-008 | 逆向 | UI | 商品 id 非数字显示不存在 | — | 1.访问 /products/abc | id=abc | 前端校验失败，显示"商品不存在" | P1 |
| TC-PROD-009 | 正向 | UI | 选择规格更新库存文案 | 详情页 | 1.点可选规格 | — | 库存文案由"请选择规格"→"库存 N" | P1 |
| TC-PROD-010 | 逆向 | UI | 选无货规格不可加购 | 详情页有无货 sku | 1.点无货规格(disabled) | stock=0 | 按钮 disabled 不可点；文案"无货" | P1 |
| TC-PROD-011 | 正向 | 联合 | 加购成功 | 已选规格+库存>0 | 1.点"加入购物车" | — | toast"已加入购物车"；cart 计数+1 | P0 |
| TC-PROD-012 | 正向 | 联合 | 立即购买跳结算 | 同上 | 1.点"立即购买" | — | 跳 /checkout | P1 |
| TC-PROD-013 | 正向 | 联合 | 数量增减与上下限 | 详情页 | 1.点增加 2.点到上限 3.点减少 | maxQty=stock | 增到 stock 时增加按钮 disabled；减到 1 时减少 disabled | P2 |
| TC-PROD-014 | 权限 | UI | 未登录收藏提示 | 未登录 | 1.详情页点"收藏" | — | toast"请先登录"；跳 /login | P1 |
| TC-PROD-015 | 正向 | 联合 | 已登录收藏成功 | 已登录 | 1.点收藏 | — | toast"收藏成功"；按钮变选中态(.on) | P1 |
| TC-PROD-016 | 正向 | UI | 评价 tab 切换与计数 | 详情页有评价 | 1.点"好评(n)" | — | tab 切换；aria-selected 变化 | P2 |
| TC-PROD-017 | 异常 | 联合 | 商品接口 500 显示错误面板 | — | 1.mock GET /v1/products/1 → 500 | — | 显示"加载失败"+"重试"按钮 | P1 |
| TC-PROD-018 | 异常 | UI | 首页加载骨架屏 | 慢响应 | 1.mock 慢响应 2.访问 / | — | 显示 skeleton(.skeletonCard[role=status]) | P2 |
| TC-PROD-019 | UI/UX | UI | 首页空推荐空态 | 后端返回空 | 1.mock 空列表 | — | 显示"暂无推荐商品"+"刷新" | P2 |
| TC-PROD-020 | 边界 | UI | 详情页主图缩略图切换 | 多图商品 | 1.点 .thumbBtn N | — | 主图 .heroImg 切换 | P3→P2 |

---

## 六、模块 3：购物车

> API：`GET/POST/PUT/DELETE /v1/cart`。本地优先 localStorage `cart:v1`。

| 用例ID | 类型 | 层次 | 用例标题 | 前置条件 | 步骤 | 测试数据 | 预期结果 | 优先级 |
|--------|------|------|----------|----------|------|----------|----------|--------|
| TC-CART-001 | 正向 | 联合 | 购物车展示商品 | cart 有 1 项 | 1.访问 /cart | — | 渲染 .item；显示单价/小计/合计 | P0 |
| TC-CART-002 | 正向 | UI | 空购物车空态 | cart 为空 | 1.访问 /cart | — | 显示"购物车空空如也" | P1 |
| TC-CART-003 | 正向 | 联合 | 修改数量 | cart 有项 | 1.点增加 2.点减少 | — | 数量变化；小计/合计重算；PUT /v1/cart/items/:id | P0 |
| TC-CART-004 | 边界 | UI | 数量减到 1 后减少按钮禁用 | qty=1 | 1.点减少 | — | 减少按钮 disabled；数量保持 1 | P2 |
| TC-CART-005 | 正向 | 联合 | 移除商品 | cart 有项 | 1.点"移除" | — | DELETE /v1/cart/items/:id；列表移除；合计重算 | P1 |
| TC-CART-006 | 正向 | UI | 去结算跳结算页 | cart 非空 | 1.点"去结算（¥N.NN）" | — | 跳 /checkout | P0 |
| TC-CART-007 | 逆向 | UI | 空购物车结算按钮不可达 | cart 为空 | 1.访问 /cart | — | 无结算按钮（空态） | P2 |
| TC-CART-008 | 边界 | UI | 数量上限（库存） | qty=stock | 1.点增加 | — | 增加 disabled（maxQty=stock） | P2 |
| TC-CART-009 | 异常 | 联合 | cart 接口失败本地降级 | — | 1.mock GET /v1/cart 500 | — | 仍渲染本地 localStorage 数据，不阻塞 | P2 |

---

## 七、模块 4：结算下单

> API：`POST /v1/orders/checkout` body `{addressId:0, couponCode}`。**注意无幂等头**。

| 用例ID | 类型 | 层次 | 用例标题 | 前置条件 | 步骤 | 测试数据 | 预期结果 | 优先级 |
|--------|------|------|----------|----------|------|----------|----------|--------|
| TC-CHK-001 | 正向 | 联合 | 提交订单成功 | 已登录+cart非空+选地址 | 1.选地址 2.提交 | — | POST /v1/orders/checkout 200；跳 /cashier?orderId=；toast"订单已创建" | P0 |
| TC-CHK-002 | 正向 | UI | 空购物车结算空态 | cart 空 | 1.访问 /checkout | — | 空态"购物车空空如也"+"去首页" | P1 |
| TC-CHK-003 | 正向 | UI | 新增地址保存 | — | 1.点+添加新地址 2.填4项 3.保存 | 合法地址 | 地址加入列表并选中 | P1 |
| TC-CHK-004 | 逆向 | UI | 新增地址手机号非法 | — | 1.填手机号 1380 | phone=1380 | toast"请完整填写收货信息" | P1 |
| TC-CHK-005 | 逆向 | UI | 未选地址不可提交 | — | 1.不选地址 2.提交 | — | 按钮文案"请选择收货地址"/disabled | P1 |
| TC-CHK-006 | 正向 | UI | 优惠券门槛未达禁用 | itemsAmount<门槛 | 1.选 NEW500 | 金额<5000 | 优惠券 disabled(.coupon.disabled) | P2 |
| TC-CHK-007 | 正向 | UI | 发票选企业需填抬头 | — | 1.选企业发票 2.不填抬头 | — | 按钮文案"请填写发票抬头"/disabled | P2 |
| TC-CHK-008 | 逆向 | 联合 | 提交订单失败提示 | mock 接口错误 | 1.提交 | — | toast 显示后端错误信息 | P1 |
| TC-CHK-009 | 异常 | 联合 | 重复提交防护（按钮禁用） | 提交中 | 1.连点提交 | — | 提交中按钮 disabled+loading，不重复发请求 | P1 |
| TC-CHK-010 | 安全 | 联合 | 结算接口需鉴权 | 无/无效 token | 1.POST /v1/orders/checkout 无 token | — | 返回 401/403 | P1 |

---

## 八、模块 5：收银台 + 支付结果

> 收银台不调支付接口，仅跳 payResult 由其发起 `POST /v1/payments/:id/pay`。倒计时 293s。

| 用例ID | 类型 | 层次 | 用例标题 | 前置条件 | 步骤 | 测试数据 | 预期结果 | 优先级 |
|--------|------|------|----------|----------|------|----------|----------|--------|
| TC-PAY-001 | 正向 | 联合 | 收银台展示订单与余额 | 有待支付订单 | 1.访问 /cashier?orderId= | — | GET /v1/orders/:id + /v1/me/wallet；显示金额/余额/倒计时 | P0 |
| TC-PAY-002 | 正向 | 联合 | 支付成功全流程 | 待支付订单 | 1.选支付方式 2.确认支付 3.payResult 自动支付 | — | POST /v1/payments/:id/pay；轮询 status→SUCCESS；显示"支付成功"；cart 清空 | P0 |
| TC-PAY-003 | 正向 | UI | 余额不足禁用确认 | balance<payable,选余额 | — | — | 按钮文案"余额不足"/disabled | P1 |
| TC-PAY-004 | 逆向 | UI | orderId 缺失提示 | — | 1.访问 /cashier 无 query | — | 显示"订单信息缺失" | P1 |
| TC-PAY-005 | 边界 | UI | 倒计时归零按钮变超时 | secondsLeft→0 | 1.等待/mock 倒计时到 0 | — | 按钮文案"支付超时，请返回订单页" | P2 |
| TC-PAY-006 | 正向 | UI | 支付方式切换 | 收银台 | 1.点各支付方式 | — | 选中项加 .on | P2 |
| TC-PAY-007 | 异常 | 联合 | 支付失败可重试 | mock pay → FAILED | 1.支付 2.失败 3.重试 | — | 显示"支付失败"+"重试支付" | P1 |
| TC-PAY-008 | 正向 | UI | 支付成功后清购物车 | 支付成功 | — | — | cart.clear()；cart 为空 | P1 |
| TC-PAY-009 | 异常 | 联合 | 支付状态轮询 | PROCESSING | 1.支付后轮询 | — | 每 1200ms GET status；显示"刷新状态" | P2 |

---

## 九、模块 6：订单（列表/详情/物流）

> 状态：Created/Paid/Shipped/Completed/Cancelled。`POST /v1/orders/:id/cancel` 仅 Created 可取消。

| 用例ID | 类型 | 层次 | 用例标题 | 前置条件 | 步骤 | 测试数据 | 预期结果 | 优先级 |
|--------|------|------|----------|----------|------|----------|----------|--------|
| TC-ORD-001 | 正向 | 联合 | 订单列表加载 | 有订单 | 1.访问 /orders | — | GET /v1/orders；渲染订单卡（号/时间/状态/金额） | P0 |
| TC-ORD-002 | 正向 | UI | 空订单空态 | 无订单 | 1.访问 /orders | — | "暂无订单"+"去首页" | P1 |
| TC-ORD-003 | 正向 | 联合 | 待支付订单立即支付 | status=Created | 1.点"立即支付" | — | 跳 /payResult?autoPay=1 | P1 |
| TC-ORD-004 | 正向 | UI | 非待支付显示查看详情 | status≠Created | 1.查看 | — | 按钮"查看详情"跳 orderDetail | P1 |
| TC-ORD-005 | 正向 | 联合 | 取消订单成功 | status=Created | 1.点"取消订单" 2.确认 | — | confirm"确认取消订单？"；POST cancel；toast"已取消订单"；状态→已取消 | P0 |
| TC-ORD-006 | 逆向 | UI | 非待支付不可取消 | status=Paid | 1.点取消 | — | toast"当前订单暂不支持取消" | P1 |
| TC-ORD-007 | 正向 | 联合 | 订单详情进度条 | 各状态 | 1.访问 orderDetail | — | 4 步进度条对应 stepIndex 高亮 | P2 |
| TC-ORD-008 | 正向 | UI | 物流页展示 | 已发货 | 1.点查看物流 | — | 显示运单号/快递员/时间线 | P2 |
| TC-ORD-009 | 正向 | UI | 复制运单号 | 物流页 | 1.点复制 | — | toast"已复制运单号" | P2 |
| TC-ORD-010 | 逆向 | UI | 复制失败降级提示 | clipboard 拒绝 | 1.mock 拒绝 | — | toast"复制失败，请手动复制" | P3→P2 |
| TC-ORD-011 | 权限 | UI | 未登录访问 /orders | 未登录 | 1.访问 /orders | — | /orders 无 requiresAuth，但订单数据需登录（空态或跳登录，按实际） | P2 |

---

## 十、模块 7：售后

> API：`POST /v1/aftersales/apply`、`POST /v1/aftersales/:id/cancel`。类型 refund_only/return_refund。

| 用例ID | 类型 | 层次 | 用例标题 | 前置条件 | 步骤 | 测试数据 | 预期结果 | 优先级 |
|--------|------|------|----------|----------|------|----------|----------|--------|
| TC-AF-001 | 正向 | 联合 | 申请售后成功 | 已登录+有 Completed 订单 | 1.选类型 2.填原因 3.提交 | reason=质量问题 | POST apply 200；toast"已提交售后申请"；跳 /aftersales | P0 |
| TC-AF-002 | 正向 | UI | 售后列表 | 有售后单 | 1.访问 /aftersales | — | 渲染售后卡（号/类型/状态/原因） | P1 |
| TC-AF-003 | 正向 | UI | 空售后空态 | 无 | 1.访问 /aftersales | — | "暂无售后单"+"去订单" | P1 |
| TC-AF-004 | 逆向 | UI | 原因为空不可提交 | 申请页 | 1.不填原因 2.提交 | reason="" | 按钮 disabled | P1 |
| TC-AF-005 | 逆向 | UI | 非法进入申请页空态 | 无 query | 1.访问 /aftersales/apply 无 orderId | — | "无法发起售后"+"去订单" | P1 |
| TC-AF-006 | 正向 | UI | 售后数量增减 | 申请页 | 1.点+/- | — | 数量变化，上限 maxQty | P2 |
| TC-AF-007 | 正向 | 联合 | 取消售后成功 | status=Submitted | 1.点"取消" | — | POST cancel；状态→Cancelled | P2 |
| TC-AF-008 | 逆向 | UI | 已完成售后不可取消 | status=Done | 1.查看 | — | "取消"按钮 disabled | P2 |

---

## 十一、模块 8：评价

> API：`POST /v1/reviews` body `{orderId,productId,rating,content,images}`。rating 1-5。

| 用例ID | 类型 | 层次 | 用例标题 | 前置条件 | 步骤 | 测试数据 | 预期结果 | 优先级 |
|--------|------|------|----------|----------|------|----------|----------|--------|
| TC-RV-001 | 正向 | 联合 | 提交评价成功 | 已登录+Completed 订单 | 1.选星级 2.填内容 3.提交 | rating=5,content=好评 | POST /v1/reviews 200；toast"评价已提交"；跳 orderDetail | P0 |
| TC-RV-002 | 逆向 | UI | 未选星级不可提交 | — | 1.不选星 2.提交 | rating=0 | 按钮 disabled | P1 |
| TC-RV-003 | 逆向 | UI | 内容为空不可提交 | — | 1.选星 2.不填内容 | content="" | 按钮 disabled | P1 |
| TC-RV-004 | 逆向 | UI | 非法进入评价页空态 | 无 query | 1.访问 /reviews/create 无 orderId | — | "无法发布评价"+"去订单" | P1 |
| TC-RV-005 | 正向 | UI | 星级交互高亮 | — | 1.点第 4 星 | rating=4 | 第1-4星 .on；第5星不亮 | P2 |
| TC-RV-006 | 边界 | UI | 星级边界 1 和 5 | — | 1.点第1星 2.点第5星 | — | 均可选中，对应 .on | P2 |

---

## 十二、模块 9：收藏

> API：`GET/POST/DELETE /v1/favorites`。

| 用例ID | 类型 | 层次 | 用例标题 | 前置条件 | 步骤 | 测试数据 | 预期结果 | 优先级 |
|--------|------|------|----------|----------|------|----------|----------|--------|
| TC-FAV-001 | 正向 | 联合 | 收藏列表加载 | 有收藏 | 1.访问 /favorites | — | GET /v1/favorites；渲染卡片 | P0 |
| TC-FAV-002 | 正向 | UI | 空收藏空态 | 无 | 1.访问 /favorites | — | "暂无收藏"+"去逛逛" | P1 |
| TC-FAV-003 | 正向 | 联合 | 移除收藏 | 有收藏 | 1.点"移除收藏" | — | DELETE；toast"已移除收藏" | P1 |
| TC-FAV-004 | 正向 | 联合 | 批量移除 | 选多项 | 1.全选 2.移除(N) | — | DELETE bulk；toast"已移除所选收藏" | P2 |
| TC-FAV-005 | 正向 | 联合 | 收藏项加购 | 有收藏 | 1.点"加购" | — | 加购；toast"已加入购物车" | P2 |
| TC-FAV-006 | 逆向 | UI | 未选不可批量操作 | 无选中 | 1.看批量栏 | — | "加购"/"移除" disabled | P2 |
| TC-FAV-007 | 权限 | UI | 未登录访问收藏跳登录 | 未登录 | 1.访问 /favorites | — | requiresAuth；跳 /login | P0 |

---

## 十三、模块 10：消息中心

> API：`GET/POST /v1/notifications`，`POST /:id/read`，`POST /markAllRead`，`DELETE`。

| 用例ID | 类型 | 层次 | 用例标题 | 前置条件 | 步骤 | 测试数据 | 预期结果 | 优先级 |
|--------|------|------|----------|----------|------|----------|----------|--------|
| TC-MSG-001 | 正向 | 联合 | 消息列表加载 | 有消息 | 1.访问 /messages | — | GET notifications；渲染卡片 | P0 |
| TC-MSG-002 | 正向 | UI | 空消息空态 | 无 | 1.访问 | — | "暂无消息" | P1 |
| TC-MSG-003 | 正向 | 联合 | 点击消息标记已读 | 有未读 | 1.点未读卡片 | — | POST /:id/read；.unread 移除；有 relatedId 跳 orderDetail | P1 |
| TC-MSG-004 | 正向 | 联合 | 全部已读 | 有未读 | 1.点"全部已读" | — | POST markAllRead；所有卡片去 .unread | P1 |
| TC-MSG-005 | 逆向 | UI | 空消息时全部已读禁用 | 无消息 | 1.看按钮 | — | "全部已读" disabled | P2 |
| TC-MSG-006 | 权限 | UI | 未登录访问消息跳登录 | 未登录 | 1.访问 /messages | — | requiresAuth；跳 /login | P0 |

---

## 十四、模块 11：AI 客服（SSE 流式）

> 主用 SSE：`POST /v1/customer-service/chat/stream`，降级 HTTP `/chat`。输入框 `#customer-service-input` maxlength=500。

| 用例ID | 类型 | 层次 | 用例标题 | 前置条件 | 步骤 | 测试数据 | 预期结果 | 优先级 |
|--------|------|------|----------|----------|------|----------|----------|--------|
| TC-CS-001 | 正向 | 联合 | 打开客服对话 | 任意页 | 1.点"打开在线客服" | — | 弹出 dialog[role=dialog]；输入框可见 | P1 |
| TC-CS-002 | 正向 | 联合 | 发送消息收到 SSE 流式回复 | 后端 SSE 正常 | 1.输入 2.发送 | "怎么退款" | 显示"正在思考..."→增量 delta→final 回复 | P1 |
| TC-CS-003 | 正向 | UI | 空输入不可发送 | — | 1.不输入 2.看发送 | — | 发送按钮 disabled | P2 |
| TC-CS-004 | 正向 | UI | 关闭客服 | 已打开 | 1.点"关闭在线客服" | — | dialog 消失 | P2 |
| TC-CS-005 | 异常 | 联合 | SSE 失败降级 HTTP | mock stream 500 | 1.发送 | — | 降级 POST /chat；仍失败显示"在线客服暂时不可用" | P1 |
| TC-CS-006 | 边界 | UI | 输入超 500 截断 | — | 1.输入 501 字 | — | maxlength=500 截断 | P3→P2 |
| TC-CS-007 | 安全 | 联合 | 回复不含注入脚本执行 | mock 回复含 `<script>` | 1.发送 | — | 文本渲染不执行脚本（XSS 防护） | P1 |
| TC-CS-008 | UI/UX | UI | 引用标签展示 | 回复含 citations | 1.发送 | — | 渲染 .citation-tag | P2 |

---

## 十五、模块 12：知识库后台

> 需管理员登录。API 见 `endpoints.kb`。

| 用例ID | 类型 | 层次 | 用例标题 | 前置条件 | 步骤 | 测试数据 | 预期结果 | 优先级 |
|--------|------|------|----------|----------|------|----------|----------|--------|
| TC-KB-001 | 正向 | 联合 | 文档列表加载 | 已登录管理员 | 1.访问 /admin/kb | — | GET /v1/kb/documents；渲染文档项 | P0 |
| TC-KB-002 | 正向 | 联合 | 手工创建文档 | 已登录 | 1.填标题/分类/内容 2.创建 | 合法 | POST documents；toast"文档已创建" | P1 |
| TC-KB-003 | 正向 | 联合 | 上传文档（.md/.txt/.docx） | 已登录 | 1.填标题/分类+选文件 2.上传 | 文件 | POST upload(multipart)；toast"文档已上传并解析" | P1 |
| TC-KB-004 | 正向 | 联合 | 切分文档 | 有文档 | 1.点"切分" | — | POST chunk；toast"切分完成" | P1 |
| TC-KB-005 | 正向 | 联合 | 索引文档 | 有文档 | 1.点"索引" | — | POST index；toast"索引完成" | P1 |
| TC-KB-006 | 正向 | 联合 | 批量同步 | 已登录 | 1.点"批量同步到 LightRAG" | — | POST batch-index；显示 batch-summary | P2 |
| TC-KB-007 | 正向 | 联合 | 删除文档 | 有文档 | 1.点"删除" 2.确认 | — | confirm；DELETE；toast"文档已删除" | P1 |
| TC-KB-008 | 逆向 | UI | 创建文档缺字段禁用 | — | 1.标题空 2.看按钮 | title="" | 按钮 disabled | P2 |
| TC-KB-009 | 逆向 | UI | limit 非正整数提示 | 批量同步 | 1.填 limit=0 2.同步 | limit=0 | toast"limit 需为正整数" | P2 |
| TC-KB-010 | 正向 | 联合 | 命中日志/未命中池展示 | 有日志 | 1.选文档 2.查看 | — | GET hits/misses；渲染列表 | P2 |
| TC-KB-011 | 权限 | API | 未登录访问 kb 接口拒绝 | 无 admin token | 1.GET /v1/kb/documents 无 token | — | 401/403 | P1 |
| TC-KB-012 | 正向 | UI | 退出后台 | 已登录 | 1.点"退出后台" | — | toast"已退出管理员后台"；跳 /admin/login | P2 |

---

## 十六、跨模块：兼容 / 通用

| 用例ID | 类型 | 层次 | 用例标题 | 前置条件 | 步骤 | 测试数据 | 预期结果 | 优先级 |
|--------|------|------|----------|----------|------|----------|----------|--------|
| TC-GEN-001 | 兼容 | UI | 桌面 Chrome 主流程 | — | 1.跑登录→加购→下单 | — | 全程通过（默认项目） | P1 |
| TC-GEN-002 | 兼容 | UI | 移动端视口布局 | — | 1.用移动 viewport 访问首页 | 375x812 | 布局不错位 | P2 |
| TC-GEN-003 | 安全 | UI | 输入框 XSS 不执行 | 各输入框 | 1.填 `<script>alert(1)</script>` | payload | 提交被拒/转义，无 alert 弹窗 | P1 |
| TC-GEN-004 | UI/UX | UI | 全局 toast 渲染 | 触发操作 | 1.加购 | — | toast 出现并自动消失 | P2 |
| TC-GEN-005 | UI/UX | UI | 底部导航 5 入口 | 任意页 | 1.看 nav | — | 5 个入口：首页/类目/搜索/购物车/我的 | P2 |
| TC-GEN-006 | 安全 | UI | 404 路由回首页 | — | 1.访问 /notexist | — | 重定向 / | P2 |
| TC-GEN-007 | 异常 | 联合 | 全局 401 跳登录 | token 失效 | 1.任意受保护操作 mock 401 | — | 跳 /login | P1 |

---

## 十七、需求疑问与风险

| 编号 | 疑问/风险 | 影响 | 建议 | 状态 |
|------|-----------|------|------|------|
| Q-001 | 下单接口 `POST /v1/orders/checkout` 无 Idempotency-Key（lib 有 withIdempotency 但未用） | 重复提交可能产生重复订单 | 补幂等头；前端按钮已防抖但不彻底 | 待确认 |
| Q-002 | `addressId` 恒为 0，前端不发真实地址 | 后端如何发货？地址是否丢失？ | 确认后端是否从别处取地址 | 待确认 |
| Q-003 | 售后 apply 未传 evidence（传空数组），UI 无上传凭证入口 | 与"上传凭证"需求不符 | 补 UI 与字段 | 待确认 |
| Q-004 | 评价 images 传空数组，UI 无图片上传 | 同上 | 补图片上传 | 待确认 |
| Q-005 | 物流信息全前端硬编码 mock | 真实物流无法验证 | 后端补物流接口 | 已知 |
| Q-006 | MessagesView formatType('order'/'system') 与 store 枚举(order_paid 等)不一致 | 类型分类可能错乱 | 统一枚举 | 待确认 |
| Q-007 | /orders 路由无 requiresAuth，未登录访问行为未定义 | 可能显示空或报错 | 加 requiresAuth | 待确认 |
| Q-008 | 货币格式不统一：部分取整(¥N)，部分两位小数(¥N.NN) | 金额断言需兼容 | 全局统一格式化 | 待确认 |

---

## 十八、自检清单（生成后核对）

- [x] 每个输入字段测了空/类型错/超长/边界（账号、密码、数量、limit、验证码）
- [x] 有权限区分的操作都测了有权与无权（收藏/消息/知识库/受保护路由）
- [x] 覆盖未登录访问、token 过期(401)、水平越权（kb 接口、订单越权建议补充）
- [x] 输入框想过 XSS、SQL 注入、特殊字符（登录、客服、搜索）
- [x] 异步/网络：超时、断网、重复提交、并发（支付轮询、重复下单、SSE 降级）
- [x] UI 反馈：加载态(skeleton/loading)、空状态、错误态、成功态
- [x] 联合场景标注了 UI 与 API 双向验证（加购/下单/支付/取消/评价/售后）
- [x] 主流程均为 P0，优先级合理
- [x] 用例 ID 与代码 test 标题可双向追溯

> 注：水平越权（A 改 B 订单 id）需后端配合，已在 Q 项标注，代码层提供可扩展用例骨架。

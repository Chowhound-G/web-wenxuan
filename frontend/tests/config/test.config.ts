/**
 * 测试配置文件（统一管理账号、路径、环境）
 * --------------------------------------------------
 * 所有测试账号、基础路径、超时、API 端点集中在此。
 * 优先级：环境变量 > 本文件默认值。可在 CI 或本地通过 env 覆盖，无需改代码。
 *
 * 使用方式：
 *   import { testConfig } from '../config/test.config'
 *   await page.goto(testConfig.routes.login)
 *
 * 环境变量（可选覆盖）：
 *   TEST_BASE_URL            前端地址（默认 http://127.0.0.1:5173）
 *   TEST_API_BASE            后端 API 地址（默认 http://localhost:8080/api）
 *   TEST_USER_ACCOUNT        普通用户账号
 *   TEST_USER_PASSWORD       普通用户密码
 *   TEST_NEW_USER_ACCOUNT    注册用新账号（每次跑会尝试注册）
 *   TEST_ADMIN_ACCOUNT       管理员账号
 *   TEST_ADMIN_PASSWORD      管理员密码
 *   TEST_PRODUCT_ID          商品详情测试用商品 ID
 *   TEST_DEFAULT_TIMEOUT     默认超时(ms)
 */

const env = process.env

/** 合并环境变量与默认值 */
const pick = (key: string, fallback: string): string => env[key] ?? fallback

export const testConfig = {
  /** 前端 Web 基础地址（Vite 默认仅绑 localhost/IPv6，故用 localhost 而非 127.0.0.1） */
  baseUrl: pick('TEST_BASE_URL', 'http://localhost:5173'),

  /** 后端 API 基础地址（用于纯 API 测试与数据准备） */
  apiBase: pick('TEST_API_BASE', 'http://localhost:8080/api'),

  /** 默认超时（毫秒） */
  timeout: Number(pick('TEST_DEFAULT_TIMEOUT', '30000')),

  /** 货币格式正则（用于金额断言，兼容 ¥N.NN 与取整 ¥N） */
  currencyRegex: /¥\d+(\.\d{1,2})?/,

  /** 测试账号集合 —— 改账号只改这里 */
  users: {
    /** 普通用户（主流程登录用） */
    normal: {
      account: pick('TEST_USER_ACCOUNT', 'user@example.com'),
      password: pick('TEST_USER_PASSWORD', '123456'),
    },
    /** 注册用新账号（建议用唯一邮箱/手机号，避免重复注册失败） */
    register: {
      account: pick('TEST_NEW_USER_ACCOUNT', `test_${Date.now()}@example.com`),
      password: pick('TEST_NEW_USER_PASSWORD', '123456'),
    },
    /** 管理员（知识库后台） */
    admin: {
      account: pick('TEST_ADMIN_ACCOUNT', 'admin'),
      password: pick('TEST_ADMIN_PASSWORD', '123456'),
    },
  },

  /** 业务固定测试数据 */
  data: {
    /** 商品详情测试使用的商品 ID（GET /v1/products/:id） */
    productId: pick('TEST_PRODUCT_ID', '1'),
    /** 售后/评价使用的订单行 ID（按实际数据调整） */
    orderItemId: '1',
  },

  /** 前端路由路径（集中维护，路由名变更只改这里） */
  routes: {
    home: '/',
    category: '/category',
    search: '/search',
    cart: '/cart',
    me: '/me',
    login: '/login',
    register: '/register',
    forgotPassword: '/forgot-password',
    phone: '/phone',
    computer: '/computer',
    appliance: '/appliance',
    productDetail: (id: string | number = testConfig.data.productId) => `/products/${id}`,
    checkout: '/checkout',
    cashier: '/cashier',
    payResult: '/pay-result',
    orders: '/orders',
    orderDetail: (id: string | number = '1') => `/orders/${id}`,
    orderLogistics: (id: string | number = '1') => `/orders/${id}/logistics`,
    favorites: '/favorites',
    messages: '/messages',
    aftersales: '/aftersales',
    aftersaleApply: '/aftersales/apply',
    reviewCreate: '/reviews/create',
    adminLogin: '/admin/login',
    knowledgeBaseAdmin: '/admin/kb',
    faq: '/faq',
    helpCenter: '/help-center',
  },

  /** 后端 API 端点（用于 API / 联合测试的数据准备与断言） */
  endpoints: {
    auth: {
      login: '/v1/auth/login',
      register: '/v1/auth/register',
    },
    products: '/v1/products',
    product: (id: string | number = testConfig.data.productId) => `/v1/products/${id}`,
    cart: '/v1/cart',
    cartItem: (id: string | number) => `/v1/cart/items/${id}`,
    orders: '/v1/orders',
    order: (id: string | number) => `/v1/orders/${id}`,
    orderCancel: (id: string | number) => `/v1/orders/${id}/cancel`,
    orderCheckout: '/v1/orders/checkout',
    payments: {
      pay: (orderId: string | number) => `/v1/payments/${orderId}/pay`,
      status: (orderId: string | number) => `/v1/payments/${orderId}/status`,
    },
    wallet: '/v1/me/wallet',
    favorites: '/v1/favorites',
    reviews: '/v1/reviews',
    aftersales: '/v1/aftersales',
    aftersaleApply: '/v1/aftersales/apply',
    aftersaleCancel: (id: string | number) => `/v1/aftersales/${id}/cancel`,
    notifications: '/v1/notifications',
    notificationRead: (id: string | number) => `/v1/notifications/${id}/read`,
    notificationMarkAllRead: '/v1/notifications/markAllRead',
    customerService: {
      chat: '/v1/customer-service/chat',
      stream: '/v1/customer-service/chat/stream',
    },
    kb: {
      documents: '/v1/kb/documents',
      document: (id: string | number) => `/v1/kb/documents/${id}`,
      upload: '/v1/kb/documents/upload',
      chunk: (id: string | number) => `/v1/kb/documents/${id}/chunk`,
      index: (id: string | number) => `/v1/kb/documents/${id}/index`,
      batchIndex: '/v1/kb/documents/batch-index',
      hits: (id: string | number) => `/v1/kb/documents/${id}/hits`,
      misses: '/v1/kb/documents/misses',
      customerServiceLogs: '/v1/kb/documents/customer-service-logs',
    },
  },

  /** localStorage 键名（用于在测试中清理/注入持久化状态） */
  storageKeys: {
    auth: 'auth:v1',
    adminAuth: 'admin-auth:v1',
    cart: 'cart:v1',
    orders: 'orders:v1',
    orderDraft: 'orderDraft:v1',
  },
} as const

export type TestConfig = typeof testConfig

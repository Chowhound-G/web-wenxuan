import axios from 'axios'

const base = (import.meta as any).env?.VITE_API_BASE || '/api'

export const api = axios.create({
  baseURL: base,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
})

export const setAuthToken = (token: string | null) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`
  } else {
    delete api.defaults.headers.common['Authorization']
  }
}

export const authHeaders = (): Record<string, string> => {
  const authorization = api.defaults.headers.common['Authorization']
  return typeof authorization === 'string' ? { Authorization: authorization } : {}
}

export const withIdempotency = () => {
  const key = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}_${Math.random().toString(16).slice(2)}`
  return { 'Idempotency-Key': key }
}

// 判断请求是否声明"静默 401"（不触发全局登录跳转）。
// 用于评价、配置等非关键接口：失败不应阻塞用户浏览或强制跳转登录。
const isSilentUnauthorized = (respOrErr: any): boolean => {
  const config = respOrErr?.config || respOrErr?.response?.config
  return Boolean(config?.skipAuthRedirect)
}

api.interceptors.response.use(
  (resp) => {
    const code = resp?.data?.code
    if (typeof code === 'number' && code !== 200) {
      if (code === 401 && !isSilentUnauthorized(resp)) {
        window.dispatchEvent(new CustomEvent('app:unauthorized'))
      }
      const msg = resp?.data?.message || resp?.data?.error?.message || '请求失败'
      const err = new Error(msg) as any
      err.response = resp
      err.code = code
      return Promise.reject(err)
    }
    return resp
  },
  (err) => {
    const status = err?.response?.status
    const ecode = err?.response?.data?.error?.code
    if ((status === 401 || ecode === 'UNAUTHORIZED') && !isSilentUnauthorized(err)) {
      window.dispatchEvent(new CustomEvent('app:unauthorized'))
    }
    return Promise.reject(err)
  },
)

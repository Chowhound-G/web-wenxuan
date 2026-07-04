import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import App from './App.vue'

import { router } from './router'
import { useAuthStore } from './stores/auth'
import { useToastStore } from './stores/toast'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')

window.addEventListener('app:unauthorized', () => {
  const auth = useAuthStore()
  const toast = useToastStore()
  const current = router.currentRoute.value

  // 防循环守卫：若已在登录/注册页，不再重复跳转，避免与 router.back() 形成死循环
  // （场景：游客在商品详情页触发 reviews 401 → 跳登录 → 点返回 → 回详情页 → 又 401 ...）
  if (current.name === 'login' || current.name === 'register') {
    return
  }

  auth.logout()
  toast.push({ type: 'info', message: '请先登录后再进行操作' })

  // redirect 只记录有效的内容页路径，排除登录/注册页自身，防止 back 回到登录页
  const targetRedirect = current.path.startsWith('/login') || current.path.startsWith('/register')
    ? '/'
    : current.fullPath

  router.push({ name: 'login', query: { redirect: targetRedirect } })
})

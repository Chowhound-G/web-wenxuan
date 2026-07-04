<script setup lang="ts">
import { RouterView, useRoute } from 'vue-router'
import { computed, onMounted, watch } from 'vue'
import { useAuthStore } from './stores/auth'
import { useFavoritesStore } from './stores/favorites'

import BottomNav from './components/BottomNav.vue'
import UiToastHost from './components/ui/UiToastHost.vue'

const route = useRoute()
const auth = useAuthStore()
const favorites = useFavoritesStore()

const showNav = computed(() => route.meta?.hideNav !== true)
const authText = computed(() => (auth.isLoggedIn ? '退出' : '登录'))

const onAuthClick = () => {
  if (!auth.isLoggedIn) {
    window.location.href = `/login?redirect=${encodeURIComponent(route.fullPath)}`
    return
  }

  const ok = window.confirm('确认退出登录？')
  if (ok) auth.logout()
}

onMounted(() => {
  if (auth.isLoggedIn) {
    favorites.fetch()
  }
})

watch(() => auth.isLoggedIn, (loggedIn) => {
  if (loggedIn) {
    favorites.fetch()
  } else {
    favorites.clear()
  }
})
</script>

<template>
  <div class="app">
    <header class="brandbar" aria-label="平台品牌栏">
      <div class="brandInner">
        <RouterLink class="brand" to="/" aria-label="元气购首页">元气购</RouterLink>
        <BottomNav v-if="showNav" />
        <div v-if="showNav" class="topActions" aria-label="顶部快捷入口">
          <RouterLink class="topAction" to="/messages">消息</RouterLink>
          <button class="topAction primary" type="button" @click="onAuthClick">{{ authText }}</button>
        </div>
      </div>
    </header>
    <RouterView class="view" />
    <UiToastHost />
  </div>
</template>

<style scoped>
.app {
  min-height: 100svh;
  display: flex;
  flex-direction: column;
  --app-brandbar-h: 52px;
}

.brandbar {
  position: sticky;
  top: 0;
  z-index: var(--z-brandbar);
  height: var(--app-brandbar-h);
  display: flex;
  align-items: center;
  border-bottom: 1px solid var(--border);
  background: var(--bg);
  backdrop-filter: saturate(180%) blur(10px);
}

.brandInner {
  width: 100%;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 8px 0 12px;
}

.brand {
  flex: 0 0 auto;
  font-weight: 900;
  letter-spacing: 0;
  color: var(--text-h);
  font-size: 16px;
  line-height: 1;
  text-decoration: none;
}

.brandInner :deep(.nav) {
  flex: 1 1 auto;
}

.topActions {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 6px;
}

.topAction {
  min-width: 42px;
  height: 32px;
  border: 1px solid var(--border);
  border-radius: var(--radius-xs);
  padding: 0 10px;
  background: var(--bg);
  color: var(--text-h);
  font-size: 12px;
  line-height: 30px;
  text-align: center;
  text-decoration: none;
  cursor: pointer;
}

.topAction.primary {
  border-color: var(--accent);
  background: var(--accent);
  color: #fff;
}

.view {
  flex: 1 1 auto;
  min-height: 0;
}

@media (min-width: 1024px) {
  .app {
    --app-brandbar-h: 64px;
    background: color-mix(in srgb, var(--code-bg) 38%, var(--bg) 62%);
  }

  .brandbar {
    justify-content: center;
  }

  .brandInner {
    width: min(1180px, calc(100% - 48px));
    padding: 0;
    gap: 32px;
  }

  .brand {
    font-size: 20px;
  }

  .topActions {
    gap: 8px;
  }

  .topAction {
    min-width: 58px;
    height: 36px;
    font-size: 13px;
    line-height: 34px;
  }
}
</style>

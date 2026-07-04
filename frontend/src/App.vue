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
  gap: 12px;
  padding: 0 12px 0 16px;
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
}
</style>

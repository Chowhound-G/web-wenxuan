<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router'

const route = useRoute()

const isActive = (name: string) => route.name === name
</script>

<template>
  <nav class="nav" aria-label="全局导航">
    <RouterLink class="item" :class="{ active: isActive('home') }" to="/">
      <span class="label">首页</span>
    </RouterLink>
    <RouterLink class="item" :class="{ active: isActive('category') }" to="/category">
      <span class="label">类目</span>
    </RouterLink>
    <RouterLink class="item" :class="{ active: isActive('search') }" to="/search">
      <span class="label">搜索</span>
    </RouterLink>
    <RouterLink class="item" :class="{ active: isActive('cart') }" to="/cart">
      <span class="label">购物车</span>
    </RouterLink>
    <RouterLink class="item" :class="{ active: isActive('me') }" to="/me">
      <span class="label">我的</span>
    </RouterLink>
  </nav>
</template>

<style scoped>
.nav {
  position: sticky;
  top: var(--app-brandbar-h, 0px);
  z-index: var(--z-nav);
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  border-bottom: 1px solid var(--border);
  background: var(--bg);
  backdrop-filter: saturate(180%) blur(10px);
}

.item {
  padding: 14px 8px;
  text-decoration: none;
  color: var(--text);
  display: grid;
  place-items: center;
  gap: 6px;
  font-size: 12px;
  letter-spacing: 0.2px;
}

.item.active {
  color: var(--text-h);
}

.label {
  font-size: 12px;
}

@media (min-width: 1024px) {
  .nav {
    display: flex;
    justify-content: center;
    gap: 6px;
    padding: 10px 32px;
  }

  .item {
    min-width: 104px;
    padding: 10px 16px;
    border-radius: 999px;
    font-size: 14px;
  }

  .item.active {
    background: var(--accent-bg);
    color: var(--accent);
  }

  .label {
    font-size: 14px;
  }
}
</style>

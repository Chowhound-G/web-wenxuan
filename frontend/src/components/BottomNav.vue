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
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 4px;
  overflow-x: auto;
  scrollbar-width: none;
}

.nav::-webkit-scrollbar {
  display: none;
}

.item {
  flex: 0 0 auto;
  min-width: 56px;
  padding: 9px 12px;
  border-radius: var(--radius-pill);
  text-decoration: none;
  color: var(--text);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  letter-spacing: 0;
}

.item.active {
  background: var(--accent-bg);
  color: var(--accent);
  font-weight: 800;
}

.label {
  font-size: 12px;
}

@media (min-width: 1024px) {
  .nav {
    gap: 8px;
    overflow: visible;
  }

  .item {
    min-width: 104px;
    padding: 10px 16px;
    font-size: 14px;
  }

  .label {
    font-size: 14px;
  }
}
</style>

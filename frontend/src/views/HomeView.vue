<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import { useAuthStore } from '../stores/auth'
import { useCartStore } from '../stores/cart'
import { useToastStore } from '../stores/toast'
import { api } from '../lib/api'
import { mapBackendProduct } from '../lib/productMapper'
import heroMarketImage from '../assets/generated/hero-market.png'

type LoadState = 'loading' | 'ready' | 'empty' | 'error'

type CategoryShortcut = {
  id: string
  name: string
  icon: string
}

type ProductCard = {
  id: string
  title: string
  price: number
  cover: string
  tags: string[]
  rating: number
  sales: number
  brand: string
}

const router = useRouter()
const auth = useAuthStore()
const cart = useCartStore()
const toast = useToastStore()

const state = ref<LoadState>('loading')
const keyword = ref('')

const CAT_ICONS: Record<string, string> = {
  c_phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>',
  c_laptop: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="2" y1="20" x2="22" y2="20"></line></svg>',
  c_wear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 18h12"></path><path d="M6 6h12"></path><rect x="6" y="6" width="12" height="12" rx="2"></rect><path d="M12 10v4"></path></svg>',
  c_home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>',
  c_food: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21.94c-5.5 0-10-4.5-10-10a10 10 0 0 1 10-10c5.5 0 10 4.5 10 10a10 10 0 0 1-10 10Z"></path><path d="m9 12 2 2 4-4"></path></svg>',
  c_beauty: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 2 5 5"></path><path d="m15 11 5 5"></path><path d="m19 17-6-6"></path><path d="M21 21l-4.5-4.5"></path><path d="M3 21l9-9"></path><path d="m9 8 3 3"></path><path d="M14 14l3 3"></path></svg>',
  c_baby: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="3"></circle><path d="M12 22V8"></path><path d="M5 12V11c0-2 1.5-3 3.5-3h7c2 0 3.5 1 3.5 3v1"></path><path d="M9 18h6"></path><path d="M10 22h4"></path></svg>',
  c_more: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="12" r="1"></circle></svg>',
}

const categories = ref<CategoryShortcut[]>([
  { id: 'c_phone', name: '手机', icon: CAT_ICONS.c_phone },
  { id: 'c_laptop', name: '电脑', icon: CAT_ICONS.c_laptop },
  { id: 'c_digital', name: '数码', icon: CAT_ICONS.c_wear },
  { id: 'c_home', name: '家电', icon: CAT_ICONS.c_home },
  { id: 'c_food', name: '食品', icon: CAT_ICONS.c_food },
  { id: 'c_beauty', name: '美妆', icon: CAT_ICONS.c_beauty },
  { id: 'c_daily', name: '生活', icon: CAT_ICONS.c_baby },
  { id: 'c_more', name: '更多', icon: CAT_ICONS.c_more },
])

const banners = ref<{ id: string; title: string; subtitle: string; image: string }[]>([
  {
    id: 'b1',
    title: '现代数码生活',
    subtitle: '手机、电脑、耳机与智能穿戴精选上新',
    image: 'https://images.pexels.com/photos/5082579/pexels-photo-5082579.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
  {
    id: 'b2',
    title: '高效办公桌面',
    subtitle: '轻薄本、显示器、键鼠外设一站配齐',
    image: 'https://images.pexels.com/photos/374074/pexels-photo-374074.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
  {
    id: 'b3',
    title: '质感居家日常',
    subtitle: '家电、收纳、美妆与食品生鲜安心选',
    image: 'https://images.pexels.com/photos/4050299/pexels-photo-4050299.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
])

const products = ref<ProductCard[]>([])

const priceFmt = new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' })
const hasProducts = computed(() => products.value.length > 0)
const authText = computed(() => (auth.isLoggedIn ? '退出' : '登录'))
const productCountText = computed(() => `${products.value.length || 0} 件精选`)

const submitSearch = () => {
  const q = keyword.value.trim()
  router.push({ name: 'search', query: q ? { q } : undefined })
}

const formatRating = (rating: number) => `⭐ ${rating.toFixed(1)}`

const onAuthClick = () => {
  if (!auth.isLoggedIn) {
    router.push({ name: 'login', query: { redirect: router.currentRoute.value.fullPath } })
    return
  }

  const ok = window.confirm('确认退出登录？')
  if (ok) auth.logout()
}

const goCategory = (c: CategoryShortcut) => {
  if (c.id === 'c_phone') {
    router.push({ name: 'phone' })
    return
  }
  if (c.id === 'c_laptop') {
    router.push({ name: 'computer' })
    return
  }
  if (c.id === 'c_home') {
    router.push({ name: 'appliance' })
    return
  }
  if (c.id === 'c_more') {
    router.push({ name: 'category' })
    return
  }
  router.push({ name: 'category', query: { category: c.id } })
}
 
const goProduct = (p: ProductCard) => {
  router.push({ name: 'productDetail', params: { id: p.id } })
}

const addToCart = (p: ProductCard) => {
  cart.addItem({ productId: p.id, skuId: 'default', title: p.title, price: p.price, qty: 1, cover: p.cover })
  toast.push({ type: 'success', message: '已加入购物车' })
}

const retry = () => {
  state.value = 'loading'
  load().catch(() => {
    state.value = 'error'
  })
}

const load = async () => {
  state.value = 'loading'
  try {
    const res = await api.get('/v1/products', { params: { page: 1, size: 12 } })
    const list = Array.isArray(res.data?.data) ? res.data.data : []
    products.value = list.slice(0, 12).map((x: any) => mapBackendProduct(x, { fallbackRating: 4.5 }) as ProductCard)
    state.value = products.value.length === 0 ? 'empty' : 'ready'
  } catch {
    state.value = 'error'
  }
}

onMounted(() => {
  load()
})
</script>

<template>
  <div class="page">
    <header class="topbar" aria-label="首页搜索和账号操作">
      <form class="search" role="search" @submit.prevent="submitSearch">
        <input
          v-model="keyword"
          class="searchInput"
          type="search"
          inputmode="search"
          autocomplete="off"
          placeholder="搜索商品、品牌、类目"
          aria-label="搜索"
        />
        <button class="searchBtn" type="submit">搜索</button>
      </form>
    </header>

    <main class="content" aria-live="polite">
      <section class="storefront" aria-label="首页精选">
        <aside class="categoryRail" aria-label="商品分类">
          <div class="railTitle">商品分类</div>
          <button v-for="c in categories" :key="c.id" class="railItem" type="button" @click="goCategory(c)">
            <span class="railIcon" aria-hidden="true" v-html="c.icon"></span>
            <span>{{ c.name }}</span>
          </button>
        </aside>

        <section class="heroPanel" aria-label="精选导购">
          <div class="heroMedia">
            <img
              class="heroImage"
              :src="heroMarketImage"
              alt="精选数码家电与生活好物"
            />
          </div>
          <div class="heroCopy">
            <div class="eyebrow">Yuanqi Market</div>
            <h1 class="heroTitle">精选好物，一站购齐</h1>
            <p class="heroDesc">数码家电、办公桌面、居家生活按场景整理，价格、评价和库存信息一眼看清。</p>
            <div class="heroStats" aria-label="平台服务亮点">
              <span>正品优选</span>
              <span>快速加购</span>
              <span>售后可查</span>
            </div>
            <div class="heroActions">
              <button class="heroPrimary" type="button" @click="router.push({ name: 'search' })">浏览精选</button>
              <button class="heroSecondary" type="button" @click="router.push({ name: 'category' })">查看分类</button>
            </div>
          </div>
        </section>

        <aside class="servicePanel" aria-label="快捷服务">
          <div class="serviceBlock">
            <div class="serviceTitle">欢迎来到元气购</div>
            <p class="serviceDesc">登录后查看订单、收藏和消息。</p>
            <button class="serviceBtn" type="button" @click="onAuthClick">{{ authText }}</button>
          </div>
          <button class="serviceLink" type="button" @click="router.push({ name: 'messages' })">
            消息中心
            <span>查看通知</span>
          </button>
          <button class="serviceLink warm" type="button" @click="router.push({ name: 'cart' })">
            购物车
            <span>管理已选商品</span>
          </button>
        </aside>
      </section>

      <section class="cats" aria-label="快捷类目">
        <button
          v-for="c in categories"
          :key="c.id"
          class="cat"
          type="button"
          @click="goCategory(c)"
        >
          <span class="catIcon" aria-hidden="true" v-html="c.icon"></span>
          <span class="catName">{{ c.name }}</span>
        </button>
      </section>

      <section class="banner" aria-label="活动横幅">
        <div class="bannerTrack">
          <article v-for="b in banners" :key="b.id" class="bannerCard">
            <img class="bannerImg" :src="b.image" :alt="b.title" loading="lazy" decoding="async" />
            <div class="bannerText">
              <div class="bannerTitle">{{ b.title }}</div>
              <div class="bannerSub">{{ b.subtitle }}</div>
            </div>
          </article>
        </div>
      </section>

      <section class="section">
        <div class="sectionHead">
          <div>
            <h2 class="sectionTitle">为你推荐</h2>
            <p class="sectionDesc">{{ productCountText }}，覆盖数码、家电与生活方式</p>
          </div>
          <button class="sectionMore" type="button" @click="router.push({ name: 'search' })">
            查看更多
          </button>
        </div>

        <div v-if="state === 'loading'" class="grid" aria-label="加载中">
          <div v-for="n in 6" :key="n" class="skeletonCard" role="status" aria-label="加载中"></div>
        </div>

        <div v-else-if="state === 'error'" class="panel" role="alert">
          <div class="panelTitle">网络开小差了</div>
          <div class="panelDesc">请检查网络连接后重试</div>
          <button class="panelBtn" type="button" @click="retry">重试</button>
        </div>

        <div v-else-if="state === 'empty'" class="panel">
          <div class="panelTitle">暂无推荐商品</div>
          <div class="panelDesc">稍后再来看看</div>
          <button class="panelBtn" type="button" @click="retry">刷新</button>
        </div>

        <div v-else class="grid" aria-label="商品列表">
          <article v-for="p in products" :key="p.id" class="card">
            <button class="cardBtn" type="button" @click="goProduct(p)">
              <img class="cover" :src="p.cover" :alt="p.title" loading="lazy" decoding="async" />
              <div class="meta">
                <div class="title">{{ p.title }}</div>
                <div class="brandLine">{{ p.brand || '精选好物' }} · 已售 {{ p.sales || 0 }}</div>
                <div class="row">
                  <div class="price">{{ priceFmt.format(p.price) }}</div>
                  <div class="rating">{{ formatRating(p.rating) }}</div>
                </div>
                <div v-if="p.tags.length" class="tags" aria-label="标签">
                  <span v-for="t in p.tags" :key="t" class="tag">{{ t }}</span>
                </div>
              </div>
            </button>
            <div class="actions">
              <button class="actionBtn" type="button" @click="addToCart(p)">加购</button>
            </div>
          </article>
        </div>

        <div v-if="state === 'ready' && !hasProducts" class="panel">
          <div class="panelTitle">暂无推荐商品</div>
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped>
.page {
  min-height: 100svh;
  display: flex;
  flex-direction: column;
}

.topbar {
  background: var(--bg);
  border-bottom: 1px solid var(--border);
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
}

.right {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  align-items: center;
}

.search {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 4px;
  background: color-mix(in srgb, var(--bg) 80%, var(--code-bg) 20%);
}

.searchInput {
  border: 0;
  outline: none;
  background: transparent;
  padding: 8px 12px;
  font-size: 14px;
  color: var(--text-h);
  min-width: 0;
}

.searchBtn {
  border: 0;
  border-radius: 999px;
  padding: 8px 12px;
  font-size: 13px;
  color: #fff;
  background: var(--accent);
  cursor: pointer;
}

.msgBtn {
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 8px 10px;
  font-size: 13px;
  background: var(--bg);
  color: var(--text-h);
  cursor: pointer;
}

.authBtn {
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 8px 10px;
  font-size: 13px;
  background: var(--bg);
  color: var(--text-h);
  cursor: pointer;
}

.content {
  padding: 14px 16px 24px;
  display: grid;
  gap: 16px;
}

.heroPanel {
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 24px;
  background: var(--bg);
  display: grid;
}

.heroCopy {
  padding: 26px 22px;
  display: grid;
  align-content: center;
  gap: 14px;
}

.eyebrow {
  color: var(--accent);
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.heroTitle {
  margin: 0;
  max-width: 560px;
  font-size: 34px;
  line-height: 1.08;
  letter-spacing: 0;
  font-weight: 850;
}

.heroDesc {
  max-width: 520px;
  color: var(--text);
  font-size: 15px;
  line-height: 1.7;
}

.heroActions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.heroPrimary,
.heroSecondary {
  border-radius: 999px;
  padding: 10px 16px;
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
}

.heroPrimary {
  border: 0;
  background: var(--accent);
  color: #fff;
}

.heroSecondary {
  border: 1px solid var(--border);
  background: var(--bg);
  color: var(--text-h);
}

.heroImage {
  width: 100%;
  height: 220px;
  object-fit: cover;
  display: block;
}

.banner {
  overflow: hidden;
}

.bannerTrack {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: minmax(260px, 1fr);
  gap: 12px;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  padding-bottom: 4px;
}

.bannerTrack::-webkit-scrollbar {
  height: 8px;
}

.bannerCard {
  scroll-snap-align: start;
  border-radius: 16px;
  border: 1px solid var(--border);
  background: var(--bg);
  min-height: 120px;
  display: grid;
  overflow: hidden;
}

.bannerImg {
  width: 100%;
  height: 112px;
  object-fit: cover;
  display: block;
}

.bannerText {
  padding: 14px 16px 16px;
  display: grid;
  gap: 6px;
}

.bannerTitle {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-h);
}

.bannerSub {
  font-size: 14px;
  color: var(--text);
}

.bannerCta {
  margin-top: 6px;
  font-size: 13px;
  color: var(--accent);
}

.cats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.cat {
  border: 1px solid var(--border);
  background: var(--bg);
  border-radius: 14px;
  padding: 12px 10px;
  display: grid;
  place-items: center;
  gap: 8px;
  cursor: pointer;
}

.catIcon {
  width: 34px;
  height: 34px;
  border-radius: 12px;
  background: color-mix(in srgb, var(--accent) 20%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent) 35%, transparent);
  display: grid;
  place-items: center;
  color: var(--accent);
  padding: 6px;
}

.catIcon :deep(svg) {
  width: 100%;
  height: 100%;
  display: block;
}

.catName {
  font-size: 13px;
  color: var(--text-h);
}

.section {
  display: grid;
  gap: 12px;
}

.sectionHead {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.sectionTitle {
  font-size: 16px;
  margin: 0;
  color: var(--text-h);
  font-weight: 700;
}

.sectionDesc {
  margin-top: 4px;
  color: var(--text);
  font-size: 13px;
}

.sectionMore {
  border: 0;
  background: transparent;
  color: var(--accent);
  cursor: pointer;
  font-size: 13px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.card {
  border: 1px solid var(--border);
  border-radius: 16px;
  background: var(--bg);
  overflow: hidden;
  transition:
    border-color 0.2s ease,
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.card:hover {
  border-color: var(--accent-border);
  transform: translateY(-2px);
  box-shadow: var(--shadow);
}

.cardBtn {
  border: 0;
  background: transparent;
  padding: 0;
  cursor: pointer;
  text-align: left;
  width: 100%;
}

.cover {
  width: 100%;
  height: 140px;
  object-fit: cover;
  display: block;
  background: var(--code-bg);
}

.meta {
  padding: 12px;
  display: grid;
  gap: 8px;
}

.title {
  font-size: 14px;
  color: var(--text-h);
  font-weight: 650;
  line-height: 1.25;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.brandLine {
  color: var(--text);
  font-size: 12px;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}

.price {
  color: var(--text-h);
  font-weight: 800;
}

.rating {
  font-size: 12px;
  color: var(--text);
  background: color-mix(in srgb, var(--code-bg) 80%, transparent);
  border: 1px solid var(--border);
  padding: 4px 8px;
  border-radius: 999px;
}

.tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.tag {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: color-mix(in srgb, var(--accent-bg) 75%, transparent);
  color: var(--text-h);
}

.actions {
  padding: 10px 12px 12px;
  border-top: 1px solid var(--border);
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
}

.actionBtn {
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 8px 10px;
  background: var(--bg);
  color: var(--text-h);
  font-size: 13px;
  cursor: pointer;
}

.panel {
  border: 1px dashed var(--border);
  border-radius: 16px;
  padding: 18px 16px;
  text-align: center;
  display: grid;
  gap: 8px;
}

.panelTitle {
  color: var(--text-h);
  font-weight: 700;
}

.panelDesc {
  color: var(--text);
  font-size: 13px;
}

.panelBtn {
  justify-self: center;
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 8px 14px;
  background: var(--bg);
  color: var(--text-h);
  cursor: pointer;
}

.skeletonCard {
  height: 232px;
  border-radius: 16px;
  border: 1px solid var(--border);
  background:
    linear-gradient(
      90deg,
      color-mix(in srgb, var(--code-bg) 70%, transparent),
      color-mix(in srgb, var(--bg) 90%, transparent),
      color-mix(in srgb, var(--code-bg) 70%, transparent)
    );
  background-size: 300% 100%;
  animation: shimmer 1.2s ease-in-out infinite;
}

@keyframes shimmer {
  0% {
    background-position: 0% 0%;
  }
  100% {
    background-position: 100% 0%;
  }
}

@media (min-width: 920px) {
  .page {
    align-items: center;
  }

  .topbar {
    width: min(1180px, calc(100% - 48px));
    margin: 18px auto 0;
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 14px;
    box-shadow: var(--shadow);
  }

  .search {
    max-width: 680px;
  }

  .content {
    padding: 20px 24px 40px;
    max-width: 1180px;
    margin: 0 auto;
    width: 100%;
    gap: 20px;
  }

  .heroPanel {
    grid-template-columns: minmax(0, 1fr) 420px;
    min-height: 340px;
  }

  .heroCopy {
    padding: 48px;
  }

  .heroTitle {
    font-size: 48px;
  }

  .heroImage {
    height: 100%;
  }

  .bannerTrack {
    grid-auto-flow: initial;
    grid-auto-columns: initial;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    overflow: visible;
  }

  .bannerCard {
    min-height: 150px;
  }

  .bannerTitle {
    font-size: 22px;
  }

  .cats {
    grid-template-columns: repeat(8, minmax(0, 1fr));
  }

  .grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .cover {
    height: 170px;
  }
}

@media (min-width: 1280px) {
  .grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .cover {
    height: 184px;
  }
}
</style>

<style scoped>
.page {
  min-height: 100svh;
  display: flex;
  flex-direction: column;
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--code-bg) 74%, var(--bg) 26%) 0, var(--bg) 360px),
    var(--bg);
}

.topbar {
  width: min(1180px, calc(100% - 24px));
  margin: 12px auto 0;
  padding: 10px;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  align-items: center;
  border: 1px solid var(--border);
  border-radius: var(--radius-xs);
  background: var(--bg);
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.07);
}

.right {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  align-items: center;
}

.search {
  min-width: 0;
  height: 44px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  border: 1px solid color-mix(in srgb, var(--accent) 32%, var(--border) 68%);
  border-radius: var(--radius-xs);
  padding: 0 5px 0 12px;
  background: color-mix(in srgb, var(--code-bg) 56%, var(--bg) 44%);
}

.search:focus-within {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-bg);
}

.searchInput {
  border: 0;
  outline: none;
  background: transparent;
  padding: 0 10px 0 0;
  font-size: 14px;
  color: var(--text-h);
  min-width: 0;
}

.searchBtn {
  min-width: 64px;
  height: 34px;
  border: 0;
  border-radius: var(--radius-xs);
  padding: 0 14px;
  font-size: 13px;
  font-weight: 800;
  color: #fff;
  background: var(--accent);
  cursor: pointer;
}

.msgBtn,
.authBtn {
  min-width: 52px;
  height: 38px;
  border: 1px solid var(--border);
  border-radius: var(--radius-xs);
  padding: 0 12px;
  font-size: 13px;
  background: var(--bg);
  color: var(--text-h);
  cursor: pointer;
}

.authBtn {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}

.content {
  width: min(1180px, calc(100% - 24px));
  margin: 0 auto;
  padding: 14px 0 36px;
  display: grid;
  gap: 14px;
}

.storefront {
  display: grid;
  gap: 12px;
}

.categoryRail,
.servicePanel,
.heroPanel,
.bannerCard,
.cat,
.card,
.panel,
.skeletonCard {
  border-radius: var(--radius-xs);
}

.categoryRail,
.servicePanel {
  display: none;
}

.heroPanel {
  min-height: 0;
  overflow: hidden;
  border: 1px solid var(--border);
  background: var(--bg);
  display: grid;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.06);
}

.heroMedia {
  min-height: 190px;
  background: var(--code-bg);
}

.heroImage {
  width: 100%;
  height: 100%;
  min-height: 190px;
  object-fit: cover;
  display: block;
}

.heroCopy {
  padding: 22px;
  display: grid;
  align-content: center;
  gap: 12px;
}

.eyebrow {
  color: var(--accent);
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0;
  text-transform: uppercase;
}

.heroTitle {
  margin: 0;
  max-width: 560px;
  font-size: 32px;
  line-height: 1.12;
  letter-spacing: 0;
  font-weight: 900;
}

.heroDesc {
  max-width: 520px;
  color: var(--text);
  font-size: 14px;
  line-height: 1.7;
}

.heroStats {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.heroStats span {
  border: 1px solid var(--border);
  border-radius: var(--radius-pill);
  padding: 5px 10px;
  color: var(--commerce-ink);
  background: color-mix(in srgb, var(--code-bg) 76%, var(--bg) 24%);
  font-size: 12px;
  font-weight: 800;
}

.heroActions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.heroPrimary,
.heroSecondary,
.serviceBtn,
.sectionMore,
.actionBtn,
.panelBtn {
  border-radius: var(--radius-xs);
  cursor: pointer;
}

.heroPrimary,
.heroSecondary {
  min-height: 40px;
  padding: 0 16px;
  font-size: 14px;
  font-weight: 800;
}

.heroPrimary {
  border: 0;
  background: var(--accent);
  color: #fff;
}

.heroSecondary {
  border: 1px solid var(--border);
  background: var(--bg);
  color: var(--text-h);
}

.cats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.cat {
  min-height: 76px;
  border: 1px solid var(--border);
  background: var(--bg);
  padding: 10px 8px;
  display: grid;
  place-items: center;
  gap: 6px;
  cursor: pointer;
}

.catIcon {
  width: 30px;
  height: 30px;
  border-radius: var(--radius-xs);
  background: var(--accent-bg);
  border: 1px solid var(--accent-border);
  display: grid;
  place-items: center;
  color: var(--accent);
  padding: 6px;
}

.catIcon :deep(svg),
.railIcon :deep(svg) {
  width: 100%;
  height: 100%;
  display: block;
}

.catName {
  font-size: 12px;
  color: var(--text-h);
}

.banner {
  overflow: hidden;
}

.bannerTrack {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: minmax(240px, 82%);
  gap: 10px;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  padding-bottom: 4px;
}

.bannerTrack::-webkit-scrollbar {
  height: 8px;
}

.bannerCard {
  scroll-snap-align: start;
  min-height: 134px;
  overflow: hidden;
  border: 1px solid var(--border);
  background: var(--bg);
  display: grid;
  grid-template-columns: 42% minmax(0, 1fr);
}

.bannerImg {
  width: 100%;
  height: 100%;
  min-height: 134px;
  object-fit: cover;
  display: block;
}

.bannerText {
  padding: 16px;
  display: grid;
  align-content: center;
  gap: 8px;
}

.bannerTitle {
  font-size: 18px;
  line-height: 1.2;
  font-weight: 900;
  color: var(--text-h);
}

.bannerSub {
  font-size: 13px;
  color: var(--text);
  line-height: 1.5;
}

.section {
  display: grid;
  gap: 12px;
}

.sectionHead {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 12px;
  padding-top: 4px;
}

.sectionTitle {
  font-size: 18px;
  margin: 0;
  color: var(--text-h);
  font-weight: 900;
}

.sectionDesc {
  margin-top: 4px;
  color: var(--text);
  font-size: 13px;
}

.sectionMore {
  border: 1px solid var(--border);
  background: var(--bg);
  color: var(--accent);
  padding: 8px 12px;
  font-size: 13px;
  font-weight: 800;
}

.grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.card {
  border: 1px solid var(--border);
  background: var(--bg);
  overflow: hidden;
  transition:
    border-color 0.2s ease,
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.card:hover {
  border-color: var(--accent-border);
  transform: translateY(-2px);
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.1);
}

.cardBtn {
  border: 0;
  background: transparent;
  padding: 0;
  cursor: pointer;
  text-align: left;
  width: 100%;
}

.cover {
  width: 100%;
  height: 132px;
  object-fit: cover;
  display: block;
  background: var(--code-bg);
}

.meta {
  padding: 10px;
  display: grid;
  gap: 7px;
}

.title {
  font-size: 14px;
  color: var(--text-h);
  font-weight: 800;
  line-height: 1.28;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.brandLine {
  color: var(--text);
  font-size: 12px;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.price {
  color: #b45309;
  font-weight: 900;
  overflow-wrap: anywhere;
}

.rating {
  flex: 0 0 auto;
  font-size: 12px;
  color: var(--text);
  background: color-mix(in srgb, var(--code-bg) 80%, transparent);
  border: 1px solid var(--border);
  padding: 3px 7px;
  border-radius: var(--radius-pill);
}

.tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.tag {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 6px;
  border: 1px solid var(--accent-border);
  background: var(--accent-bg);
  color: var(--accent);
}

.actions {
  padding: 8px 10px 10px;
  border-top: 1px solid var(--border);
  display: grid;
  grid-template-columns: 1fr;
}

.actionBtn {
  border: 1px solid var(--border);
  min-height: 30px;
  padding: 5px 10px;
  background: var(--bg);
  color: var(--text-h);
  font-size: 12px;
  font-weight: 800;
}

.actionBtn:first-child {
  border-color: var(--commerce-warm);
  background: var(--commerce-warm-bg);
  color: #92400e;
}

.panel {
  border: 1px dashed var(--border);
  padding: 18px 16px;
  text-align: center;
  display: grid;
  gap: 8px;
  background: var(--bg);
}

.panelTitle {
  color: var(--text-h);
  font-weight: 800;
}

.panelDesc {
  color: var(--text);
  font-size: 13px;
}

.panelBtn {
  justify-self: center;
  border: 1px solid var(--border);
  padding: 8px 14px;
  background: var(--bg);
  color: var(--text-h);
}

.skeletonCard {
  height: 220px;
  border: 1px solid var(--border);
  background:
    linear-gradient(
      90deg,
      color-mix(in srgb, var(--code-bg) 72%, transparent),
      color-mix(in srgb, var(--bg) 90%, transparent),
      color-mix(in srgb, var(--code-bg) 72%, transparent)
    );
  background-size: 300% 100%;
  animation: shimmer 1.2s ease-in-out infinite;
}

@keyframes shimmer {
  0% {
    background-position: 0% 0%;
  }
  100% {
    background-position: 100% 0%;
  }
}

@media (max-width: 520px) {
  .topbar {
    grid-template-columns: minmax(0, 1fr);
  }

  .right {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }

  .msgBtn,
  .authBtn {
    width: 100%;
  }
}

@media (min-width: 920px) {
  .page {
    align-items: center;
  }

  .topbar {
    width: min(1180px, calc(100% - 48px));
    margin-top: 18px;
    padding: 12px;
  }

  .search {
    max-width: none;
  }

  .content {
    width: min(1180px, calc(100% - 48px));
    padding: 16px 0 42px;
    gap: 16px;
  }

  .storefront {
    grid-template-columns: 196px minmax(0, 1fr) 220px;
    align-items: stretch;
  }

  .categoryRail,
  .servicePanel {
    display: grid;
    border: 1px solid var(--border);
    background: var(--bg);
    box-shadow: 0 8px 24px rgba(15, 23, 42, 0.05);
  }

  .categoryRail {
    align-content: start;
    gap: 4px;
    padding: 14px;
  }

  .railTitle {
    padding: 0 4px 8px;
    color: var(--text-h);
    font-weight: 900;
  }

  .railItem {
    width: 100%;
    min-height: 38px;
    border: 0;
    border-radius: var(--radius-xs);
    background: transparent;
    color: var(--text-h);
    display: grid;
    grid-template-columns: 24px minmax(0, 1fr);
    align-items: center;
    gap: 8px;
    padding: 7px 8px;
    text-align: left;
    cursor: pointer;
  }

  .railItem:hover {
    background: var(--accent-bg);
    color: var(--accent);
  }

  .railIcon {
    width: 24px;
    height: 24px;
    border-radius: 7px;
    display: grid;
    place-items: center;
    color: currentColor;
    background: color-mix(in srgb, currentColor 9%, transparent);
    padding: 5px;
  }

  .heroPanel {
    min-height: 384px;
    grid-template-columns: minmax(0, 0.92fr) minmax(320px, 1.08fr);
  }

  .heroMedia {
    min-height: 384px;
    order: 2;
  }

  .heroImage {
    min-height: 384px;
  }

  .heroCopy {
    order: 1;
    padding: 38px;
  }

  .heroTitle {
    font-size: 44px;
  }

  .servicePanel {
    align-content: start;
    gap: 10px;
    padding: 14px;
  }

  .serviceBlock {
    display: grid;
    gap: 9px;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--border);
  }

  .serviceTitle {
    color: var(--text-h);
    font-weight: 900;
    line-height: 1.35;
  }

  .serviceDesc {
    color: var(--text);
    font-size: 13px;
    line-height: 1.5;
  }

  .serviceBtn {
    min-height: 36px;
    border: 0;
    background: var(--accent);
    color: #fff;
    font-weight: 800;
  }

  .serviceLink {
    border: 1px solid var(--border);
    border-radius: var(--radius-xs);
    background: color-mix(in srgb, var(--code-bg) 68%, var(--bg) 32%);
    color: var(--text-h);
    padding: 12px;
    text-align: left;
    display: grid;
    gap: 4px;
    cursor: pointer;
    font-weight: 900;
  }

  .serviceLink span {
    color: var(--text);
    font-size: 12px;
    font-weight: 500;
  }

  .serviceLink.warm {
    border-color: color-mix(in srgb, var(--commerce-warm) 42%, var(--border) 58%);
    background: var(--commerce-warm-bg);
  }

  .cats {
    display: none;
  }

  .bannerTrack {
    grid-auto-flow: initial;
    grid-auto-columns: initial;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    overflow: visible;
    gap: 12px;
  }

  .bannerCard {
    min-height: 154px;
  }

  .bannerImg {
    min-height: 154px;
  }

  .bannerTitle {
    font-size: 20px;
  }

  .grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
  }

  .cover {
    height: 170px;
  }
}

@media (min-width: 1280px) {
  .grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .cover {
    height: 178px;
  }
}
</style>

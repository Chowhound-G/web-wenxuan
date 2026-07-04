<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import UiButton from '../components/ui/UiButton.vue'
import UiEmptyState from '../components/ui/UiEmptyState.vue'
import { useCartStore } from '../stores/cart'
import { useToastStore } from '../stores/toast'
import { api } from '../lib/api'
import { mapBackendProduct } from '../lib/productMapper'

type LoadState = 'loading' | 'ready' | 'error'

type Product = {
  id: string
  title: string
  price: number
  cover: string
  tags: string[]
  sub?: string
  rating: number
  sales: number
  categoryId: string
}

type Category = {
  id: string
  name: string
  tone: string
  subs: string[]
}

const route = useRoute()
const router = useRouter()
const cart = useCartStore()
const toast = useToastStore()

const state = ref<LoadState>('loading')
const categories = ref<Category[]>([
  { id: 'c_phone', name: '手机', tone: '#aa3bff', subs: ['旗舰', '性价比', '折叠屏', '配件'] },
  { id: 'c_laptop', name: '电脑', tone: '#0ea5e9', subs: ['轻薄本', '游戏本', '显示器', '外设'] },
  { id: 'c_home', name: '家电', tone: '#16a34a', subs: ['冰洗', '清洁', '厨房', '个护'] },
  { id: 'c_digital', name: '数码配件', tone: '#f59e0b', subs: ['耳机', '充电', '存储', '智能穿戴'] },
  { id: 'c_daily', name: '生活百货', tone: '#2563eb', subs: ['收纳', '家居', '文具', '清洁耗材'] },
  { id: 'c_beauty', name: '美妆个护', tone: '#db2777', subs: ['护肤', '彩妆', '洗护', '香氛'] },
  { id: 'c_food', name: '食品饮料', tone: '#ef4444', subs: ['零食', '咖啡茶饮', '粮油', '生鲜冷冻'] },
  { id: 'c_sport', name: '运动户外', tone: '#10b981', subs: ['跑步', '露营', '健身', '骑行'] },
])

const active = ref<string>('')
const activeSub = ref<string>('全部')
const sortKey = ref<'default' | 'sales' | 'priceAsc' | 'priceDesc' | 'rating'>('default')
const tagFilter = ref<string>('全部')
const keyword = ref('')

const all = ref<Product[]>([])

const routeCategory = computed(() => {
  const raw = route.query.category
  return typeof raw === 'string' ? raw : ''
})

watch(
  routeCategory,
  (c) => {
    const next = categories.value.some((x) => x.id === c) ? c : categories.value[0]?.id || ''
    active.value = next
  },
  { immediate: true },
)

const priceFmt = new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' })
const formatRating = (rating: number) => `⭐ ${rating.toFixed(1)}`

const activeCategory = computed(() => categories.value.find((c) => c.id === active.value) ?? null)
const resultCountText = computed(() => `${filtered.value.length} 件商品`)

watch(
  active,
  () => {
    activeSub.value = '全部'
    tagFilter.value = '全部'
    sortKey.value = 'default'
  },
  { immediate: true },
)

const subOptions = computed(() => {
  const c = activeCategory.value
  const subs = c?.subs ?? []
  return ['全部', ...subs]
})

const tagOptions = computed(() => {
  const items = all.value.filter((p) => p.categoryId === active.value)
  const tags = Array.from(new Set(items.flatMap((p) => p.tags))).filter(Boolean)
  return ['全部', ...tags]
})

const filtered = computed(() => {
  let items = all.value.filter((p) => p.categoryId === active.value)
  const q = keyword.value.trim().toLowerCase()
  if (q) {
    items = items.filter((p) => {
      const haystack = [p.title, p.sub, ...p.tags].filter(Boolean).join(' ').toLowerCase()
      return haystack.includes(q)
    })
  }
  if (activeSub.value !== '全部') {
    const sub = activeSub.value
    items = items.filter((p) => (p.sub ? p.sub === sub : p.tags.includes(sub)))
  }
  if (tagFilter.value !== '全部') {
    const t = tagFilter.value
    items = items.filter((p) => p.tags.includes(t))
  }
  const key = sortKey.value
  if (key === 'sales') return [...items].sort((a, b) => b.sales - a.sales)
  if (key === 'priceAsc') return [...items].sort((a, b) => a.price - b.price)
  if (key === 'priceDesc') return [...items].sort((a, b) => b.price - a.price)
  if (key === 'rating') return [...items].sort((a, b) => b.rating - a.rating)
  return items
})

const setCategory = (id: string) => {
  router.replace({ name: 'category', query: { category: id } })
}

const clearFilters = () => {
  keyword.value = ''
  activeSub.value = '全部'
  tagFilter.value = '全部'
  sortKey.value = 'default'
}

const goProduct = (p: Product) => {
  router.push({ name: 'productDetail', params: { id: p.id } })
}

const addToCart = (p: Product) => {
  cart.addItem({ productId: p.id, skuId: 'default', title: p.title, price: p.price, qty: 1, cover: p.cover })
  toast.push({ type: 'success', message: '已加入购物车' })
}

const retry = () => {
  load().catch(() => {
    state.value = 'error'
  })
}

const categoryIdMap: Record<string, number> = {
  c_phone: 1,
  c_laptop: 2,
  c_home: 3,
  c_digital: 4,
  c_daily: 5,
  c_beauty: 6,
  c_food: 7,
  c_sport: 8,
}

const load = async () => {
  state.value = 'loading'
  const catId = categoryIdMap[active.value]
  if (!catId) {
    // 无对应后端类目时清空
    all.value = []
    state.value = 'ready'
    return
  }
  const res = await api.get('/v1/products', { params: { category: catId, page: 1, size: 50 } })
  const list = Array.isArray(res.data?.data) ? res.data.data : []
  const items: Product[] = list.map((x: any) =>
    mapBackendProduct(x, { categoryId: active.value, fallbackRating: 4.5 }) as Product,
  )
  // 将新类目结果合并到 all 中（保留其它类目已有数据）
  all.value = [...items, ...all.value.filter((p) => p.categoryId !== active.value)]
  state.value = 'ready'
}

watch(active, () => {
  load().catch(() => {
    // 出错则仅清空该类目数据
    all.value = all.value.filter((p) => p.categoryId !== active.value)
    state.value = 'error'
  })
}, { immediate: true })
</script>

<template>
  <div class="page">
    <section class="head" aria-label="类目选择">
      <div class="headTop">
        <div>
          <div class="eyebrow">Category</div>
          <h1 class="title">类目筛选</h1>
        </div>
        <span class="count">{{ resultCountText }}</span>
      </div>

      <label class="searchBox">
        <span class="searchLabel">搜索</span>
        <input
          v-model="keyword"
          class="searchInput"
          type="search"
          inputmode="search"
          autocomplete="off"
          placeholder="搜索商品、标签或子类目"
        />
      </label>

      <div class="tabs">
        <button
          v-for="c in categories"
          :key="c.id"
          class="tab"
          :class="{ on: active === c.id }"
          type="button"
          @click="setCategory(c.id)"
        >
          {{ c.name }}
        </button>
      </div>

      <div class="toolbar" aria-label="筛选与排序">
        <div class="filterBlock">
          <div class="filterTitle">子类目</div>
          <div class="chipRow" aria-label="子类目">
            <button
              v-for="s in subOptions"
              :key="s"
              class="chip"
              :class="{ on: activeSub === s }"
              type="button"
              @click="activeSub = s"
            >
              {{ s }}
            </button>
          </div>
        </div>
        <div class="filterBlock">
          <div class="filterTitle">标签</div>
          <div class="chipRow" aria-label="标签筛选">
            <button
              v-for="t in tagOptions"
              :key="t"
              class="chip"
              :class="{ on: tagFilter === t }"
              type="button"
              @click="tagFilter = t"
            >
              {{ t }}
            </button>
          </div>
        </div>
        <div class="sortRow" aria-label="排序">
          <span class="sortLabel">排序</span>
          <button class="sortBtn" :class="{ on: sortKey === 'default' }" type="button" @click="sortKey = 'default'">
            综合
          </button>
          <button class="sortBtn" :class="{ on: sortKey === 'sales' }" type="button" @click="sortKey = 'sales'">
            销量
          </button>
          <button class="sortBtn" :class="{ on: sortKey === 'rating' }" type="button" @click="sortKey = 'rating'">
            评分
          </button>
          <button class="sortBtn" :class="{ on: sortKey === 'priceAsc' }" type="button" @click="sortKey = 'priceAsc'">
            价格↑
          </button>
          <button
            class="sortBtn"
            :class="{ on: sortKey === 'priceDesc' }"
            type="button"
            @click="sortKey = 'priceDesc'"
          >
            价格↓
          </button>
          <button class="resetBtn" type="button" @click="clearFilters">重置</button>
        </div>
      </div>
    </section>

    <main class="content" aria-live="polite">
      <UiEmptyState v-if="state === 'loading'" title="加载中..." desc="正在获取该类目商品" />
      <UiEmptyState v-else-if="state === 'error'" title="加载失败" desc="网络开小差了，请重试" action-text="重试" @action="retry" />
      <UiEmptyState v-else-if="filtered.length === 0" title="暂无商品" desc="换个关键词或筛选条件试试" />

      <div v-else class="grid" aria-label="商品列表">
        <article v-for="p in filtered" :key="p.id" class="card">
          <button class="cardBtn" type="button" @click="goProduct(p)">
            <img class="cover" :src="p.cover" :alt="p.title" loading="lazy" decoding="async" />
            <div class="meta">
              <div class="name">{{ p.title }}</div>
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
            <UiButton size="sm" type="button" @click="addToCart(p)">加购</UiButton>
          </div>
        </article>
      </div>
    </main>
  </div>
</template>

<style scoped>
.page {
  padding: 14px 16px 28px;
  display: grid;
  gap: 14px;
}

.title {
  margin: 0;
  font-size: 26px;
  line-height: 1.15;
  color: var(--text-h);
  font-weight: 900;
}

.head {
  display: grid;
  gap: 12px;
}

.headTop {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 16px;
}

.eyebrow {
  color: var(--accent);
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.count {
  flex: 0 0 auto;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 6px 9px;
  color: var(--text);
  background: var(--bg);
  font-size: 12px;
  font-weight: 800;
}

.searchBox {
  min-height: 42px;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 0 12px;
  background: var(--bg);
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.04);
}

.searchLabel {
  color: var(--text-h);
  font-size: 13px;
  font-weight: 900;
}

.searchInput {
  min-width: 0;
  width: 100%;
  border: 0;
  outline: none;
  background: transparent;
  color: var(--text-h);
  font-size: 14px;
}

.tabs {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.tab {
  min-height: 34px;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 7px 10px;
  color: var(--text);
  background: var(--bg);
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
}

.tab.on {
  color: var(--accent);
  border-color: color-mix(in srgb, var(--accent) 55%, var(--border));
  background: var(--accent-bg);
}

.toolbar {
  display: grid;
  gap: 12px;
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: color-mix(in srgb, var(--code-bg) 62%, transparent);
}

.filterBlock {
  display: grid;
  gap: 7px;
}

.filterTitle {
  color: var(--text-h);
  font-size: 12px;
  font-weight: 900;
}

.chipRow {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.chip {
  border: 1px solid var(--border);
  background: var(--bg);
  border-radius: 8px;
  padding: 5px 9px;
  font-size: 11px;
  line-height: 18px;
  cursor: pointer;
  color: var(--text);
  font-weight: 700;
}

.chip.on {
  border-color: color-mix(in srgb, var(--accent) 50%, var(--border));
  background: var(--accent-bg);
  color: var(--text-h);
  font-weight: 800;
}

.sortRow {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.sortLabel {
  font-size: 12px;
  color: var(--text);
  font-weight: 800;
  margin-right: 2px;
}

.sortBtn {
  border: 1px solid var(--border);
  background: var(--bg);
  border-radius: 8px;
  padding: 5px 9px;
  font-size: 11px;
  line-height: 18px;
  cursor: pointer;
  color: var(--text);
  font-weight: 700;
}

.sortBtn.on {
  border-color: color-mix(in srgb, var(--accent) 50%, var(--border));
  background: var(--accent-bg);
  color: var(--text-h);
  font-weight: 800;
}

.resetBtn {
  margin-left: auto;
  border: 0;
  background: transparent;
  color: var(--accent);
  font-size: 12px;
  font-weight: 900;
  cursor: pointer;
  padding: 6px 2px;
}

.content {
  display: grid;
}

.grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.card {
  border: 1px solid var(--border);
  border-radius: var(--radius-xs);
  background: var(--bg);
  overflow: hidden;
  display: grid;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.05);
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

.name {
  font-size: var(--font-md);
  color: var(--text-h);
  font-weight: 900;
  line-height: 1.25;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}

.price {
  color: #b45309;
  font-weight: 900;
}

.rating {
  font-size: var(--font-xs);
  color: var(--text);
  background: color-mix(in srgb, var(--code-bg) 80%, transparent);
  border: 1px solid var(--border);
  padding: 4px 8px;
  border-radius: 8px;
}

.tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.tag {
  font-size: 11px;
  line-height: 17px;
  padding: 2px 7px;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: color-mix(in srgb, var(--accent-bg) 75%, transparent);
  color: var(--text-h);
}

.actions {
  padding: 8px 10px 10px;
  border-top: 1px solid var(--border);
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.actions :deep(.btn.sm) {
  min-height: 30px;
  padding: 5px 10px;
  border-radius: var(--radius-xs);
  font-size: 12px;
}

@media (min-width: 920px) {
  .page {
    width: min(1180px, calc(100% - 48px));
    max-width: none;
    margin: 0 auto;
    padding: 18px 0 42px;
    gap: 16px;
  }

  .head {
    border: 1px solid var(--border);
    border-radius: 10px;
    background: var(--bg);
    padding: 16px;
    box-shadow: 0 8px 24px rgba(15, 23, 42, 0.05);
  }

  .tabs {
    gap: 8px;
  }

  .toolbar {
    grid-template-columns: minmax(0, 1fr);
  }

  .grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .cover {
    height: 178px;
  }
}
</style>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'

import { useAuthStore } from '../stores/auth'
import { useNotificationsStore } from '../stores/notifications'
import { useWalletStore } from '../stores/wallet'

const router = useRouter()
const auth = useAuthStore()
const notifications = useNotificationsStore()
const wallet = useWalletStore()

const nickname = computed(() => auth.user?.nickname ?? '未登录')
const unread = computed(() => notifications.unreadCount)
const latestTransactions = computed(() => wallet.transactions.slice(0, 3))
const avatarText = computed(() => (auth.isLoggedIn ? nickname.value.slice(0, 1) : '未'))
const priceFmt = new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' })
const orderStats = computed(() => [
  { label: '待付款', value: auth.isLoggedIn ? '0' : '--' },
  { label: '待收货', value: auth.isLoggedIn ? '0' : '--' },
  { label: '售后中', value: auth.isLoggedIn ? '0' : '--' },
])
const assetItems = computed(() => [
  { label: '优惠券', value: auth.isLoggedIn ? '0 张' : '--' },
  { label: '积分', value: auth.isLoggedIn ? '0' : '--' },
  { label: '消息', value: unread.value > 0 ? `${unread.value} 条` : '0 条' },
])

const goLogin = () => {
  router.push({ name: 'login', query: { redirect: router.currentRoute.value.fullPath } })
}

const goRegister = () => {
  router.push({ name: 'register', query: { redirect: router.currentRoute.value.fullPath } })
}

const goAuthed = (name: string) => {
  if (!auth.isLoggedIn) {
    router.push({ name: 'login', query: { redirect: router.currentRoute.value.fullPath } })
    return
  }
  router.push({ name })
}

const logout = () => {
  const ok = window.confirm('确认退出登录？')
  if (ok) {
    auth.logout()
    wallet.reset()
  }
}

onMounted(() => {
  if (auth.isLoggedIn) {
    wallet.fetch().catch(() => {})
  }
})
</script>

<template>
  <div class="page">
    <div class="sideColumn">
      <section class="profilePanel" aria-label="账号概览">
        <div class="profileMain">
          <div class="avatar" aria-hidden="true">{{ avatarText }}</div>
          <div class="profileCopy">
            <div class="eyebrow">Personal Center</div>
            <h1 class="title">我的</h1>
            <p class="subtitle">{{ auth.isLoggedIn ? `欢迎回来，${nickname}` : '登录后查看订单状态、资产优惠和售后进度。' }}</p>
          </div>
        </div>

        <div class="actions" v-if="!auth.isLoggedIn">
          <button class="primary" type="button" @click="goLogin">去登录</button>
          <button class="ghost" type="button" @click="goRegister">去注册</button>
        </div>
        <div class="actions" v-else>
          <button class="ghost" type="button" @click="logout">退出登录</button>
        </div>
      </section>

      <section class="overview" aria-label="账号数据">
        <button v-for="item in orderStats" :key="item.label" class="stat" type="button" @click="goAuthed('orders')">
          <span class="statValue">{{ item.value }}</span>
          <span class="statLabel">{{ item.label }}</span>
        </button>
      </section>
    </div>

    <div class="layout">
      <section class="panel walletPanel" aria-label="资产信息">
        <div class="panelHead">
          <div>
            <h2 class="panelTitle">资产与记录</h2>
            <p class="panelDesc">余额、优惠券、积分和消息</p>
          </div>
          <span class="badge" :class="{ on: auth.isLoggedIn }">{{ auth.isLoggedIn ? (wallet.loading ? '同步中' : '可用') : '未登录' }}</span>
        </div>

        <template v-if="auth.isLoggedIn">
          <div class="balance">{{ wallet.formattedBalance }}</div>
          <div class="assetGrid" aria-label="账户资产">
            <button v-for="item in assetItems" :key="item.label" class="assetItem" type="button" @click="item.label === '消息' ? goAuthed('messages') : undefined">
              <span>{{ item.value }}</span>
              <strong>{{ item.label }}</strong>
            </button>
          </div>
          <div v-if="latestTransactions.length" class="txList" aria-label="余额明细">
            <div v-for="tx in latestTransactions" :key="tx.id" class="txItem">
              <span>{{ tx.remark || tx.type }}</span>
              <span :class="{ income: tx.amount > 0 }">{{ priceFmt.format(tx.amount) }}</span>
            </div>
          </div>
          <div v-else class="emptyLine">暂无交易明细</div>
        </template>
        <div v-else class="emptyBox">
          <div class="emptyTitle">登录后查看资产与优惠</div>
          <p>余额、优惠券、积分和未读消息会集中展示在这里。</p>
        </div>
      </section>

      <section class="panel entryPanel" aria-label="个人中心入口">
        <div class="panelHead">
          <div>
            <h2 class="panelTitle">订单管理</h2>
            <p class="panelDesc">订单、物流、收藏和售后</p>
          </div>
        </div>
        <div class="entries">
          <button class="entry" type="button" @click="goAuthed('orders')">
            <span>我的订单</span>
            <span class="arrow">›</span>
          </button>
          <button class="entry" type="button" @click="goAuthed('favorites')">
            <span>我的收藏</span>
            <span class="arrow">›</span>
          </button>
          <button class="entry" type="button" @click="goAuthed('messages')">
            <span>消息中心</span>
            <span class="right">
              <span v-if="unread > 0" class="unread" aria-label="未读消息数">{{ unread > 99 ? '99+' : unread }}</span>
              <span class="arrow">›</span>
            </span>
          </button>
          <button class="entry" type="button" @click="goAuthed('aftersales')">
            <span>售后服务</span>
            <span class="arrow">›</span>
          </button>
          <button class="entry" type="button" @click="router.push({ name: 'helpCenter' })">
            <span>帮助中心</span>
            <span class="arrow">›</span>
          </button>
        </div>
      </section>

      <section class="panel servicePanel" aria-label="服务说明">
        <div class="panelHead">
          <div>
            <h2 class="panelTitle">服务中心</h2>
            <p class="panelDesc">未登录也可先查看购物帮助</p>
          </div>
        </div>
        <div class="serviceList">
          <button class="serviceItem" type="button" @click="router.push({ name: 'helpCenter' })">
            <span>订单追踪</span>
            <strong>物流状态实时更新</strong>
          </button>
          <button class="serviceItem" type="button" @click="goAuthed('aftersales')">
            <span>售后保障</span>
            <strong>退换修进度可查</strong>
          </button>
          <button class="serviceItem" type="button" @click="goAuthed('messages')">
            <span>消息提醒</span>
            <strong>优惠、发货、售后通知</strong>
          </button>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.page {
  padding: 16px;
  width: min(900px, 100%);
  margin: 0 auto;
  display: grid;
  gap: 14px;
}

.sideColumn {
  display: grid;
  gap: 14px;
}

.profilePanel {
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 16px;
  background: var(--bg);
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.05);
  display: grid;
  gap: 16px;
}

.profileMain {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
}

.avatar {
  width: 52px;
  height: 52px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  color: var(--text-h);
  background: color-mix(in srgb, var(--accent-bg) 86%, white);
  border: 1px solid color-mix(in srgb, var(--accent) 28%, var(--border));
  font-size: 21px;
  font-weight: 900;
}

.profileCopy {
  min-width: 0;
}

.eyebrow {
  margin: 0;
  color: var(--accent);
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.title {
  margin: 2px 0 0;
  font-size: 28px;
  line-height: 1.15;
  font-weight: 900;
  color: var(--text-h);
}

.subtitle {
  margin: 5px 0 0;
  color: var(--text);
  font-size: 14px;
  line-height: 20px;
}

.actions {
  display: flex;
  gap: 10px;
}

.primary,
.ghost {
  min-height: 38px;
  border-radius: 8px;
  padding: 8px 14px;
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
  flex: 1 1 auto;
}

.primary {
  border: 0;
  color: #fff;
  background: var(--accent);
}

.ghost {
  border: 1px solid var(--border);
  color: var(--text-h);
  background: var(--bg);
}

.overview {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.stat {
  min-width: 0;
  min-height: 76px;
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 11px;
  background: var(--bg);
  text-align: left;
  cursor: pointer;
  display: grid;
  align-content: center;
  gap: 5px;
}

.statValue {
  color: var(--text-h);
  font-size: 18px;
  line-height: 1.2;
  font-weight: 900;
}

.statLabel {
  color: var(--text);
  font-size: 12px;
  line-height: 16px;
}

.layout {
  display: grid;
  gap: 14px;
}

.panel {
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 14px;
  background: var(--bg);
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.05);
  display: grid;
  gap: 14px;
}

.panelHead {
  display: flex;
  justify-content: space-between;
  align-items: start;
  gap: 12px;
}

.panelTitle {
  margin: 0;
  color: var(--text-h);
  font-size: 17px;
  line-height: 24px;
  font-weight: 900;
}

.panelDesc {
  margin: 2px 0 0;
  color: var(--text);
  font-size: 13px;
  line-height: 18px;
}

.badge {
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 800;
  color: var(--text);
  background: color-mix(in srgb, var(--code-bg) 70%, transparent);
}

.badge.on {
  color: var(--text-h);
  border-color: color-mix(in srgb, var(--accent) 50%, var(--border));
  background: var(--accent-bg);
}

.balance {
  color: var(--text-h);
  font-size: 32px;
  line-height: 1;
  font-weight: 900;
}

.assetGrid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.assetItem {
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 10px 8px;
  background: color-mix(in srgb, var(--code-bg) 45%, transparent);
  color: var(--text-h);
  display: grid;
  gap: 4px;
  text-align: left;
  cursor: pointer;
}

.assetItem span {
  font-size: 16px;
  line-height: 20px;
  font-weight: 900;
}

.assetItem strong {
  color: var(--text);
  font-size: 12px;
  line-height: 16px;
}

.txList {
  display: grid;
  gap: 8px;
}

.txItem {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  border-top: 1px solid var(--border);
  padding-top: 9px;
  color: var(--text);
  font-size: 13px;
  line-height: 20px;
}

.income {
  color: var(--success);
  font-weight: 800;
}

.emptyLine {
  color: var(--text);
  font-size: 13px;
}

.emptyBox {
  border: 1px dashed var(--border);
  border-radius: 10px;
  padding: 14px;
  background: color-mix(in srgb, var(--code-bg) 55%, transparent);
}

.emptyTitle {
  color: var(--text-h);
  font-size: 15px;
  font-weight: 900;
}

.emptyBox p {
  margin: 5px 0 0;
  color: var(--text);
  font-size: 13px;
  line-height: 20px;
}

.entries {
  display: grid;
  gap: 8px;
}

.entry {
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 12px;
  background: color-mix(in srgb, var(--code-bg) 45%, transparent);
  color: var(--text-h);
  font-size: 14px;
  line-height: 22px;
  font-weight: 800;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  transition: border-color 0.2s, background-color 0.2s;
}

.entry:hover {
  border-color: color-mix(in srgb, var(--accent) 35%, var(--border));
}

.right {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.unread {
  min-width: 22px;
  height: 22px;
  border-radius: 8px;
  padding: 0 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 12px;
  color: #fff;
  background: var(--accent);
}

.arrow {
  color: var(--text);
  font-size: 18px;
  line-height: 1;
}

.serviceList {
  display: grid;
  gap: 8px;
}

.serviceItem {
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 11px 12px;
  background: color-mix(in srgb, var(--code-bg) 45%, transparent);
  color: inherit;
  display: grid;
  gap: 3px;
  text-align: left;
  cursor: pointer;
}

.serviceItem span {
  color: var(--text);
  font-size: 12px;
  line-height: 16px;
}

.serviceItem strong {
  color: var(--text-h);
  font-size: 14px;
  line-height: 20px;
}

@media (min-width: 920px) {
  .page {
    width: min(1180px, calc(100% - 48px));
    max-width: none;
    padding: 28px 0 48px;
    grid-template-columns: minmax(300px, 0.86fr) minmax(0, 1.14fr);
    align-items: start;
    gap: 16px;
  }

  .sideColumn {
    align-self: start;
    gap: 16px;
  }

  .profilePanel {
    align-content: start;
    align-self: start;
    padding: 18px;
  }

  .overview {
    grid-template-columns: 1fr;
    align-self: start;
  }

  .layout {
    grid-template-columns: minmax(0, 1fr) minmax(300px, 0.9fr);
    align-content: start;
    gap: 16px;
  }

  .entryPanel {
    grid-row: span 2;
  }

  .walletPanel,
  .servicePanel {
    align-content: start;
  }

  .actions {
    justify-content: flex-start;
  }

  .entries {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .entry {
    min-height: 72px;
    background: var(--bg);
  }

  .primary,
  .ghost {
    flex: 0 0 auto;
    min-width: 96px;
  }
}
</style>

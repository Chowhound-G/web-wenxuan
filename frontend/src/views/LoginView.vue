<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import UiButton from '../components/ui/UiButton.vue'
import UiInput from '../components/ui/UiInput.vue'
import { useAuthStore } from '../stores/auth'

type Mode = 'code' | 'password'
type AccountType = 'personal' | 'business'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const mode = ref<Mode>('password')
const accountType = ref<AccountType>('personal')
const account = ref('')
const code = ref('')
const password = ref('')
const agree = ref(true)
const accountTouched = ref(false)

const submitState = ref<'idle' | 'submitting'>('idle')
const codeState = ref<{ sending: boolean; secondsLeft: number }>({ sending: false, secondsLeft: 0 })
const errorText = ref<string | null>(null)

const redirectTo = computed(() => {
  const raw = route.query.redirect
  return typeof raw === 'string' && raw.startsWith('/') ? raw : '/'
})

const activeAccount = computed(() => account.value.trim())
const qrCells = Array.from({ length: 121 }, (_, index) => {
  const x = index % 11
  const y = Math.floor(index / 11)
  const inFinder =
    (x <= 2 && y <= 2) ||
    (x >= 8 && y <= 2) ||
    (x <= 2 && y >= 8)
  if (inFinder) return true
  return (x * 7 + y * 11 + x * y) % 5 === 0 || (x + y) % 7 === 0
})

const accountOk = computed(() => {
  const v = account.value.trim()
  if (/^1\d{10}$/.test(v)) return true
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return true
  return false
})

const accountWarn = computed(() => {
  const v = activeAccount.value
  if (!v) return null
  if (accountOk.value) return null
  if (!accountTouched.value) return null
  return '只能填写手机号或邮箱'
})

const canSendCode = computed(() => {
  if (codeState.value.sending || codeState.value.secondsLeft > 0) return false
  if (mode.value !== 'code') return false
  return accountOk.value
})

const canSubmit = computed(() => {
  if (submitState.value === 'submitting') return false
  if (!agree.value) return false
  if (!accountOk.value) return false
  if (mode.value === 'code') return /^\d{4,8}$/.test(code.value.trim())
  return password.value.length >= 6
})

const setMode = (next: Mode) => {
  if (mode.value === next) return
  mode.value = next
  errorText.value = null
  code.value = ''
  password.value = ''
}

const tick = () => {
  if (codeState.value.secondsLeft <= 0) return
  codeState.value = { ...codeState.value, secondsLeft: codeState.value.secondsLeft - 1 }
  if (codeState.value.secondsLeft - 1 > 0) {
    window.setTimeout(tick, 1000)
  }
}

const sendCode = async () => {
  if (!canSendCode.value) return
  errorText.value = null
  codeState.value = { sending: true, secondsLeft: 0 }
  await new Promise((r) => window.setTimeout(r, 450))
  codeState.value = { sending: false, secondsLeft: 60 }
  window.setTimeout(tick, 1000)
}

const submit = async () => {
  accountTouched.value = true
  if (!accountOk.value) {
    errorText.value = '只能填写手机号或邮箱'
    return
  }
  if (!canSubmit.value) return
  errorText.value = null
  submitState.value = 'submitting'

  try {
    await new Promise((r) => window.setTimeout(r, 500))

    if (mode.value === 'password' && password.value.length < 6) {
      throw new Error('密码至少 6 位')
    }
    if (!agree.value) {
      throw new Error('请先同意用户协议与隐私政策')
    }

    if (mode.value === 'password') {
      await auth.loginWithAccount(activeAccount.value || 'user@example.com', password.value)
    } else {
      await auth.loginWithAccount(activeAccount.value || 'user@example.com')
    }
    await router.replace(redirectTo.value)
  } catch (e) {
    const msg =
      (e as any)?.response?.data?.error?.message ||
      (e as any)?.message ||
      '登录失败，请重试'
    errorText.value = msg
  } finally {
    submitState.value = 'idle'
  }
}

const goRegister = () => {
  router.replace({ name: 'register', query: { redirect: redirectTo.value } })
}

const goForgot = () => {
  router.replace({ name: 'forgotPassword', query: { redirect: redirectTo.value } })
}

const goAgreement = () => {
  router.push({ name: 'userAgreement', query: { redirect: redirectTo.value } })
}

const goPrivacy = () => {
  router.push({ name: 'privacyPolicy', query: { redirect: redirectTo.value } })
}

</script>

<template>
  <div class="page">
    <main class="main" aria-live="polite">
      <div class="loginHead">
        <div>
          <p class="kicker">Yuanqi Account</p>
          <h1 class="pageTitle">欢迎登录元气购</h1>
        </div>
        <div class="accountTabs" role="tablist" aria-label="用户类型">
          <button
            class="accountTab"
            :class="{ active: accountType === 'personal' }"
            type="button"
            role="tab"
            :aria-selected="accountType === 'personal'"
            @click="accountType = 'personal'"
          >
            个人用户登录
          </button>
          <button
            class="accountTab"
            :class="{ active: accountType === 'business' }"
            type="button"
            role="tab"
            :aria-selected="accountType === 'business'"
            @click="accountType = 'business'"
          >
            企业用户登录
          </button>
        </div>
      </div>

      <section class="loginPanel" aria-label="登录">
        <section class="scanPanel" aria-label="微信扫码登录">
          <div class="scanTitle">微信扫码安全登录</div>
          <div class="scanMeta">
            <span>微信扫码</span>
            <span>App 扫码</span>
          </div>
          <div class="qrBox" aria-hidden="true">
            <span v-for="(on, index) in qrCells" :key="index" class="qrCell" :class="{ on }"></span>
          </div>
          <p class="scanTip">打开微信扫一扫，确认后即可登录。账号登录成功后也可绑定微信。</p>
        </section>

        <section class="formPanel" aria-label="账号登录">
          <div class="tabs" role="tablist" aria-label="登录方式">
            <button
              class="tab"
              :class="{ active: mode === 'password' }"
              type="button"
              role="tab"
              :aria-selected="mode === 'password'"
              @click="setMode('password')"
            >
              密码登录
            </button>
            <button
              class="tab"
              :class="{ active: mode === 'code' }"
              type="button"
              role="tab"
              :aria-selected="mode === 'code'"
              @click="setMode('code')"
            >
              验证码登录
            </button>
          </div>

          <form class="form" @submit.prevent="submit">
            <div class="field">
              <label class="label" for="account">账号</label>
              <UiInput
                id="account"
                v-model="account"
                inputmode="email"
                autocomplete="username"
                placeholder="请输入手机号或邮箱"
                @blur="accountTouched = true"
              />
              <div v-if="accountWarn" class="fieldError" role="alert">{{ accountWarn }}</div>
            </div>

            <div v-if="mode === 'password'" class="field">
              <label class="label" for="password">密码</label>
              <UiInput
                id="password"
                v-model="password"
                type="password"
                autocomplete="current-password"
                placeholder="请输入密码（至少 6 位）"
              />
              <div class="helper">
                <button class="linkBtn" type="button" @click="goForgot">忘记密码</button>
              </div>
            </div>

            <div v-else class="field">
              <label class="label" for="code">短信验证码</label>
              <div class="row">
                <UiInput
                  id="code"
                  v-model="code"
                  inputmode="numeric"
                  autocomplete="one-time-code"
                  placeholder="请输入验证码"
                />
                <UiButton size="sm" type="button" :disabled="!canSendCode" @click="sendCode">
                  <span v-if="codeState.sending">发送中</span>
                  <span v-else-if="codeState.secondsLeft > 0">{{ codeState.secondsLeft }}s</span>
                  <span v-else>获取验证码</span>
                </UiButton>
              </div>
            </div>

            <div v-if="errorText" class="error" role="alert">{{ errorText }}</div>

            <UiButton variant="primary" type="submit" :disabled="!canSubmit" :loading="submitState === 'submitting'">
              登录
            </UiButton>

            <label class="agree">
              <input v-model="agree" class="checkbox" type="checkbox" />
              <span class="agreeText">
                我已阅读并同意
                <a class="link" href="#" @click.prevent="goAgreement">用户协议</a>
                与
                <a class="link" href="#" @click.prevent="goPrivacy">隐私政策</a>
              </span>
            </label>

            <div class="footer">
              <button class="textLink" type="button" @click="goRegister">立即注册</button>
              <span class="divider"></span>
              <button class="textLink" type="button" @click="goForgot">找回密码</button>
            </div>
          </form>
        </section>
      </section>
    </main>
  </div>
</template>

<style scoped>
.page {
  min-height: 100svh;
  background: color-mix(in srgb, var(--code-bg) 56%, var(--bg) 44%);
}

.main {
  min-height: calc(100svh - var(--app-brandbar-h, 52px));
  width: min(1040px, calc(100% - 32px));
  margin: 0 auto;
  padding: 30px 0 42px;
  display: grid;
  align-content: center;
  gap: 28px;
}

.loginHead {
  display: grid;
  gap: 18px;
  justify-items: center;
  text-align: center;
}

.kicker {
  margin: 0;
  color: var(--accent);
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.pageTitle {
  margin: 6px 0 0;
  color: var(--text-h);
  font-size: 30px;
  line-height: 1.18;
  font-weight: 900;
}

.accountTabs {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 30px;
}

.accountTab {
  border: 0;
  border-bottom: 3px solid transparent;
  background: transparent;
  color: var(--text);
  padding: 8px 2px;
  font-size: 18px;
  line-height: 1.2;
  font-weight: 900;
  cursor: pointer;
}

.accountTab.active {
  color: var(--text-h);
  border-bottom-color: var(--accent);
}

.loginPanel {
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--bg);
  box-shadow: 0 18px 50px rgba(15, 23, 42, 0.08);
  display: grid;
  overflow: hidden;
}

.scanPanel,
.formPanel {
  min-width: 0;
}

.scanPanel {
  padding: 28px 24px;
  display: grid;
  justify-items: center;
  align-content: center;
  gap: 16px;
  border-bottom: 1px solid var(--border);
}

.scanTitle {
  color: var(--text-h);
  font-size: 18px;
  line-height: 24px;
  font-weight: 900;
}

.scanMeta {
  display: flex;
  gap: 14px;
  color: var(--text);
  font-size: 13px;
  font-weight: 800;
}

.scanMeta span:first-child {
  color: #12b76a;
}

.qrBox {
  width: 190px;
  aspect-ratio: 1;
  border: 1px solid var(--border);
  background: #fff;
  padding: 14px;
  display: grid;
  grid-template-columns: repeat(11, 1fr);
  grid-template-rows: repeat(11, 1fr);
  gap: 3px;
}

.qrCell {
  background: transparent;
}

.qrCell.on {
  background: #111827;
}

.scanTip {
  max-width: 280px;
  margin: 0;
  color: var(--text);
  font-size: 13px;
  line-height: 20px;
  text-align: center;
}

.tabs {
  display: flex;
  justify-content: center;
  gap: 24px;
  padding: 26px 22px 10px;
}

.tab {
  border: 0;
  border-bottom: 2px solid transparent;
  background: transparent;
  padding: 0 0 8px;
  cursor: pointer;
  color: var(--text);
  font-size: 16px;
  font-weight: 900;
}

.tab.active {
  color: var(--accent);
  border-bottom-color: var(--accent);
}

.form {
  padding: 14px 22px 26px;
  display: grid;
  gap: 14px;
}

.field {
  display: grid;
  gap: 8px;
}

.label {
  font-size: 13px;
  color: var(--text-h);
  font-weight: 800;
}

.row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
}

.error {
  border: 1px solid color-mix(in srgb, var(--danger) 35%, var(--border));
  background: var(--danger-bg);
  border-radius: 8px;
  padding: 10px 12px;
  color: var(--text-h);
  font-size: var(--font-sm);
}

.fieldError {
  color: color-mix(in srgb, var(--danger) 80%, var(--text));
  font-size: 12px;
}

.link {
  color: var(--accent);
  text-decoration: none;
}

.agree {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  padding: 0;
  border: 0;
  background: transparent;
  justify-content: center;
}

.checkbox {
  margin-top: 2px;
}

.agreeText {
  font-size: 12px;
  color: var(--text);
  line-height: 1.35;
}

.helper {
  display: flex;
  justify-content: flex-end;
  margin-top: -2px;
}

.linkBtn {
  border: 0;
  background: transparent;
  padding: 4px 0;
  color: var(--accent);
  cursor: pointer;
  font-size: 13px;
}

.footer {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: center;
  padding-top: 4px;
}

.textLink {
  border: 0;
  background: transparent;
  color: var(--text);
  font-size: 13px;
  cursor: pointer;
}

.textLink:hover {
  color: var(--accent);
}

.divider {
  width: 1px;
  height: 13px;
  background: var(--border);
}

@media (min-width: 860px) {
  .main {
    min-height: calc(100svh - var(--app-brandbar-h, 64px));
    padding: 36px 0 56px;
  }

  .loginPanel {
    grid-template-columns: minmax(360px, 0.95fr) minmax(360px, 1.05fr);
  }

  .scanPanel {
    border-bottom: 0;
    border-right: 1px solid var(--border);
    padding: 48px 44px;
  }

  .formPanel {
    display: grid;
    align-content: center;
  }

  .form {
    padding: 18px 44px 42px;
  }

  .tabs {
    padding: 44px 44px 12px;
  }
}

@media (max-width: 480px) {
  .main {
    width: min(100% - 24px, 1040px);
    padding-top: 22px;
    gap: 18px;
  }

  .pageTitle {
    font-size: 25px;
  }

  .accountTabs {
    gap: 18px;
  }

  .accountTab {
    font-size: 15px;
  }

  .scanPanel {
    padding: 22px 16px;
  }

  .qrBox {
    width: 164px;
  }

  .row {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuthStore } from './stores/auth'
import { useStorefrontEditor } from './composables/useStorefrontEditor'
import { themeById, themeEpVars } from './config/themes'
import { useConfigStore } from './stores/config'
import TopbarA from './components/topbars/TopbarA.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const user = computed(() => auth.user)
const authenticated = computed(() => auth.authenticated)
const displayRole = computed(() => auth.displayRole)
const loginModalVisible = computed(() => auth.loginModalVisible)
const configStore = useConfigStore()
const config = computed(() => configStore.config)

const onAdminRoute = computed(() => route.path.startsWith('/admin'))
const onStorefrontRoute = computed(() => route.path.startsWith('/shop'))
const storefrontEditor = useStorefrontEditor()
const showEditEntry = computed(() => onStorefrontRoute.value && storefrontEditor.canEdit.value && !storefrontEditor.editing.value)

// 前台主题：前台按当前商家配色应用 CSS 变量；非前台（后台/演示）回到默认绿
const applyTheme = () => {
  const id = onStorefrontRoute.value ? (config.value.storefrontTheme || 'green') : 'green'
  const t = themeById(id)
  const el = document.documentElement
  el.style.setProperty('--sf-main', t.main)
  el.style.setProperty('--sf-strong', t.strong)
  el.style.setProperty('--sf-light', t.light)
  el.style.setProperty('--sf-soft', t.soft)
  el.style.setProperty('--sf-border', t.border)
  for (const [k, v] of Object.entries(themeEpVars(t))) el.style.setProperty(k, v)
}
watch([() => config.value.storefrontTheme, onStorefrontRoute], applyTheme, { immediate: true })
const brandLogo = computed(() => { const url = config.value.merchant.logoUrl || ''; if (!url) return ''; if (url.startsWith('/uploads/')) return new URL(url, configStore.apiBase).toString(); return url })
const brandSubtitle = computed(() => config.value.merchant.brandSubtitle || '')
const address = computed(() => window.location.origin + '/shop/' + config.value.merchant.slug)

const loginForm = reactive({ username: '', password: '' })
const loginBusy = ref(false)
const apiError = ref('')

async function login() {
  loginBusy.value = true; apiError.value = ''
  try {
    await auth.login(loginForm.username, loginForm.password)
    auth.loginModalVisible = false
    loginForm.password = ''
    ElMessage.success('欢迎回来，' + (user.value?.username || ''))
    if (route.path.startsWith('/admin')) { /* 留在当前后台页 */ } else { router.push('/admin') }
  } catch (e) { apiError.value = e.message } finally { loginBusy.value = false }
}
function logout() { auth.logout().then(() => router.push('/shop/' + (user.value?.merchantSlug || 'default'))) }
function copyAddress() { navigator.clipboard?.writeText(address.value); ElMessage.success('前台地址已复制') }
watch(loginModalVisible, (open) => { if (!open) apiError.value = '' })
// 保险：已登录时强制关闭登录弹窗，防止 42% 深色遮罩残留盖住页面
watch(authenticated, (ok) => { if (ok) auth.loginModalVisible = false }, { immediate: true })
</script>

<template>
  <div class="app-shell">
    <TopbarA
    :brand-name="config.merchant.name"
    :brand-subtitle="brandSubtitle"
    :brand-logo="brandLogo"
    :user="user"
    :authenticated="authenticated"
    :is-admin="onAdminRoute"
    :storefront-path="'/shop/' + config.merchant.slug"
    :topbar-links="config.topbarLinks || []"
    :show-edit="showEditEntry"
    @login="auth.loginModalVisible = true"
    @logout="logout"
    @go-storefront="router.push('/shop/' + config.merchant.slug)"
    @go-admin="router.push('/admin')"
    @go-nav="router.push($event)"
    @go-edit="storefrontEditor.enterEdit()"
  />
    <router-view />
    <div v-if="loginModalVisible" class="modal-backdrop" @click.self="auth.loginModalVisible = false">
      <form class="login-modal" @submit.prevent="login">
        <button type="button" class="modal-close" @click="auth.loginModalVisible = false">×</button>
        <span class="eyebrow">PBQUOTE ACCOUNT</span>
        <h2>登录管理后台</h2>
        <p>使用商家或超级管理员账号继续。</p>
        <label>账号<el-input v-model="loginForm.username" autocomplete="username" /></label>
        <label>密码<el-input v-model="loginForm.password" type="password" show-password autocomplete="current-password" /></label>
        <p v-if="apiError" class="api-message">{{ apiError }}</p>
        <el-button class="pb-btn-primary primary-action" type="primary" :loading="loginBusy" native-type="submit">{{ loginBusy ? '登录中…' : '登录' }}</el-button>
      </form>
    </div>
  </div>
</template>

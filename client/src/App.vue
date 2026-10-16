<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuthStore } from './stores/auth'
import { useStorefrontEditor } from './composables/useStorefrontEditor'
import { themeById, themeEpVars } from './config/themes'
import { useConfigStore } from './stores/config'
import { resolveAssetUrl } from './utils/url'
import TopbarA from './components/topbars/TopbarA.vue'
import { http } from './api/client'

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

// 安装向导：未安装时自动跳转 /install
const installChecked = ref(false)
const installNeeded = ref(false)
watch(onStorefrontRoute, async (on) => {
  if (installChecked.value || !on) return
  try {
    const res = await fetch('/api/v1/install/status')
    const data = await res.json()
    installNeeded.value = !data.installed
    if (!data.installed) router.push('/install')
  } catch { /* 服务不可达时不跳转 */ }
  installChecked.value = true
}, { immediate: true })
const brandLogo = computed(() => resolveAssetUrl(config.value.merchant.logoUrl || '', configStore.apiBase))
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

// 修改密码（超级管理员与商户账号通用）
const passwordVisible = ref(false)
const passwordBusy = ref(false)
const passwordError = ref('')
const passwordForm = reactive({ currentPassword: '', newPassword: '', confirmPassword: '' })
function openPasswordDialog() {
  Object.assign(passwordForm, { currentPassword: '', newPassword: '', confirmPassword: '' })
  passwordError.value = ''
  auth.loginModalVisible = false
  passwordVisible.value = true
}
async function submitPassword() {
  if (passwordBusy.value) return
  passwordError.value = ''
  const current = passwordForm.currentPassword
  const next = passwordForm.newPassword
  if (!current) { passwordError.value = '请输入原密码'; return }
  if (String(next || '').length < 6) { passwordError.value = '新密码至少 6 位'; return }
  if (next !== passwordForm.confirmPassword) { passwordError.value = '两次输入的新密码不一致'; return }
  passwordBusy.value = true
  const landing = '/shop/' + (user.value?.merchantSlug || 'default')
  try {
    await http.post('/auth/password', { currentPassword: current, newPassword: next })
    passwordVisible.value = false
    Object.assign(passwordForm, { currentPassword: '', newPassword: '', confirmPassword: '' })
    auth.reset()
    ElMessage.success('密码已修改，请用新密码重新登录')
    if (!route.path.startsWith('/shop') && !route.path.startsWith('/install')) router.push(landing)
    auth.requireLogin()
  } catch (e) { passwordError.value = e.message } finally { passwordBusy.value = false }
}
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
    @change-password="openPasswordDialog"
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

    <el-dialog v-model="passwordVisible" title="修改密码" width="440px" :close-on-click-modal="false" append-to-body>
      <el-form label-width="96px" @submit.prevent>
        <el-form-item label="原密码">
          <el-input v-model="passwordForm.currentPassword" type="password" show-password autocomplete="current-password" placeholder="请输入原密码" />
        </el-form-item>
        <el-form-item label="新密码">
          <el-input v-model="passwordForm.newPassword" type="password" show-password autocomplete="new-password" placeholder="至少 6 位" />
        </el-form-item>
        <el-form-item label="确认新密码">
          <el-input v-model="passwordForm.confirmPassword" type="password" show-password autocomplete="new-password" placeholder="再次输入新密码" @keyup.enter="submitPassword" />
        </el-form-item>
      </el-form>
      <el-alert v-if="passwordError" :title="passwordError" type="error" show-icon :closable="false" style="margin-bottom:10px" />
      <p style="margin:0;color:#909399;font-size:12px">修改成功后当前登录会立即失效，需要用新密码重新登录。</p>
      <template #footer>
        <el-button :disabled="passwordBusy" @click="passwordVisible = false">取消</el-button>
        <el-button type="primary" :loading="passwordBusy" @click="submitPassword">确认修改</el-button>
      </template>
    </el-dialog>
  </div>
</template>

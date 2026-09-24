<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { http, API_BASE } from '../api/client'
import { Shop, Brush, PriceTag, Box, Plus, TopRight, Link } from '@element-plus/icons-vue'
import { useAuthStore } from '../stores/auth'
import { useConfigStore } from '../stores/config'
import { isSafeWebUrl, resolveAssetUrl } from '../utils/url'
import { THEMES } from '../config/themes'
const themeOptions = THEMES
const emit = defineEmits(['published', 'preview', 'logout'])
const auth = useAuthStore()
const user = computed(() => auth.user)
const configStore = useConfigStore()
const superAdmin = computed(() => user.value?.role === 'super_admin')
const forcedColors = ref(false)
if (typeof matchMedia === 'function') { try { forcedColors.value = matchMedia('(forced-colors: active)').matches } catch {} }
watch(() => auth.authenticated, (ok) => { if (ok) auth.loginModalVisible = false })
const section = ref('home')
const slug = ref('')
const config = ref(null)
const merchants = ref([])
const shapes = ref([])
const busy = ref(false)
const uploading = ref(false)
const error = ref('')
const search = ref('')
const merchantDraft = reactive({ name: '', slug: '', username: '', password: '', slogan: '' })
const modules = [
  { id: 'brand', title: '品牌设置', icon: Brush },
  { id: 'pricing', title: '价格规则', icon: PriceTag },
  { id: 'boxes', title: '盒形公式', icon: Box },
  { id: 'custom', title: '前台定制', icon: Link },
]
const title = computed(() => section.value === 'home' ? '工作台' : section.value === 'merchants' ? '商户管理' : modules.find(x => x.id === section.value)?.title)
const stats = computed(() => ({
  merchants: merchants.value.length,
  active: merchants.value.filter(m => m.status === 'active').length,
  materials: config.value?.pricing?.materials?.length ?? 0,
  processes: Object.keys(config.value?.pricing?.processes ?? {}).length,
}))
const filteredMerchants = computed(() => merchants.value.filter(x => (x.name + x.slug).toLowerCase().includes(search.value.toLowerCase())))
const imageUrl = value => value?.startsWith('/uploads/') ? new URL(value, new URL(API_BASE, window.location.origin)).href : value
const blockId = () => 'b' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
const blockImageUrl = (b) => resolveAssetUrl(b?.imageUrl, API_BASE)
function addBlock(region = 'top') {
  const list = (config.value.contentBlocks = config.value.contentBlocks || [])
  if (list.length >= 50) { error.value = '内容块最多 50 个'; return }
  const rw = region === 'left' || region === 'right' ? 260 : 1200
  const w = Math.min(360, rw)
  list.push({ id: blockId(), region, x: Math.round((rw - w) / 2), y: 0, w, h: 120, imageUrl: '', text: '推荐内容', link: '' })
}
function removeBlock(id) { config.value.contentBlocks = (config.value.contentBlocks || []).filter((b) => b.id !== id) }
function validateCustom() {
  const links = config.value.topbarLinks || []
  if (links.length > 6) throw new Error('顶栏链接最多 6 个')
  for (const l of links) {
    if (!String(l.name || '').trim()) throw new Error('顶栏链接名称不能为空')
    if (!String(l.url || '').trim()) throw new Error('顶栏链接地址不能为空')
    if (!isSafeWebUrl(l.url)) throw new Error('顶栏链接仅支持 http/https 或站内路径')
  }
  const list = config.value.contentBlocks || []
  if (list.length > 50) throw new Error('内容块最多 50 个')
  for (const b of list) {
    if (!b.id) throw new Error('内容块标识无效')
    const x = Number(b.x || 0), y = Number(b.y || 0), w = Number(b.w || 0), h = Number(b.h || 0)
    if (![x, y, w, h].every((v) => Number.isFinite(v))) throw new Error('内容块坐标无效')
    if (w < 40 || h < 20) throw new Error('内容块尺寸过小')
    const rw = ['left', 'right'].includes(b.region) ? 260 : 1200
    if (x < 0 || y < 0 || x + w > rw) throw new Error('内容块超出所在区域画布范围')
    const imageUrl = String(b.imageUrl || '').trim()
    const text = String(b.text || '').trim()
    if (!imageUrl && !text) throw new Error('每个内容块至少填写图片或文本')
    if (imageUrl && !isSafeWebUrl(imageUrl)) throw new Error('内容块图片地址无效')
    if (b.link && !isSafeWebUrl(b.link)) throw new Error('内容块链接地址无效')
  }
}
async function uploadBlockImage(event, block) {
  const file = event.target.files?.[0]; if (!file) return
  error.value = ''
  if (file.size > 1024 * 1024 || !['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type)) { error.value = '请选择不超过 1MB 的 PNG/JPEG/WebP/GIF 图片'; event.target.value = ''; return }
  const target = slug.value; uploading.value = true
  try { const form = new FormData(); form.append('image', file); const data = await api('/merchant/' + encodeURIComponent(target) + '/assets', { method: 'POST', body: form }); if (slug.value === target) { block.imageUrl = data.url; ok('图片已上传，保存后生效') } } catch (e) { fail(e) } finally { uploading.value = false; event.target.value = '' }
}
async function uploadContactImage(event, entry) {
  const file = event.target.files?.[0]; if (!file) return
  error.value = ''
  if (file.size > 1024 * 1024 || !['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type)) { error.value = '请选择不超过 1MB 的 PNG/JPEG/WebP/GIF 图片'; event.target.value = ''; return }
  const target = slug.value; uploading.value = true
  try { const form = new FormData(); form.append('image', file); const data = await api('/merchant/' + encodeURIComponent(target) + '/assets', { method: 'POST', body: form }); if (slug.value === target) { entry.value = data.url; ok('图片已上传，保存后生效') } } catch (err) { fail(err) } finally { uploading.value = false; event.target.value = '' }
}
async function save() {
  await run(async () => {
const patch = section.value === 'pricing'
      ? { pricing: buildPricing(), shipping: config.value.shipping, product: config.value.product }
      : section.value === 'custom'
        ? (validateCustom(), { storefrontLayout: ['a', 'b', 'c'].includes(config.value.storefrontLayout) ? config.value.storefrontLayout : 'b', storefrontTheme: themeOptions.some(t => t.id === config.value.storefrontTheme) ? config.value.storefrontTheme : 'green', topbarLinks: (config.value.topbarLinks || []), contentBlocks: (config.value.contentBlocks || []) })
        : { merchant: config.value.merchant, contact: config.value.contact, contactEntries: (config.value.contactEntries || []) }
    const data = await api('/merchant/' + encodeURIComponent(slug.value) + '/config', { method: 'PATCH', body: JSON.stringify(patch) })
    setConfig(data); configStore.apply(data); emit('published', data)
  }, '已保存，商户前台已更新')
}
async function uploadLogo(event) {
  const file = event.target.files?.[0]; if (!file) return
  error.value = ''
  if (file.size > 256 * 1024 || !['image/png','image/jpeg','image/webp','image/gif'].includes(file.type)) { error.value = '请选择不超过 256 KB 的 PNG、JPEG、WebP 或 GIF 图片'; event.target.value = ''; return }
  const target = slug.value; uploading.value = true
  try { const form = new FormData(); form.append('logo', file); const data = await api('/merchant/' + encodeURIComponent(target) + '/logo', { method: 'POST', body: form }); if (slug.value === target) { config.value.merchant.logoUrl = data.logoUrl; ok('上传成功，保存品牌设置后发布') } } catch(e) { fail(e) } finally { uploading.value = false; event.target.value = '' }
}
async function createMerchant() {
  await run(async () => { await api('/admin/merchants', { method: 'POST', body: JSON.stringify(merchantDraft) }); Object.assign(merchantDraft, { name:'', slug:'', username:'', password:'', slogan:'' }); merchants.value = await api('/admin/merchants') }, '商户已创建，请进入品牌设置上传 Logo')
}

async function toggleMerchant(item) {
  await run(async () => { await api('/admin/merchants/' + item.id + '/status', { method:'PATCH', body:JSON.stringify({ status:item.status === 'active' ? 'disabled' : 'active' }) }); merchants.value = await api('/admin/merchants') }, '商户状态已更新')
}
async function deleteMerchant(item) {
  await run(async () => { await api('/admin/merchants/' + item.id, { method: 'DELETE' }); merchants.value = await api('/admin/merchants') }, '商户「' + item.name + '」已删除')
}
async function api(path, options = {}) {
  const method = options.method || 'GET'
  const body = options.body
  const headers = {}
  if (body && !(body instanceof FormData)) headers['Content-Type'] = 'application/json'
  return await http.request({ method, url: path, data: body, headers })
}
function fail(e) { error.value = e.message; ElMessage.error(e.message) }
function ok(message) { ElMessage.success(message) }
async function run(action, message = '') {
  busy.value = true; error.value = ''
  const fuse = setTimeout(() => { busy.value = false }, 15000)
  try { await action(); if (message) ok(message) } catch (e) { fail(e) } finally { clearTimeout(fuse); busy.value = false }
}
function setConfig(value) {
  config.value = structuredClone(value)
  if (!Array.isArray(config.value.topbarLinks)) config.value.topbarLinks = []
  if (!Array.isArray(config.value.contentBlocks)) config.value.contentBlocks = []
  if (!Array.isArray(config.value.contactEntries)) config.value.contactEntries = []
  const tNames = Object.keys(config.value.pricing?.treatments || {})
  config.value.contact = { wechat: '', qq: '', wechatQrUrl: '', qqContactUrl: '', ...value.contact }
}
async function chooseMerchant(value) {
  slug.value = value; config.value = null; section.value = 'home'
  await run(async () => {
    const data = await api('/merchant/' + encodeURIComponent(value) + '/config')
    if (slug.value !== value) return
    setConfig(data)
    configStore.apply(data)
  })
}
async function initialize() {
  run(async () => { shapes.value = await api('/box-shapes') })
  if (superAdmin.value) { section.value = 'home'; slug.value = ''; config.value = null; await run(async () => { merchants.value = await api('/admin/merchants') }) }
  else if (user.value?.merchantSlug) await chooseMerchant(user.value.merchantSlug)
}
watch(() => user.value?.username, initialize, { immediate: true })
function openSection(id) { section.value = id; error.value = '' }
const num = (v, fallback = 0) => { const n = Number(v); return Number.isFinite(n) && n >= 0 ? n : fallback }
function renameKey(obj, oldKey, newKey) {
  const target = (newKey || '').trim()
  if (!target || target === oldKey || !(oldKey in obj)) return
  obj[target] = obj[oldKey]
  delete obj[oldKey]
}
function buildPricing() {
  const p = config.value.pricing
  if (!Array.isArray(p.materials) || !p.materials.length) throw new Error('至少保留一种纸张材质')
  const names = p.materials.map(m => (m.name || '').trim())
  if (names.some(n => !n) || new Set(names).size !== names.length) throw new Error('材质名称不能重复或为空')
  for (const m of p.materials) {
    if (!Array.isArray(m.quantityTiers) || !m.quantityTiers.length) throw new Error('材质「' + m.name + '」至少要有一个数量档位')
    if (m.quantityTiers.some(t => !Number.isSafeInteger(t.quantity) || t.quantity <= 0 || ![t.unitPricePerM2, t.minimumCharge].every(n => Number.isFinite(n) && n >= 0)) || new Set(m.quantityTiers.map(t => t.quantity)).size !== m.quantityTiers.length) throw new Error('「' + m.name + '」的数量档位需为不重复的正整数，价格必须为非负数')
  }
  const treatmentNames = Object.keys(p.treatments || {})
  if (treatmentNames.some(n => !n.trim()) || new Set(treatmentNames).size !== treatmentNames.length) throw new Error('表面处理名称不能重复或为空')
  for (const n of treatmentNames) if (!(p.treatments[n].unitPricePerM2 >= 0)) throw new Error('表面处理单价无效')
  const processRows = Object.entries(p.processes || {})
  if (processRows.some(([n]) => !n.trim()) || new Set(processRows.map(([n]) => n)).size !== processRows.length) throw new Error('工艺名称不能重复或为空')
  for (const [, r] of processRows) if (!['area', 'times', 'piece'].includes(r.billingMode) || !(r.setupFee >= 0) || !(r.unitPrice >= 0)) throw new Error('工艺费用无效')
  const reqList = p.requirements?.list
  if (!Array.isArray(reqList) || !reqList.length) throw new Error('至少保留一种印刷要求')
  if (reqList.some(r => !String(r.name || '').trim()) || new Set(reqList.map(r => String(r.name || '').trim())).size !== reqList.length) throw new Error('印刷要求名称不能重复或为空')
  for (const r of reqList) if (!(Number(r.rate) >= 0)) throw new Error('印刷要求系数无效')
  if (!(p.print?.doubleSidedSurcharge >= 0)) throw new Error('双面加收系数无效')
  if (!(p.glue?.unitPricePerPiece >= 0)) throw new Error('糊盒单价无效')
  if (!(p.spotColor?.plateFeePerColor >= 0)) throw new Error('专色版费无效')
  return {
    quantityMode: p.quantityMode === 'options' ? 'options' : 'custom',
    materials: p.materials.map(m => ({ name: m.name.trim(), quantityTiers: [...m.quantityTiers].sort((a, b) => a.quantity - b.quantity) })),
    treatments: Object.fromEntries(treatmentNames.map(n => [n.trim(), { unitPricePerM2: num(p.treatments[n].unitPricePerM2) }])),
    processes: Object.fromEntries(processRows.map(([n, r]) => [n.trim(), { billingMode: r.billingMode, setupFee: num(r.setupFee), unitPrice: num(r.unitPrice) }])),
    print: { doubleSidedSurcharge: num(p.print?.doubleSidedSurcharge) },
    requirements: { list: (p.requirements?.list || []).map(r => ({ name: String(r.name || '').trim(), rate: num(r.rate) })) },
    glue: { unitPricePerPiece: num(p.glue?.unitPricePerPiece) },
    spotColor: { plateFeePerColor: num(p.spotColor?.plateFeePerColor) },
  }
}
</script>
<template>
  <main class="ws-a">
    <aside class="ws-a-side">
      <div class="ws-a-word" title="返回工作台" style="cursor:pointer" @click="openSection('home')"><span>P</span><div>PBQuote<small>商户管理工作台</small></div></div>
      <div class="ws-a-ctx"><small>{{ superAdmin ? '超级管理员' : '当前商户' }}</small><strong>{{ config?.merchant?.name || '请选择商户' }}</strong><code v-if="slug">{{ slug }}</code></div>
      <nav>
        <button v-if="superAdmin" :class="{ on: section === 'merchants' }" :disabled="busy" @click="openSection('merchants')"><el-icon><Shop /></el-icon><span>商户管理</span></button>
        <b v-if="config">商户配置</b>
        <button v-for="item in modules" :key="item.id" :disabled="!config || busy || uploading" :class="{ on: section === item.id }" @click="openSection(item.id)"><el-icon><component :is="item.icon" /></el-icon><span>{{ item.title }}</span></button>
      </nav>
      <div class="ws-a-user"><small>{{ user?.username }}</small><button @click="emit('logout')">退出登录</button></div>
    </aside>
    <div class="ws-a-main">
      <header class="ws-a-top">
        <el-breadcrumb separator="/"><el-breadcrumb-item>{{ section === 'merchants' ? '系统' : '商户配置' }}</el-breadcrumb-item><el-breadcrumb-item>{{ title }}</el-breadcrumb-item></el-breadcrumb>
        <el-tag v-if="slug" type="success" size="small">{{ slug }} 已启用</el-tag>
        <el-button v-if="config" size="small" @click="emit('preview', slug)"><el-icon style="vertical-align:-2px;margin-right:4px"><TopRight /></el-icon>查看商户前台</el-button>
      </header>
      <div class="ws-a-content">
        <transition name="el-fade-in"><div v-if="busy" class="ws-a-busy"><el-icon class="is-loading"><svg viewBox="0 0 1024 1024" width="14" height="14"><path fill="currentColor" d="M512 64a32 32 0 0 1 32 32v128a32 32 0 0 1-64 0V96a32 32 0 0 1 32-32zm0 704a32 32 0 0 1 32 32v128a32 32 0 0 1-64 0V800a32 32 0 0 1 32-32zM64 512a32 32 0 0 1 32-32h128a32 32 0 0 1 0 64H96a32 32 0 0 1-32-32zm704 0a32 32 0 0 1 32-32h128a32 32 0 0 1 0 64H800a32 32 0 0 1-32-32zm-506.5 93.5a32 32 0 0 1 0 45.25l-90.5 90.5a32 32 0 0 1-45.25-45.25l90.5-90.5a32 32 0 0 1 45.25 0zm570.75-570.75a32 32 0 0 1 45.25 0l90.5 90.5a32 32 0 0 1-45.25 45.25l-90.5-90.5a32 32 0 0 1 0-45.25zM257.5 257.5a32 32 0 0 1 0 45.25L167 393.25a32 32 0 0 1-45.25-45.25l90.5-90.5a32 32 0 0 1 45.25 0zm570.75 570.75a32 32 0 0 1 45.25 0l90.5 90.5a32 32 0 0 1-45.25 45.25l-90.5-90.5a32 32 0 0 1 0-45.25z"/></svg></el-icon> 处理中，请稍候…</div></transition>
        <el-alert v-if="error" :title="error" type="error" show-icon :closable="false" style="margin-bottom:2px" />
        <el-alert v-if="forcedColors" title="检测到系统处于“强制颜色/高对比度模式”，浏览器会把按钮显示为系统灰色。可关闭系统对比度主题（Windows 高对比度 / macOS 颜色滤镜），或联系技术支持处理。" type="warning" show-icon :closable="false" style="margin-bottom:2px" />

        <!-- 工作台首页 -->
        <section v-if="section === 'home'" class="ws-home">
          <div class="ws-home-hello"><h1>你好，{{ user?.username }} 👋</h1><p v-if="superAdmin">今天有 {{ stats.active }} 个商户在线，{{ stats.quotes || 0 }} 张报价单待跟进。</p><p v-else>当前商户「{{ config?.merchant?.name || '—' }}」在线，随时可以维护品牌与价格。</p></div>
          <div class="ws-home-stats">
            <div class="ws-home-stat"><b>{{ stats.merchants || (config ? 1 : 0) }}</b><span>商户总数</span></div>
            <div class="ws-home-stat"><b>{{ stats.active || (config ? 1 : 0) }}</b><span>启用中</span></div>
            <div class="ws-home-stat"><b>{{ stats.materials }}</b><span>纸张材质</span></div>
            <div class="ws-home-stat"><b>{{ stats.processes }}</b><span>工艺数量</span></div>
          </div>
          <div class="ws-home-quick">
            <button @click="openSection('brand')"><el-icon><Postcard /></el-icon> 品牌设置</button>
            <button @click="openSection('pricing')"><el-icon><Coin /></el-icon> 价格规则</button>
            <button @click="openSection('boxes')"><el-icon><Box /></el-icon> 盒形公式</button>

          </div>
          <div v-if="superAdmin" class="workspace-panel">
            <div class="panel-heading"><h2>商户一览 <small>{{ merchants.length }} 个商户</small></h2></div>
            <el-table :data="filteredMerchants" size="small">
              <el-table-column prop="name" label="商户" min-width="150" />
              <el-table-column prop="slug" label="专属标识" min-width="110" />
              <el-table-column label="状态" width="100"><template #default="{ row }"><el-tag :type="row.status === 'active' ? 'success' : 'info'" size="small">{{ row.status === 'active' ? '启用中' : '已停用' }}</el-tag></template></el-table-column>
              <el-table-column label="" width="200"><template #default="{ row }"><el-button size="small" type="primary" plain @click="chooseMerchant(row.slug)">进入配置</el-button></template></el-table-column>
            </el-table>
          </div>
          <div v-else class="workspace-panel">
            <div class="panel-heading"><h2>当前商户</h2></div>
            <p class="formula-note">商户标识：{{ slug }} · 前台地址 /shop/{{ slug }}</p>
          </div>
        </section>
        <!-- 商户管理（超管） -->
        <section v-if="section === 'merchants' && superAdmin" class="workspace-panel">
          <div class="panel-heading"><h2>商户列表 <small>{{ merchants.length }}</small></h2><el-input v-model="search" placeholder="搜索名称或标识" clearable style="max-width:240px" /></div>
          <el-empty v-if="!merchants.length" description="暂无商户，创建第一个商户开始配置。" />
          <el-table v-else :data="filteredMerchants" stripe>
            <el-table-column prop="name" label="商户" min-width="160"><template #default="{ row }"><strong>{{ row.name }}</strong></template></el-table-column>
            <el-table-column prop="slug" label="专属标识" min-width="120" />
            <el-table-column label="状态" width="110"><template #default="{ row }"><el-tag :type="row.status === 'active' ? 'success' : 'info'" size="small">{{ row.status === 'active' ? '启用中' : '已停用' }}</el-tag></template></el-table-column>
            <el-table-column label="操作" width="280"><template #default="{ row }"><el-button size="small" type="primary" plain :disabled="busy" @click="chooseMerchant(row.slug)">进入配置</el-button><el-button size="small" :disabled="busy" @click="toggleMerchant(row)">{{ row.status === 'active' ? '停用' : '启用' }}</el-button><el-popconfirm title="确定删除该商户？删除后其账号将被停用，且不可恢复。" confirm-button-text="删除" cancel-button-text="取消" width="260" @confirm="deleteMerchant(row)"><template #reference><el-button size="small" type="danger" plain :disabled="busy">删除</el-button></template></el-popconfirm></template></el-table-column>
          </el-table>
          <el-divider />
          <el-form label-width="96px" style="max-width:480px">
            <h3 style="margin:0 0 12px"><el-icon style="vertical-align:-2px"><Plus /></el-icon> 新增商户</h3>
            <el-form-item label="商户名称"><el-input v-model="merchantDraft.name" maxlength="100" /></el-form-item>
            <el-form-item label="专属标识"><el-input v-model="merchantDraft.slug" placeholder="小写字母/数字/连字符" /></el-form-item>
            <el-form-item label="登录账号"><el-input v-model="merchantDraft.username" autocomplete="off" /></el-form-item>
            <el-form-item label="初始密码"><el-input v-model="merchantDraft.password" type="password" show-password autocomplete="new-password" /></el-form-item>
            <el-button class="pb-btn-primary" type="primary" :loading="busy" :disabled="!merchantDraft.name || !merchantDraft.slug || !merchantDraft.username || !merchantDraft.password" @click="createMerchant">{{ busy ? '创建中…' : '创建商户' }}</el-button>
          </el-form>
        </section>

        <!-- 商户配置区 -->
        <template v-else-if="config">

          <!-- 品牌设置 -->
          <form v-if="section === 'brand'" novalidate @submit.prevent="save">
            <section class="workspace-panel"><div class="panel-heading"><h2>品牌资料</h2><span>显示在客户报价前台</span></div>
              <div class="logo-editor"><img v-if="config.merchant.logoUrl" :src="imageUrl(config.merchant.logoUrl)" alt="Logo预览"><div v-else class="logo-placeholder">{{ config.merchant.name?.slice(0, 1) || 'P' }}</div>
                <div><label class="upload-button">{{ uploading ? '正在上传…' : '上传 Logo' }}<input type="file" aria-label="上传 Logo" accept="image/png,image/jpeg,image/webp,image/gif" :disabled="uploading" @change="uploadLogo"></label><p>PNG、JPEG、WebP、GIF · 最大 256 KB</p><el-button v-if="config.merchant.logoUrl" text type="danger" @click="config.merchant.logoUrl = ''">移除 Logo</el-button></div>
              </div>
              <el-form label-width="110px" style="max-width:640px">
                <el-form-item label="商户名称"><el-input v-model="config.merchant.name" maxlength="100" show-word-limit /></el-form-item>
                <el-form-item label="品牌副标题"><el-input v-model="config.merchant.brandSubtitle" maxlength="100" /></el-form-item>
                <el-form-item label="宣传语"><el-input v-model="config.merchant.slogan" maxlength="200" /></el-form-item>
                <el-form-item label="专属标识"><el-input :model-value="slug" disabled /></el-form-item>
                <el-form-item label="前台地址"><el-input :model-value="'/shop/' + slug" disabled /></el-form-item>

              </el-form>
            </section>
            <section class="workspace-panel"><div class="panel-heading"><h2>客户联系入口</h2><span>客户复制报价后联系你</span></div>
              <el-form label-width="110px" style="max-width:640px">
                <div v-for="(c, i) in config.contactEntries" :key="i" style="border:1px solid #ecefe9;border-radius:8px;padding:8px;margin-bottom:8px;display:flex;flex-direction:column;gap:6px">
                  <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
                    <el-input v-model="c.name" size="small" placeholder="名称（如 微信/QQ/电话）" style="width:150px" maxlength="30" />
                    <el-select v-model="c.type" size="small" style="width:100px"><el-option label="文本" value="text" /><el-option label="图片" value="image" /><el-option label="链接" value="link" /></el-select>
                    <el-button size="small" text type="danger" @click="config.contactEntries.splice(i, 1)">删除</el-button>
                  </div>
                  <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
                    <el-input v-model="c.value" size="small" :placeholder="c.type === 'image' ? '/uploads/… 或 https://…' : c.type === 'link' ? 'https://… 或 /shop/…' : '如：微信号 abc123'" style="flex:1;min-width:200px" />
                    <template v-if="c.type === 'image'">
                      <label class="el-button el-button--default el-button--small" style="margin:0"><input type="file" accept="image/png,image/jpeg,image/webp,image/gif" style="display:none" @change="uploadContactImage($event, c)" />上传</label>
                      <el-image v-if="c.value" :src="resolveAssetUrl(c.value, API_BASE)" style="width:34px;height:34px;border-radius:4px" fit="cover" :preview-src-list="c.value ? [resolveAssetUrl(c.value, API_BASE)] : []" />
                    </template>
                  </div>
                </div>
                <el-button size="small" plain @click="config.contactEntries.push({ name: '', type: 'text', value: '' })">＋ 添加联系入口</el-button>
              </el-form>
            </section>
            <footer class="workspace-save"><span>保存后更新商户前台品牌与联系方式</span><el-button class="pb-btn-primary" type="primary" :loading="busy || uploading" native-type="submit">{{ busy || uploading ? '保存中…' : '保存品牌设置' }}</el-button></footer>
          </form>

          <!-- 价格规则 -->
          <form v-else-if="section === 'pricing'" novalidate @submit.prevent="save">
            <section class="workspace-panel">
              <div class="panel-heading"><h2>纸张材质与数量阶梯</h2><el-button type="primary" plain size="small" @click="config.pricing.materials.push({ name: '', quantityTiers: [{ quantity: 500, unitPricePerM2: 8.4, minimumCharge: 580 }] })"><el-icon style="vertical-align:-2px;margin-right:4px"><Plus /></el-icon>新增材质</el-button></div>
              <p class="formula-note">基础生产金额 = max(展开面积 × 数量 × 该材质档位平方米单价，该档最低消费)；数量 ≥ 档位起点取该档，低于最小档按最小档。</p>
              <article v-for="(m, mi) in config.pricing.materials" :key="mi" class="material-block">
                <div class="panel-heading"><h3>材质 {{ mi + 1 }}<el-input v-model="m.name" placeholder="如 350克白卡 / 300克白卡白E坑" style="max-width:280px" /></h3><el-button size="small" type="danger" plain :disabled="config.pricing.materials.length === 1" @click="config.pricing.materials.splice(mi, 1)">删除材质</el-button></div>
                <el-table :data="m.quantityTiers" size="small" stripe>
                  <el-table-column label="数量起点（个）" width="220"><template #default="{ row }"><el-input-number v-model="row.quantity" :min="1" :step="100" step-strictly controls-position="right" style="width:160px" /></template></el-table-column>
                  <el-table-column label="单价（元/㎡）" width="220"><template #default="{ row }"><el-input-number v-model="row.unitPricePerM2" :min="0" :step="0.1" controls-position="right" style="width:160px" /></template></el-table-column>
                  <el-table-column label="最低消费（元）" width="220"><template #default="{ row }"><el-input-number v-model="row.minimumCharge" :min="0" :step="10" controls-position="right" style="width:160px" /></template></el-table-column>
                  <el-table-column label="" width="90"><template #default="{ $index }"><el-button size="small" text type="danger" :disabled="m.quantityTiers.length === 1" @click="m.quantityTiers.splice($index, 1)">删除</el-button></template></el-table-column>
                </el-table>
                <el-button class="mt8" size="small" text type="primary" @click="m.quantityTiers.push({ quantity: 0, unitPricePerM2: 0, minimumCharge: 0 })"><el-icon style="vertical-align:-2px;margin-right:4px"><Plus /></el-icon>新增档位</el-button>
              </article>
            </section>
            <section class="workspace-panel">
              <div class="panel-heading"><h2>表面处理（前台单选）</h2><el-button size="small" type="primary" plain @click="config.pricing.treatments['新处理'] = { unitPricePerM2: 0.2 }"><el-icon style="vertical-align:-2px;margin-right:4px"><Plus /></el-icon>新增处理</el-button></div>
              <p class="formula-note">费用 = 展开总面积（展开尺寸 × 数量）× 元/㎡；前台单选。</p>
              <div class="rule-rows">
                <div v-for="(r, n) in config.pricing.treatments" :key="n" class="rule-row">
                  <el-input :model-value="n" @input="v => renameKey(config.pricing.treatments, n, v)" placeholder="处理名称" style="width:200px" />
                  <el-input-number v-model="config.pricing.treatments[n].unitPricePerM2" :min="0" :step="0.05" controls-position="right" />
                  <span class="param-hint">元/㎡</span>
                  <el-button text type="danger" @click="delete config.pricing.treatments[n]">删除</el-button>
                </div>
              </div>
            </section>
            <section class="workspace-panel">
              <div class="panel-heading"><h2>工艺价格</h2><el-button size="small" type="primary" plain @click="config.pricing.processes['新工艺'] = { billingMode: 'area', setupFee: 150, unitPrice: 0.1 }"><el-icon style="vertical-align:-2px;margin-right:4px"><Plus /></el-icon>新增工艺</el-button></div>
              <p class="formula-note">费用 = 开机费 + 变动费（按面积：单价 × 图形面积 × 数量；按次：单价 × 次数 × 数量；按个：单价 × 数量。）</p>
              <div class="rule-rows">
                <div v-for="(r, n) in config.pricing.processes" :key="n" class="rule-row">
                  <el-input :model-value="n" @input="v => renameKey(config.pricing.processes, n, v)" placeholder="工艺名称" style="width:160px" />
                  <el-select v-model="config.pricing.processes[n].billingMode" style="width:190px"><el-option label="按图形面积（元/㎡）" value="area" /><el-option label="按次（元/次）" value="times" /><el-option label="按个（元/个）" value="piece" /></el-select>
                  <el-input-number v-model="config.pricing.processes[n].setupFee" :min="0" :step="10" controls-position="right" />
                  <el-input-number v-model="config.pricing.processes[n].unitPrice" :min="0" :step="0.05" controls-position="right" />
                  <el-button text type="danger" @click="delete config.pricing.processes[n]">删除</el-button>
                </div>
              </div>
            </section>
            <section class="workspace-panel">
              <div class="panel-heading"><h2>印刷与附加参数</h2></div>
              <el-form label-width="150px" style="max-width:720px">
                <el-form-item label="双面印刷加收系数"><el-input-number v-model="config.pricing.print.doubleSidedSurcharge" :min="0" :step="0.1" /><small class="param-hint">双面：基础生产金额 ×(1+系数)</small></el-form-item>
                <el-form-item label="印刷要求（系数）">
                  <div class="aw-req-list">
                    <div v-for="(r, i) in config.pricing.requirements.list" :key="i" class="aw-req-row">
                      <el-input v-model="r.name" placeholder="名称（如 正常/跟色/打样）" style="width:160px" />
                      <el-input-number v-model="r.rate" :min="0" :step="0.01" :precision="2" controls-position="right" style="width:140px" />
                      <span class="param-hint">× (1 + 系数)</span>
                      <el-button size="small" text type="danger" :disabled="config.pricing.requirements.list.length <= 1" @click="config.pricing.requirements.list.splice(i, 1)">删除</el-button>
                    </div>
                    <el-button size="small" plain @click="config.pricing.requirements.list.push({ name: '', rate: 0 })">＋ 新增印刷要求</el-button>
                    <small class="param-hint">客户在前台单选一项；计费 = 基础生产金额 × (1 + 系数)</small>
                  </div>
                </el-form-item>
                <el-form-item label="糊盒单价（元/个）"><el-input-number v-model="config.pricing.glue.unitPricePerPiece" :min="0" :step="0.01" /><small class="param-hint">客户选“粘”时：单价 × 数量</small></el-form-item>
                <el-form-item label="专色版费（元/色）"><el-input-number v-model="config.pricing.spotColor.plateFeePerColor" :min="0" :step="10" /></el-form-item>
                <el-form-item label="免运费门槛（元）"><el-input-number v-model="config.shipping.freeThreshold" :min="0" :step="100" /></el-form-item>
                <el-form-item label="配送费（元）"><el-input-number v-model="config.shipping.fee" :min="0" :step="1" /></el-form-item>
              </el-form>
            </section>
            <footer class="workspace-save"><span>报价按材质数量阶梯档位计算；低于最低消费按最低消费计</span><el-button class="pb-btn-primary" type="primary" :loading="busy" native-type="submit">{{ busy ? '保存中…' : '保存价格规则' }}</el-button></footer>
          </form>

          <!-- 前台定制 -->
          <form v-else-if="section === 'custom'" novalidate @submit.prevent="save">
            <section class="workspace-panel">
              <div class="panel-heading"><h2>前台排版</h2><span>选择商家前台的页面排版，与前台「页面编辑」同步，仅影响当前商家</span></div>
              <div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap"><el-select v-model="config.storefrontLayout" style="width:260px"><el-option label="A · 单列卡片流（移动友好）" value="a" /><el-option label="B · 左右分栏工作台（桌面高效）" value="b" /><el-option label="C · 分步向导（强引导）" value="c" /></el-select><el-select v-model="config.storefrontTheme" style="width:200px"><el-option v-for="t in themeOptions" :key="t.id" :label="t.label" :value="t.id"><span style="display:inline-flex;align-items:center;gap:6px"><i :style="{ width: '12px', height: '12px', borderRadius: '50%', background: t.main, display: 'inline-block' }"></i>{{ t.label }}</span></el-option></el-select></div>
            </section>
            <section class="workspace-panel">
              <div class="panel-heading"><h2>顶栏自定义入口</h2><span>显示在商家前台顶部导航，最多 6 个</span></div>
              <div style="display:flex;flex-direction:column;gap:8px;max-width:720px">
                <div v-for="(l, i) in config.topbarLinks" :key="i" style="display:flex;gap:8px;align-items:center">
                  <el-input v-model="l.name" placeholder="名称（如 产品目录）" style="width:180px" maxlength="30" />
                  <el-input v-model="l.url" placeholder="https://… 或 /shop/… 站内路径" style="width:300px" />
                  <el-button size="small" text type="danger" @click="config.topbarLinks.splice(i, 1)">删除</el-button>
                </div>
                <el-button size="small" plain :disabled="config.topbarLinks.length >= 6" @click="config.topbarLinks.push({ name: '', url: '' })">＋ 新增链接</el-button>
                <small class="param-hint">外链将在新标签打开；以 / 开头的站内路径站内跳转</small>
              </div>
            </section>
            <section class="workspace-panel">
              <div class="panel-heading"><h2>推荐内容区（画布坐标）</h2><span>顶部/底部画布 1200px、左/右侧 260px；可视化拖拽请到前台「页面编辑」，可手填 x/y/w/h</span></div>
              <div style="display:flex;flex-direction:column;gap:10px;max-width:760px">
                <div v-for="b in config.contentBlocks" :key="b.id" class="aw-block" style="border:1px solid #ecefe9;border-radius:8px;padding:8px;display:flex;flex-direction:column;gap:6px">
                  <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
                    <el-select v-model="b.region" size="small" style="width:110px"><el-option value="top" label="顶部" /><el-option value="left" label="左侧" /><el-option value="right" label="右侧" /><el-option value="bottom" label="底部" /></el-select>
                    <el-input-number v-model.number="b.x" :min="0" :max="['left','right'].includes(b.region) ? 260 : 1200" size="small" controls-position="right" /><span style="font-size:11px;color:#8a94a0">x</span>
                    <el-input-number v-model.number="b.y" :min="0" size="small" controls-position="right" /><span style="font-size:11px;color:#8a94a0">y</span>
                    <el-input-number v-model.number="b.w" :min="40" :max="1200" size="small" controls-position="right" /><span style="font-size:11px;color:#8a94a0">宽</span>
                    <el-input-number v-model.number="b.h" :min="20" size="small" controls-position="right" /><span style="font-size:11px;color:#8a94a0">高</span>
                    <el-button size="small" text type="danger" @click="removeBlock(b.id)">删除</el-button>
                    <el-image v-if="b.imageUrl" :src="blockImageUrl(b)" style="width:36px;height:36px;border-radius:4px" fit="cover" />
                  </div>
                  <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
                    <el-input v-model="b.imageUrl" size="small" placeholder="图片（/uploads/… 或 https://…）" style="width:300px" />
                    <label class="el-button el-button--default el-button--small" style="margin:0"><input type="file" accept="image/png,image/jpeg,image/webp,image/gif" style="display:none" @change="uploadBlockImage($event, b)" />上传</label>
                    <el-input v-model="b.text" size="small" placeholder="文本（可选）" maxlength="200" style="width:200px" />
                    <el-input v-model="b.link" size="small" placeholder="链接（可选）" style="width:200px" />
                  </div>
                </div>
                <el-button size="small" plain :disabled="config.contentBlocks.length >= 50" @click="addBlock()">＋ 新增内容块</el-button>
              </div>
            </section>
            <footer class="workspace-save"><span>保存后商家前台立即生效</span><el-button class="pb-btn-primary" type="primary" :loading="busy" native-type="submit">{{ busy ? '保存中…' : '保存前台定制' }}</el-button></footer>
          </form>

          <!-- 盒形公式 -->
          <section v-else-if="section === 'boxes'">
            <el-alert type="info" :closable="false" show-icon title="盒形展开公式为系统内置（卡盒/坑盒两套：坑盒含坑厚常量 3mm，双插/锁底/平口/一体成型参考分享印微坑类目，自动锁底/天地/抽屉为行业规则），后台不可编辑；展开面积 = 展开长 × 展开宽 ÷ 1,000,000（㎡）。" style="margin-bottom:14px" />
            <article v-for="item in shapes" :key="item.id" class="workspace-panel">
              <div class="panel-heading"><h2>{{ item.name }} <el-tag size="small" type="info">{{ item.id }}</el-tag></h2></div>
              <p class="formula-note">{{ item.description }}</p>
              <el-form label-width="120px" style="max-width:760px">
                <el-form-item label="所需尺寸参数"><el-input :model-value="item.params.map(p => p.label + (p.defaultValue != null ? '（默认 ' + p.defaultValue + 'mm）' : '')).join('、')" disabled /></el-form-item>
                <el-form-item label="卡盒·展开长公式"><el-input :model-value="item.formulaText.length" disabled /></el-form-item>
                <el-form-item label="卡盒·展开宽公式"><el-input :model-value="item.formulaText.width" disabled /></el-form-item>
                <el-form-item v-if="item.formulaTextKeng" label="坑盒·展开长公式"><el-input :model-value="item.formulaTextKeng.length" disabled /></el-form-item>
                <el-form-item v-if="item.formulaTextKeng" label="坑盒·展开宽公式"><el-input :model-value="item.formulaTextKeng.width" disabled /></el-form-item>
              </el-form>
            </article>
            <article class="workspace-panel"><div class="panel-heading"><h2>自定义盒型 <el-tag size="small" type="info">custom</el-tag></h2></div><p class="formula-note">已有展开图或特殊结构：客户在前台手动填写展开尺寸，报价按手填尺寸计算。</p></article>
          </section>

        </template>

        <section v-else-if="!busy && section !== 'merchants'" class="workspace-panel">请先选择商户。</section>
      </div>
    </div>
  </main>
</template>
<style scoped>
.ws-a { display: grid; grid-template-columns: 230px minmax(0, 1fr); min-height: 100vh; background: #f3f5f7; }
.ws-a-side { background: #172837; color: #c7d2dd; padding: 24px 16px; display: flex; flex-direction: column; gap: 14px; position: sticky; top: 0; height: 100vh; box-sizing: border-box; }
.ws-a-word { display: flex; align-items: center; gap: 10px; color: #fff; font-weight: 800; font-size: 15px; }
.ws-a-word span { width: 32px; height: 32px; border-radius: 8px; background: #88bd45; display: flex; align-items: center; justify-content: center; }
.ws-a-word small { display: block; font-weight: 400; color: #93a5b5; font-size: 11px; }
.ws-a-ctx { background: rgba(255,255,255,.06); border-radius: 10px; padding: 10px 12px; display: flex; flex-direction: column; gap: 2px; }
.ws-a-ctx small { color: #93a5b5; font-size: 11px; }
.ws-a-ctx strong { color: #fff; font-size: 14px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ws-a-ctx code { color: #88bd45; font-size: 11px; }
.ws-a-side nav { display: flex; flex-direction: column; gap: 4px; }
.ws-a-side nav b { font-size: 11px; color: #7c8ea0; padding: 8px 10px 2px; font-weight: 600; }
.ws-a-side nav button { border: 0; background: transparent; color: #c7d2dd; text-align: left; padding: 10px 12px; border-radius: 8px; cursor: pointer; font-size: 13px; display: flex; align-items: center; gap: 8px; width: 100%; box-sizing: border-box; }
.ws-a-side nav button:hover:not(:disabled) { background: rgba(255,255,255,.07); }
.ws-a-side nav button.on { background: #88bd45; color: #172837; font-weight: 700; }
  .ws-a-side nav button .el-icon { font-size: 15px; }
.ws-a-side nav button:disabled { opacity: .5; cursor: not-allowed; }
.ws-a-user { margin-top: auto; display: flex; align-items: center; justify-content: space-between; padding-top: 10px; border-top: 1px solid rgba(255,255,255,.08); }
.ws-a-user small { color: #93a5b5; }
.ws-a-user button { border: 0; background: transparent; color: #c7d2dd; cursor: pointer; font-size: 12px; }
.ws-a-user button:hover { color: #fff; }
.ws-a-main { display: flex; flex-direction: column; min-width: 0; }
.ws-a-top { display: flex; align-items: center; gap: 12px; padding: 12px 22px; background: #fff; border-bottom: 1px solid #e7ebe5; position: sticky; top: 0; z-index: 8; }
.ws-a-top .el-breadcrumb { margin-right: auto; }
.ws-a-content { padding: 20px 24px 60px; display: flex; flex-direction: column; gap: 16px; max-width: 960px; margin: 0 auto; width: 100%; }
.ws-a-busy { display: inline-flex; align-items: center; gap: 8px; align-self: flex-start; background: #eef4ea; color: var(--sf-main); font-size: 12px; padding: 6px 14px; border-radius: 16px; border: 1px solid #cfe0c2; }

/* 内容区主操作按钮：更醒目的尺寸与字重 */
.ws-a-content .el-button--primary { height: 40px; padding: 0 26px; font-size: 14px; font-weight: 600; border-radius: 10px; }
.ws-a-content .el-button--primary:active { transform: translateY(1px); }
.ws-a-content .workspace-save .el-button--primary { min-width: 140px; }
.ws-a-content .panel-heading .el-button--primary, .ws-a-content .ad-material-head .el-button { height: 32px; padding: 0 16px; font-size: 13px; }


.ws-home { display: flex; flex-direction: column; gap: 16px; }
.ws-home-hello h1 { margin: 0 0 6px; font-size: 22px; color: #2b333b; }
.ws-home-hello p { margin: 0 0 4px; color: #8a94a0; font-size: 13px; }
.ws-home-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; }
.ws-home-stat { background: #fff; border: 1px solid #e7ebe5; border-radius: 12px; padding: 16px; display: flex; flex-direction: column; gap: 4px; }
.ws-home-stat b { font-size: 24px; color: #2b333b; }
.ws-home-stat span { color: #8a94a0; font-size: 12px; }
.ws-home-quick { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; }
.ws-home-quick button { border: 1px solid #dce6d9; background: #fff; border-radius: 12px; padding: 16px 14px; font-size: 14px; color: var(--sf-strong); cursor: pointer; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 8px; }
.ws-home-quick button:hover { background: var(--sf-soft); }
.aw-req-list { display: flex; flex-direction: column; gap: 8px; min-width: 420px; }
.aw-req-row { display: flex; align-items: center; gap: 10px; }
</style>

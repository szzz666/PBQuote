<script setup>
import { computed, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { computeUnfolded, boxShapes, CUSTOM_SHAPE } from '../../lib/box-shapes'
import { Shop, Brush, PriceTag, Box, View, TopRight } from '@element-plus/icons-vue'
import AdminContent from './AdminContent.vue'

const route = useRoute()
const variant = computed(() => String(route.params.variant || 'a').toLowerCase())
const isA = computed(() => variant.value === 'a')
const isB = computed(() => variant.value === 'b')
const isC = computed(() => variant.value === 'c')

const section = ref('home')
const tabs = ref(['home'])
const tabTitles = { home: '工作台', merchants: '商户管理', brand: '品牌设置', pricing: '价格规则', boxes: '盒形公式', preview: '报价预览' }
const merchants = [
  { name: '金福赢包装', slug: 'jinfuying', status: 'active' },
  { name: '默认商户', slug: 'default', status: 'active' },
  { name: '测试商户', slug: 'test-shop', status: 'disabled' },
  { name: '修复验证', slug: 'fix-verify', status: 'active' },
]
const user = { role: 'super_admin', username: 'admin' }
const materials = reactive([
  { name: '350克白卡', tiers: [{ q: 500, price: 8.4, min: 580 }, { q: 1000, price: 5.6, min: 850 }, { q: 2000, price: 5.1, min: 1080 }] },
  { name: '300克白卡白E坑', tiers: [{ q: 1000, price: 9.5, min: 1200 }] },
])
const stats = { merchants: 4, active: 3, materials: 2, quotes: 128 }
const treatments = { '哑胶': { unitPricePerM2: 0.2 }, '光胶': { unitPricePerM2: 0.2 }, '逆向 UV': { unitPricePerM2: 0.2 } }

function go(s) { section.value = s; if (isC.value && !tabs.value.includes(s)) tabs.value.push(s) }
function closeTab(s) {
  const i = tabs.value.indexOf(s)
  if (i < 0) return
  tabs.value.splice(i, 1)
  if (section.value === s) section.value = tabs.value[tabs.value.length - 1] || 'home'
}
function save() { ElMessage.success('已保存，商户前台已更新') }
function savePricing() { ElMessage.success('价格规则已保存') }
const preview = reactive({ shapeId: 'double-insert', length: 120, width: 80, height: 35, thickness: 1.5, cover: 15, quantity: 500 })
const previewUnfold = computed(() => { try { return computeUnfolded(preview.shapeId, { length: preview.length, width: preview.width, height: preview.height, thickness: preview.thickness, cover: preview.cover }) } catch { return { length: 0, width: 0 } } })
const previewArea = computed(() => previewUnfold.value.length * previewUnfold.value.width / 1e6)
const previewTotal = computed(() => Math.max(previewArea.value * preview.quantity * 8.4, 580).toFixed(2))
</script>
<template>
  <div class="ad-demo">
    <template v-if="isA">
      <div class="ad-a">
        <aside class="ad-a-side">
          <div class="ad-a-word"><span>P</span><div>PBQuote<small>商户管理工作台</small></div></div>
          <div class="ad-a-ctx"><small>当前商户</small><strong>金福赢包装</strong><code>jinfuying</code></div>
          <nav>
            <button v-if="user.role === 'super_admin'" :class="{ on: section === 'merchants' }" @click="go('merchants')"><el-icon><Shop /></el-icon><span>商户管理</span></button>
            <b>商户配置</b>
            <button :class="{ on: section === 'brand' }" @click="go('brand')"><el-icon><Brush /></el-icon><span>品牌设置</span></button>
            <button :class="{ on: section === 'pricing' }" @click="go('pricing')"><el-icon><PriceTag /></el-icon><span>价格规则</span></button>
            <button :class="{ on: section === 'boxes' }" @click="go('boxes')"><el-icon><Box /></el-icon><span>盒形公式</span></button>
            <button :class="{ on: section === 'preview' }" @click="go('preview')"><el-icon><View /></el-icon><span>报价预览</span></button>
          </nav>
          <div class="ad-a-user"><small>{{ user.username }}</small><button>退出登录</button></div>
        </aside>
        <div class="ad-a-main">
          <header class="ad-a-top">
            <el-breadcrumb separator="/"><el-breadcrumb-item>{{ section === 'merchants' ? '系统' : '商户配置' }}</el-breadcrumb-item><el-breadcrumb-item>{{ tabTitles[section] }}</el-breadcrumb-item></el-breadcrumb>
            <el-tag type="success" size="small">jinfuying 已启用</el-tag>
            <el-button size="small" @click="go('preview')"><el-icon style="vertical-align:-2px;margin-right:4px"><TopRight /></el-icon>查看商户前台</el-button>
          </header>
          <div class="ad-a-content"><AdminContent :treatments="treatments" :section="section" :tab-titles="tabTitles" :merchants="merchants" :materials="materials" :user="user" :preview="preview" :preview-unfold="previewUnfold" :preview-area="previewArea" :preview-total="previewTotal" :stats="stats" @go="go" @save="save" @save-pricing="savePricing" /></div>
        </div>
      </div>
    </template>
    <template v-else-if="isB">
      <div class="ad-b">
        <header class="ad-b-top">
          <div class="ad-b-brand"><span>P</span><div><strong>PBQuote</strong><small>商户管理工作台</small></div></div>
          <nav><button :class="{ on: section === 'home' }" @click="go('home')">工作台</button><button :class="{ on: section === 'merchants' }" @click="go('merchants')">商户管理</button><button :class="{ on: section === 'brand' }" @click="go('brand')">品牌设置</button><button :class="{ on: section === 'pricing' }" @click="go('pricing')">价格规则</button><button :class="{ on: section === 'boxes' }" @click="go('boxes')">盒形公式</button><button :class="{ on: section === 'preview' }" @click="go('preview')">报价预览</button></nav>
          <el-dropdown trigger="click"><el-button size="small">admin ▾</el-button><template #dropdown><el-dropdown-menu><el-dropdown-item disabled>超级管理员</el-dropdown-item><el-dropdown-item divided>退出登录</el-dropdown-item></el-dropdown-menu></template></el-dropdown>
        </header>
        <main class="ad-b-main">
          <div class="ad-b-greeting"><h1>你好，admin 👋</h1><p>今天有 3 个商户在线，128 张报价单待跟进。</p></div>
          <AdminContent :treatments="treatments" :section="section" :tab-titles="tabTitles" :merchants="merchants" :materials="materials" :user="user" :preview="preview" :preview-unfold="previewUnfold" :preview-area="previewArea" :preview-total="previewTotal" :stats="stats" @go="go" @save="save" @save-pricing="savePricing" />
        </main>
      </div>
    </template>
    <template v-else>
      <div class="ad-c">
        <header class="ad-c-top">
          <div class="ad-c-brand"><span>P</span><div><strong>PBQuote</strong><small>商户管理工作台</small></div></div>
          <div class="ad-c-ctx"><el-tag size="small" type="success">jinfuying</el-tag><span>金福赢包装</span></div>
          <el-button size="small" @click="go('preview')"><el-icon style="vertical-align:-2px;margin-right:4px"><TopRight /></el-icon>查看商户前台</el-button>
        </header>
        <div class="ad-c-tabs">
          <div v-for="t in tabs" :key="t" class="ad-c-tab" :class="{ on: section === t }" @click="section = t">{{ tabTitles[t] }}<i v-if="t !== 'home'" @click.stop="closeTab(t)">×</i></div>
          <div class="ad-c-add">
            <el-dropdown trigger="click" @command="go"><el-button size="small" text>＋ 打开模块</el-button><template #dropdown><el-dropdown-menu><el-dropdown-item command="merchants">商户管理</el-dropdown-item><el-dropdown-item command="brand">品牌设置</el-dropdown-item><el-dropdown-item command="pricing">价格规则</el-dropdown-item><el-dropdown-item command="boxes">盒形公式</el-dropdown-item><el-dropdown-item command="preview">报价预览</el-dropdown-item></el-dropdown-menu></template></el-dropdown>
          </div>
        </div>
        <main class="ad-c-main"><AdminContent :treatments="treatments" :section="section" :tab-titles="tabTitles" :merchants="merchants" :materials="materials" :user="user" :preview="preview" :preview-unfold="previewUnfold" :preview-area="previewArea" :preview-total="previewTotal" :stats="stats" @go="go" @save="save" @save-pricing="savePricing" /></main>
      </div>
    </template>
    <div class="ad-toolbar">
      <a href="/demo" class="ad-back">‹ 返回方案总览</a>
      <span class="ad-title">后台方案 {{ isA ? 'A · 经典左侧导航' : isB ? 'B · 仪表盘' : 'C · 多标签页' }}</span>
      <div class="ad-switch">
        <router-link :to="'/demo/admin/a'" :class="{ on: isA }">A</router-link>
        <router-link :to="'/demo/admin/b'" :class="{ on: isB }">B</router-link>
        <router-link :to="'/demo/admin/c'" :class="{ on: isC }">C</router-link>
      </div>
    </div>
  </div>
</template>
<style scoped>
.ad-toolbar { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; padding: 10px 18px; background: #fff; border-bottom: 1px dashed #e7ebe5; }
.ad-back { color: var(--sf-main); font-size: 13px; text-decoration: none; }
.ad-title { font-weight: 700; font-size: 14px; color: #2b333b; }
.ad-switch { margin-left: auto; display: flex; gap: 6px; }
.ad-switch a { border: 1px solid #dce6d9; border-radius: 14px; padding: 4px 12px; font-size: 12px; color: #6b786f; text-decoration: none; }
.ad-switch a.on { background: var(--sf-soft); border-color: var(--sf-light); color: var(--sf-strong); }
.ad-a { display: grid; grid-template-columns: 230px minmax(0, 1fr); min-height: calc(100vh - 44px); background: #f3f5f7; }
.ad-a-side { background: #172837; color: #c7d2dd; padding: 24px 16px; display: flex; flex-direction: column; gap: 14px; }
.ad-a-word { display: flex; align-items: center; gap: 10px; color: #fff; font-weight: 800; }
.ad-a-word span { width: 32px; height: 32px; border-radius: 8px; background: #88bd45; display: flex; align-items: center; justify-content: center; }
.ad-a-word small { display: block; font-weight: 400; color: #93a5b5; font-size: 11px; }
.ad-a-ctx { background: rgba(255,255,255,.06); border-radius: 10px; padding: 10px 12px; display: flex; flex-direction: column; gap: 2px; }
.ad-a-ctx small { color: #93a5b5; font-size: 11px; }
.ad-a-ctx strong { color: #fff; font-size: 14px; }
.ad-a-ctx code { color: #88bd45; font-size: 11px; }
.ad-a-side nav { display: flex; flex-direction: column; gap: 4px; }
.ad-a-side nav b { font-size: 11px; color: #7c8ea0; padding: 8px 10px 2px; }
.ad-a-side nav button { border: 0; background: transparent; color: #c7d2dd; text-align: left; padding: 10px 12px; border-radius: 8px; cursor: pointer; font-size: 13px; display: flex; align-items: center; gap: 8px; width: 100%; box-sizing: border-box; }
.ad-a-side nav button:hover { background: rgba(255,255,255,.07); }
.ad-a-side nav button.on { background: #88bd45; color: #172837; font-weight: 700; }
.ad-a-user { margin-top: auto; display: flex; align-items: center; justify-content: space-between; }
.ad-a-user small { color: #93a5b5; }
.ad-a-user button { border: 0; background: transparent; color: #c7d2dd; cursor: pointer; font-size: 12px; }
.ad-a-main { display: flex; flex-direction: column; min-width: 0; }
.ad-a-top { display: flex; align-items: center; gap: 12px; padding: 12px 22px; background: #fff; border-bottom: 1px solid #e7ebe5; }
.ad-a-top .el-breadcrumb { margin-right: auto; }
.ad-a-content { padding: 18px 22px; }
.ad-b { min-height: calc(100vh - 44px); background: #f5f6f8; }
.ad-b-top { display: flex; align-items: center; gap: 18px; padding: 12px 26px; background: #fff; border-bottom: 1px solid #e7ebe5; position: sticky; top: 0; z-index: 10; }
.ad-b-brand { display: flex; align-items: center; gap: 10px; }
.ad-b-brand span { width: 34px; height: 34px; border-radius: 9px; background: #88bd45; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 800; }
.ad-b-brand small { display: block; color: #8a94a0; font-size: 11px; }
.ad-b-top nav { display: flex; gap: 4px; margin: 0 auto; }
.ad-b-top nav button { border: 0; background: transparent; padding: 8px 14px; border-radius: 8px; color: #5b6570; cursor: pointer; font-size: 13px; font-weight: 600; }
.ad-b-top nav button:hover { background: #f0f5ec; }
.ad-b-top nav button.on { background: var(--sf-soft); color: var(--sf-strong); }
.ad-b-main { max-width: 1120px; margin: 0 auto; padding: 22px 18px 50px; }
.ad-b-greeting h1 { margin: 0 0 6px; font-size: 22px; color: #2b333b; }
.ad-b-greeting p { margin: 0 0 18px; color: #8a94a0; font-size: 13px; }
.ad-c { min-height: calc(100vh - 44px); background: #f5f6f8; }
.ad-c-top { display: flex; align-items: center; gap: 16px; padding: 12px 22px; background: #fff; border-bottom: 1px solid #e7ebe5; }
.ad-c-brand { display: flex; align-items: center; gap: 10px; }
.ad-c-brand span { width: 34px; height: 34px; border-radius: 9px; background: #172837; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 800; }
.ad-c-brand small { display: block; color: #8a94a0; font-size: 11px; }
.ad-c-ctx { margin-left: auto; display: flex; align-items: center; gap: 8px; font-size: 13px; color: #5b6570; }
.ad-c-tabs { display: flex; align-items: flex-end; gap: 4px; padding: 8px 16px 0; background: #fff; border-bottom: 1px solid #e7ebe5; overflow-x: auto; }
.ad-c-tab { padding: 9px 16px; border-radius: 9px 9px 0 0; font-size: 13px; color: #6b786f; cursor: pointer; display: flex; align-items: center; gap: 8px; background: #f6f8f4; border: 1px solid #e7ebe5; border-bottom: 0; white-space: nowrap; }
.ad-c-tab i { font-style: normal; color: #b3bcc8; font-size: 14px; }
.ad-c-tab i:hover { color: #d54941; }
.ad-c-tab.on { background: #fff; color: #2b333b; font-weight: 700; border-top: 2px solid #88bd45; }
.ad-c-add { padding-bottom: 8px; }
.ad-c-main { max-width: 1120px; margin: 0 auto; padding: 18px 18px 40px; }
</style>

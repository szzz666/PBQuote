<script setup>
import { computed, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { HomeFilled, OfficeBuilding, Postcard, Coin, Box, View, UserFilled, Plus, SwitchButton } from '@element-plus/icons-vue'
import { computeUnfolded, boxShapes } from '../../lib/box-shapes'
import AdminContent from './AdminContent.vue'

const route = useRoute()
const variant = computed(() => String(route.params.variant || 'a').toLowerCase())
const isA = computed(() => variant.value === 'a')
const isB = computed(() => variant.value === 'b')
const isC = computed(() => variant.value === 'c')

const section = ref('home')
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
const treatments = { '哑胶': { unitPricePerM2: 0.2 }, '光胶': { unitPricePerM2: 0.2 }, '逆向 UV': { unitPricePerM2: 0.2 } }
const stats = { merchants: 4, active: 3, materials: 2, quotes: 128 }
const currentMerchant = ref('jinfuying')
const openMerchants = ref(['jinfuying'])
const merchantSections = reactive({ jinfuying: 'brand', default: 'home' })
const currentMerchantObj = computed(() => merchants.find(m => m.slug === currentMerchant.value) || merchants[0])
function openMerchant(slug) { if (!openMerchants.value.includes(slug)) openMerchants.value.push(slug); currentMerchant.value = slug }
function closeMerchant(slug) {
  const i = openMerchants.value.indexOf(slug); if (i < 0) return; openMerchants.value.splice(i, 1);
  if (currentMerchant.value === slug) currentMerchant.value = openMerchants.value[openMerchants.value.length - 1] || 'jinfuying'
}
function goC(s) { merchantSections[currentMerchant.value] = s }
const sectionC = computed(() => merchantSections[currentMerchant.value] || 'home')
function go(s) { section.value = s }
function save() { ElMessage.success('已保存，商户前台已更新') }
function savePricing() { ElMessage.success('价格规则已保存') }
const preview = reactive({ shapeId: 'double-insert', length: 120, width: 80, height: 35, thickness: 1.5, cover: 15, quantity: 500 })
const previewUnfold = computed(() => { try { return computeUnfolded(preview.shapeId, { length: preview.length, width: preview.width, height: preview.height, thickness: preview.thickness, cover: preview.cover }) } catch { return { length: 0, width: 0 } } })
const previewArea = computed(() => previewUnfold.value.length * previewUnfold.value.width / 1e6)
const previewTotal = computed(() => Math.max(previewArea.value * preview.quantity * 8.4, 580).toFixed(2))
const contentProps = { tabTitles, materials, treatments, user, preview, previewUnfold, previewArea, previewTotal, stats }
</script>
<template>
  <div class="cd">
    <template v-if="isA">
      <div class="ca">
        <header class="ca-top">
          <div class="ca-brand"><span>P</span><div><strong>PBQuote</strong><small>商户管理工作台</small></div></div>
          <nav class="ca-nav">
            <button :class="{ on: section === 'home' }" @click="go('home')"><el-icon><HomeFilled /></el-icon> 工作台</button>
            <button :class="{ on: section === 'merchants' }" @click="go('merchants')"><el-icon><OfficeBuilding /></el-icon> 商户</button>
            <button :class="{ on: section === 'brand' }" @click="go('brand')"><el-icon><Postcard /></el-icon> 品牌</button>
            <button :class="{ on: section === 'pricing' }" @click="go('pricing')"><el-icon><Coin /></el-icon> 价格</button>
            <button :class="{ on: section === 'boxes' }" @click="go('boxes')"><el-icon><Box /></el-icon> 盒形</button>
            <button :class="{ on: section === 'preview' }" @click="go('preview')"><el-icon><View /></el-icon> 预览</button>
          </nav>
          <div class="ca-right">
            <el-select :model-value="currentMerchant" style="width:170px" @change="v => currentMerchant = v"><el-option v-for="m in merchants" :key="m.slug" :label="m.name + ' (' + m.slug + ')'" :value="m.slug" /></el-select>
            <el-dropdown trigger="click"><el-button size="small"><el-icon style="vertical-align:-2px"><UserFilled /></el-icon> admin</el-button><template #dropdown><el-dropdown-menu><el-dropdown-item disabled>超级管理员</el-dropdown-item><el-dropdown-item divided><el-icon><SwitchButton /></el-icon> 退出登录</el-dropdown-item></el-dropdown-menu></template></el-dropdown>
          </div>
        </header>
        <main class="ca-main">
          <div v-if="section === 'home'" class="ca-hello"><h1>你好，admin 👋</h1><p>3 个商户在线，128 张报价单待跟进。</p></div>
          <AdminContent :section="section" :merchants="merchants" v-bind="contentProps" @go="go" @save="save" @save-pricing="savePricing" />
        </main>
      </div>
    </template>
    <template v-else-if="isB">
      <div class="cb">
        <aside class="cb-side">
          <div class="cb-logo">P</div>
          <nav class="cb-nav">
            <button :class="{ on: section === 'home' }" title="工作台" @click="go('home')"><el-icon><HomeFilled /></el-icon></button>
            <button :class="{ on: section === 'merchants' }" title="商户管理" @click="go('merchants')"><el-icon><OfficeBuilding /></el-icon></button>
            <button :class="{ on: section === 'brand' }" title="品牌设置" @click="go('brand')"><el-icon><Postcard /></el-icon></button>
            <button :class="{ on: section === 'pricing' }" title="价格规则" @click="go('pricing')"><el-icon><Coin /></el-icon></button>
            <button :class="{ on: section === 'boxes' }" title="盒形公式" @click="go('boxes')"><el-icon><Box /></el-icon></button>
            <button :class="{ on: section === 'preview' }" title="报价预览" @click="go('preview')"><el-icon><View /></el-icon></button>
          </nav>
          <div class="cb-user"><el-icon><UserFilled /></el-icon></div>
        </aside>
        <div class="cb-main">
          <header class="cb-top">
            <el-breadcrumb separator="/"><el-breadcrumb-item>商户配置</el-breadcrumb-item><el-breadcrumb-item>{{ tabTitles[section] }}</el-breadcrumb-item></el-breadcrumb>
            <el-tag type="success" size="small">jinfuying 已启用</el-tag>
            <el-button size="small" @click="go('preview')">查看商户前台 ↗</el-button>
          </header>
          <div class="cb-content"><AdminContent :section="section" :merchants="merchants" v-bind="contentProps" @go="go" @save="save" @save-pricing="savePricing" /></div>
        </div>
      </div>
    </template>
    <template v-else>
      <div class="cc">
        <header class="cc-top">
          <div class="cc-brand"><span>P</span><div><strong>PBQuote</strong><small>商户管理工作台</small></div></div>
          <div class="cc-tabs">
            <div v-for="m in openMerchants" :key="m" class="cc-tab" :class="{ on: currentMerchant === m }" @click="currentMerchant = m">{{ merchants.find(x => x.slug === m)?.name || m }}<i v-if="openMerchants.length > 1" @click.stop="closeMerchant(m)">×</i></div>
            <el-dropdown trigger="click" @command="openMerchant"><el-button size="small" text><el-icon style="vertical-align:-2px"><Plus /></el-icon> 打开商户</el-button><template #dropdown><el-dropdown-menu><el-dropdown-item v-for="m in merchants" :key="m.slug" :command="m.slug">{{ m.name }}</el-dropdown-item></el-dropdown-menu></template></el-dropdown>
          </div>
          <el-dropdown trigger="click"><el-button size="small">admin ▾</el-button><template #dropdown><el-dropdown-menu><el-dropdown-item disabled>超级管理员</el-dropdown-item><el-dropdown-item divided>退出登录</el-dropdown-item></el-dropdown-menu></template></el-dropdown>
        </header>
        <div class="cc-body">
          <aside class="cc-side">
            <div class="cc-ctx"><small>当前商户</small><strong>{{ currentMerchantObj.name }}</strong><code>{{ currentMerchantObj.slug }}</code></div>
            <nav>
              <button :class="{ on: sectionC === 'brand' }" @click="goC('brand')"><el-icon><Postcard /></el-icon> 品牌设置</button>
              <button :class="{ on: sectionC === 'pricing' }" @click="goC('pricing')"><el-icon><Coin /></el-icon> 价格规则</button>
              <button :class="{ on: sectionC === 'boxes' }" @click="goC('boxes')"><el-icon><Box /></el-icon> 盒形公式</button>
              <button :class="{ on: sectionC === 'preview' }" @click="goC('preview')"><el-icon><View /></el-icon> 报价预览</button>
            </nav>
          </aside>
          <main class="cc-main">
            <div class="cc-greet"><h2>{{ currentMerchantObj.name }} · {{ tabTitles[sectionC] }}</h2><p>当前商户独立维护品牌、价格与盒型，互不影响。</p></div>
            <AdminContent :section="sectionC" :merchants="[currentMerchantObj]" v-bind="contentProps" @go="goC" @save="save" @save-pricing="savePricing" />
          </main>
        </div>
      </div>
    </template>
    <div class="cd-bar">
      <a href="/demo" class="cd-back">‹ 返回方案总览</a>
      <span class="cd-title">后台重构方案 {{ isA ? 'A · 顶部导航 SaaS 风' : isB ? 'B · 极简图标栏' : 'C · 多商户标签工作区' }}</span>
      <div class="cd-switch"><router-link :to="'/demo/console/a'" :class="{ on: isA }">A</router-link><router-link :to="'/demo/console/b'" :class="{ on: isB }">B</router-link><router-link :to="'/demo/console/c'" :class="{ on: isC }">C</router-link></div>
    </div>
  </div>
</template>
<style scoped>
.cd-bar { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; padding: 10px 18px; background: #fff; border-bottom: 1px dashed #e7ebe5; }
.cd-back { color: var(--sf-main); font-size: 13px; text-decoration: none; }
.cd-title { font-weight: 700; font-size: 14px; color: #2b333b; }
.cd-switch { margin-left: auto; display: flex; gap: 6px; }
.cd-switch a { border: 1px solid #dce6d9; border-radius: 14px; padding: 4px 12px; font-size: 12px; color: #6b786f; text-decoration: none; }
.cd-switch a.on { background: var(--sf-soft); border-color: var(--sf-light); color: var(--sf-strong); }
.ca { min-height: calc(100vh - 44px); background: #f5f6f8; }
.ca-top { display: flex; align-items: center; gap: 20px; padding: 10px 26px; background: #fff; border-bottom: 1px solid #e7ebe5; position: sticky; top: 0; z-index: 10; }
.ca-brand { display: flex; align-items: center; gap: 10px; }
.ca-brand span { width: 34px; height: 34px; border-radius: 9px; background: linear-gradient(135deg,#55a630,#3c7a22); color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 800; }
.ca-brand small { display: block; color: #8a94a0; font-size: 11px; }
.ca-nav { display: flex; gap: 6px; margin: 0 auto; }
.ca-nav button { border: 0; background: transparent; padding: 9px 16px; border-radius: 9px; color: #5b6570; cursor: pointer; font-size: 13px; font-weight: 600; display: flex; align-items: center; gap: 6px; }
.ca-nav button:hover { background: #f0f5ec; }
.ca-nav button.on { background: var(--sf-soft); color: var(--sf-strong); }
.ca-right { display: flex; align-items: center; gap: 10px; }
.ca-main { max-width: 1120px; margin: 0 auto; padding: 22px 18px 50px; }
.ca-hello h1 { margin: 0 0 6px; font-size: 22px; color: #2b333b; }
.ca-hello p { margin: 0 0 16px; color: #8a94a0; font-size: 13px; }
.cb { display: grid; grid-template-columns: 64px minmax(0,1fr); min-height: calc(100vh - 44px); background: #f5f6f8; }
.cb-side { background: #172837; display: flex; flex-direction: column; align-items: center; gap: 18px; padding: 16px 0; position: sticky; top: 0; height: calc(100vh - 44px); box-sizing: border-box; }
.cb-logo { width: 36px; height: 36px; border-radius: 10px; background: #88bd45; color: #172837; font-weight: 800; display: flex; align-items: center; justify-content: center; }
.cb-nav { display: flex; flex-direction: column; gap: 8px; flex: 1; }
.cb-nav button { width: 40px; height: 40px; border: 0; border-radius: 10px; background: transparent; color: #93a5b5; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 17px; }
.cb-nav button:hover { background: rgba(255,255,255,.08); color: #fff; }
.cb-nav button.on { background: #88bd45; color: #172837; }
.cb-user { width: 34px; height: 34px; border-radius: 50%; background: #324b40; color: #e5f6d3; display: flex; align-items: center; justify-content: center; font-size: 15px; }
.cb-main { display: flex; flex-direction: column; min-width: 0; }
.cb-top { display: flex; align-items: center; gap: 12px; padding: 12px 24px; background: #fff; border-bottom: 1px solid #e7ebe5; position: sticky; top: 0; z-index: 8; }
.cb-top .el-breadcrumb { margin-right: auto; }
.cb-content { padding: 20px 24px 60px; }
.cc { min-height: calc(100vh - 44px); background: #f5f6f8; }
.cc-top { display: flex; align-items: center; gap: 14px; padding: 10px 20px; background: #fff; border-bottom: 1px solid #e7ebe5; position: sticky; top: 0; z-index: 10; }
.cc-brand { display: flex; align-items: center; gap: 10px; }
.cc-brand span { width: 34px; height: 34px; border-radius: 9px; background: #172837; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 800; }
.cc-brand small { display: block; color: #8a94a0; font-size: 11px; }
.cc-tabs { display: flex; align-items: center; gap: 4px; margin: 0 auto; }
.cc-tab { padding: 7px 14px; border-radius: 8px 8px 0 0; font-size: 13px; color: #6b786f; cursor: pointer; background: #f6f8f4; border: 1px solid #e7ebe5; border-bottom: 0; display: flex; align-items: center; gap: 8px; }
.cc-tab i { font-style: normal; color: #b3bcc8; font-size: 14px; }
.cc-tab i:hover { color: #d54941; }
.cc-tab.on { background: #fff; color: #2b333b; font-weight: 700; border-top: 2px solid #88bd45; }
.cc-body { display: grid; grid-template-columns: 190px minmax(0,1fr); }
.cc-side { background: #fff; border-right: 1px solid #e7ebe5; padding: 18px 12px; display: flex; flex-direction: column; gap: 12px; }
.cc-ctx { background: #f4f7f1; border-radius: 10px; padding: 10px 12px; display: flex; flex-direction: column; gap: 2px; }
.cc-ctx small { color: #8a94a0; font-size: 11px; }
.cc-ctx strong { color: #2b333b; font-size: 14px; }
.cc-ctx code { color: var(--sf-strong); font-size: 11px; }
.cc-side nav { display: flex; flex-direction: column; gap: 4px; }
.cc-side nav button { border: 0; background: transparent; text-align: left; padding: 10px 12px; border-radius: 8px; color: #5b6570; cursor: pointer; font-size: 13px; display: flex; align-items: center; gap: 8px; }
.cc-side nav button:hover { background: #f0f5ec; }
.cc-side nav button.on { background: var(--sf-soft); color: var(--sf-strong); font-weight: 700; }
.cc-main { padding: 20px 24px 60px; }
.cc-greet h2 { margin: 0 0 6px; font-size: 20px; color: #2b333b; }
.cc-greet p { margin: 0 0 16px; color: #8a94a0; font-size: 13px; }
</style>

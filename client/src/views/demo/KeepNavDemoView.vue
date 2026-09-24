<script setup>
import { computed, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { OfficeBuilding, Postcard, Coin, Box, View } from '@element-plus/icons-vue'
import { computeUnfolded, boxShapes } from '../../lib/box-shapes'

const route = useRoute()
const variant = computed(() => String(route.params.variant || '1').toLowerCase())
const is1 = computed(() => variant.value === '1')
const is2 = computed(() => variant.value === '2')
const is3 = computed(() => variant.value === '3')
const section = ref('home')
const pricingTab = ref('materials')
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
const processes = ['烫金', '烫银', '击凸', '丝印UV', '贴窗口']
const treatments = { '哑胶': 0.2, '光胶': 0.2, '逆向 UV': 0.2 }
const stats = { merchants: 4, active: 3, materials: 2, quotes: 128 }
const preview = reactive({ shapeId: 'double-insert', length: 120, width: 80, height: 35, thickness: 1.5, cover: 15, quantity: 500 })
const previewUnfold = computed(() => { try { return computeUnfolded(preview.shapeId, { length: preview.length, width: preview.width, height: preview.height, thickness: preview.thickness, cover: preview.cover }) } catch { return { length: 0, width: 0 } } })
const previewArea = computed(() => previewUnfold.value.length * previewUnfold.value.width / 1e6)
const previewTotal = computed(() => Math.max(previewArea.value * preview.quantity * 8.4, 580).toFixed(2))
function go(s) { section.value = s }
function save() { ElMessage.success('已保存，商户前台已更新') }
const savedAt = ref('')
function saveFloat() { savedAt.value = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }); ElMessage.success('已保存 ' + savedAt.value) }
</script>
<template>
  <div class="kn">
    <div class="kn-grid">
<aside class="kn-side">
  <div class="kn-word"><span>P</span><div>PBQuote<small>商户管理工作台</small></div></div>
  <div class="kn-ctx"><small>超级管理员</small><strong>金福赢包装</strong><code>jinfuying</code></div>
  <nav>
    <button v-if="user.role === 'super_admin'" :class="{ on: section === 'merchants' }" @click="go('merchants')"><el-icon><OfficeBuilding /></el-icon> 商户管理</button>
    <b>商户配置</b>
    <button :class="{ on: section === 'brand' }" @click="go('brand')"><el-icon><Postcard /></el-icon> 品牌设置</button>
    <button :class="{ on: section === 'pricing' }" @click="go('pricing')"><el-icon><Coin /></el-icon> 价格规则</button>
    <button :class="{ on: section === 'boxes' }" @click="go('boxes')"><el-icon><Box /></el-icon> 盒形公式</button>
    <button :class="{ on: section === 'preview' }" @click="go('preview')"><el-icon><View /></el-icon> 报价预览</button>
  </nav>
  <div class="kn-user"><small>{{ user.username }}</small><button>退出登录</button></div>
</aside>
      <div class="kn-main">
<header class="kn-top">
  <el-breadcrumb separator="/"><el-breadcrumb-item>{{ section === 'merchants' ? '系统' : '商户配置' }}</el-breadcrumb-item><el-breadcrumb-item>{{ tabTitles[section] }}</el-breadcrumb-item></el-breadcrumb>
  <el-tag type="success" size="small">jinfuying 已启用</el-tag>
  <el-button size="small" @click="go('preview')">查看商户前台 ↗</el-button>
</header>
        <div class="kn-content" :class="{ wide: is3 }">
<section v-if="section === 'home'">
  <div class="kn-hello"><h1>你好，admin 👋</h1><p>3 个商户在线，128 张报价单待跟进。</p></div>
  <div class="kn-stats">
    <div class="kn-stat"><b>{{ stats.merchants }}</b><span>商户总数</span></div>
    <div class="kn-stat"><b>{{ stats.active }}</b><span>启用中</span></div>
    <div class="kn-stat"><b>{{ stats.materials }}</b><span>纸张材质</span></div>
    <div class="kn-stat"><b>{{ stats.quotes }}</b><span>本月报价单</span></div>
  </div>
  <div class="kn-quick">
    <button @click="go('brand')"><el-icon><Postcard /></el-icon> 品牌设置</button>
    <button @click="go('pricing')"><el-icon><Coin /></el-icon> 价格规则</button>
    <button @click="go('boxes')"><el-icon><Box /></el-icon> 盒形公式</button>
    <button @click="go('preview')"><el-icon><View /></el-icon> 报价预览</button>
  </div>
  <div class="kn-card"><h3>商户一览</h3><el-table :data="merchants" size="small"><el-table-column prop="name" label="商户" /><el-table-column prop="slug" label="标识" /><el-table-column label="状态"><template #default="{ row }"><el-tag :type="row.status === 'active' ? 'success' : 'info'" size="small">{{ row.status === 'active' ? '启用中' : '已停用' }}</el-tag></template></el-table-column><el-table-column label=""><template #default="{ row }"><el-button size="small" type="primary" plain @click="go('brand')">进入配置</el-button></template></el-table-column></el-table></div>
</section>
<section v-else-if="section === 'merchants'" class="kn-card">
  <div class="kn-head"><h3>商户管理 <small>{{ merchants.length }} 个商户</small></h3><el-input placeholder="搜索" style="width:200px" /></div>
  <el-table :data="merchants" stripe><el-table-column prop="name" label="商户" min-width="160" /><el-table-column prop="slug" label="专属标识" min-width="120" /><el-table-column label="状态" width="100"><template #default="{ row }"><el-tag :type="row.status === 'active' ? 'success' : 'info'" size="small">{{ row.status === 'active' ? '启用中' : '已停用' }}</el-tag></template></el-table-column><el-table-column label="操作" width="170"><template #default="{ row }"><el-button size="small" type="primary" plain @click="go('brand')">进入配置</el-button></template></el-table-column></el-table>
</section>
<section v-else-if="section === 'brand'" class="kn-card">
  <div class="kn-head"><h3>品牌设置</h3><span>显示在客户报价前台</span></div>
  <el-form label-width="110px" style="max-width:620px">
    <el-form-item label="商户名称"><el-input :model-value="merchants[0].name" /></el-form-item>
    <el-form-item label="品牌副标题"><el-input placeholder="包装报价云" /></el-form-item>
    <el-form-item label="宣传语"><el-input placeholder="专业包装 · 智能报价" /></el-form-item>
    <el-form-item label="前台排版"><el-select style="width:100%"><el-option label="A · 单列卡片流" value="a" /><el-option label="B · 左右分栏" value="b" /><el-option label="C · 分步向导" value="c" /></el-select></el-form-item>
  </el-form>
  <el-button class="pb-btn-primary" type="primary" @click="save">保存品牌设置</el-button>
</section>
<section v-else-if="section === 'pricing'" class="kn-card">
  <div class="kn-head"><h3>价格规则</h3><el-button type="primary" plain size="small" @click="materials.push({ name: '新材质', tiers: [{ q: 500, price: 8, min: 500 }] })">＋ 新增材质</el-button></div>
  <el-tabs v-model="pricingTab">
    <el-tab-pane label="材质阶梯" name="materials">
      <div v-for="(m, mi) in materials" :key="mi" class="kn-material">
        <div class="kn-material-head"><b>材质 {{ mi + 1 }}</b><el-input v-model="m.name" style="max-width:220px" /></div>
        <el-table :data="m.tiers" size="small"><el-table-column label="数量起点（个）"><template #default="{ row }"><el-input-number v-model="row.q" :min="1" :step="100" controls-position="right" /></template></el-table-column><el-table-column label="单价（元/㎡）"><template #default="{ row }"><el-input-number v-model="row.price" :min="0" :step="0.1" controls-position="right" /></template></el-table-column><el-table-column label="最低消费（元）"><template #default="{ row }"><el-input-number v-model="row.min" :min="0" :step="10" controls-position="right" /></template></el-table-column><el-table-column label=""><template #default="scope"><el-button size="small" text type="danger" @click="m.tiers.splice(scope.$index, 1)">删除</el-button></template></el-table-column></el-table>
      </div>
    </el-tab-pane>
    <el-tab-pane label="表面处理" name="treatments"><div class="kn-treat"><span v-for="(v, n) in treatments" :key="n" class="kn-treat-item">{{ n }} · {{ v }} 元/㎡</span></div></el-tab-pane>
    <el-tab-pane label="工艺价格" name="processes"><div class="kn-chips"><span v-for="p in processes" :key="p" class="kn-treat-item">{{ p }}</span></div></el-tab-pane>
    <el-tab-pane label="印刷参数" name="params"><p class="kn-note">双面加收 60% · 跟色 8% · 打样 500 元 · 糊盒 0.05 元/个 · 专色 150 元/色</p></el-tab-pane>
  </el-tabs>
  <el-button class="pb-btn-primary" type="primary" @click="save">保存价格规则</el-button>
</section>
<section v-else-if="section === 'boxes'" class="kn-card">
  <div class="kn-head"><h3>盒形公式 <small>系统内置</small></h3></div>
  <div class="kn-boxes"><div v-for="s in boxShapes" :key="s.id" class="kn-box"><b>{{ s.name }}</b><small>{{ s.formulaText.length }}</small></div></div>
</section>
<section v-else-if="section === 'preview'" class="kn-card">
  <div class="kn-head"><h3>报价预览</h3><span>按当前规则试算</span></div>
  <el-form inline label-width="80px">
    <el-form-item label="盒形"><el-select v-model="preview.shapeId" style="width:150px"><el-option v-for="s in boxShapes" :key="s.id" :label="s.name" :value="s.id" /></el-select></el-form-item>
    <el-form-item label="长"><el-input-number v-model="preview.length" :min="1" controls-position="right" /></el-form-item>
    <el-form-item label="宽"><el-input-number v-model="preview.width" :min="1" controls-position="right" /></el-form-item>
    <el-form-item label="高"><el-input-number v-model="preview.height" :min="1" controls-position="right" /></el-form-item>
    <el-form-item label="数量"><el-input-number v-model="preview.quantity" :min="1" controls-position="right" /></el-form-item>
  </el-form>
  <el-descriptions :column="2" border style="max-width:620px"><el-descriptions-item label="展开尺寸">{{ previewUnfold.length }} × {{ previewUnfold.width }} mm</el-descriptions-item><el-descriptions-item label="单个面积">{{ previewArea.toFixed(4) }} ㎡</el-descriptions-item><el-descriptions-item label="预估总计"><strong>￥{{ previewTotal }}</strong></el-descriptions-item></el-descriptions>
</section>
          <section v-else class="kn-card">请先选择商户。</section>
        </div>
      </div>
    </div>
    <transition name="el-fade-in">
      <div v-if="is3 && (section === 'brand' || section === 'pricing')" class="kn-float">
        <span v-if="savedAt" class="kn-saved">已保存 {{ savedAt }}</span>
        <el-button class="pb-btn-primary" type="primary" size="large" @click="saveFloat">{{ section === 'pricing' ? '保存价格规则' : '保存品牌设置' }}</el-button>
      </div>
    </transition>
    <div class="cd-bar">
      <a href="/demo" class="cd-back">‹ 返回方案总览</a>
      <span class="cd-title">内容区方案 {{ is1 ? '1 · 工作台首页' : is2 ? '2 · 模块内页签' : '3 · 全宽+悬浮保存' }}（导航栏不变）</span>
      <div class="cd-switch"><router-link :to="'/demo/keep/1'" :class="{ on: is1 }">1</router-link><router-link :to="'/demo/keep/2'" :class="{ on: is2 }">2</router-link><router-link :to="'/demo/keep/3'" :class="{ on: is3 }">3</router-link></div>
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
.kn-grid { display: grid; grid-template-columns: 230px minmax(0,1fr); min-height: calc(100vh - 44px); background: #f3f5f7; }
.kn-side { background: #172837; color: #c7d2dd; padding: 24px 16px; display: flex; flex-direction: column; gap: 14px; position: sticky; top: 0; height: calc(100vh - 44px); box-sizing: border-box; }
.kn-word { display: flex; align-items: center; gap: 10px; color: #fff; font-weight: 800; font-size: 15px; }
.kn-word span { width: 32px; height: 32px; border-radius: 8px; background: #88bd45; display: flex; align-items: center; justify-content: center; }
.kn-word small { display: block; font-weight: 400; color: #93a5b5; font-size: 11px; }
.kn-ctx { background: rgba(255,255,255,.06); border-radius: 10px; padding: 10px 12px; display: flex; flex-direction: column; gap: 2px; }
.kn-ctx small { color: #93a5b5; font-size: 11px; }
.kn-ctx strong { color: #fff; font-size: 14px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.kn-ctx code { color: #88bd45; font-size: 11px; }
.kn-side nav { display: flex; flex-direction: column; gap: 4px; }
.kn-side nav b { font-size: 11px; color: #7c8ea0; padding: 8px 10px 2px; font-weight: 600; }
.kn-side nav button { border: 0; background: transparent; color: #c7d2dd; text-align: left; padding: 10px 12px; border-radius: 8px; cursor: pointer; font-size: 13px; display: flex; align-items: center; gap: 8px; }
.kn-side nav button:hover { background: rgba(255,255,255,.07); }
.kn-side nav button.on { background: #88bd45; color: #172837; font-weight: 700; }
.kn-user { margin-top: auto; display: flex; align-items: center; justify-content: space-between; padding-top: 10px; border-top: 1px solid rgba(255,255,255,.08); }
.kn-user small { color: #93a5b5; }
.kn-user button { border: 0; background: transparent; color: #c7d2dd; cursor: pointer; font-size: 12px; }
.kn-main { display: flex; flex-direction: column; min-width: 0; }
.kn-top { display: flex; align-items: center; gap: 12px; padding: 12px 22px; background: #fff; border-bottom: 1px solid #e7ebe5; position: sticky; top: 0; z-index: 8; }
.kn-top .el-breadcrumb { margin-right: auto; }
.kn-content { padding: 20px 24px 60px; display: flex; flex-direction: column; gap: 16px; max-width: 960px; margin: 0 auto; width: 100%; }
.kn-content.wide { max-width: none; }
.kn-card { background: #fff; border: 1px solid #e7ebe5; border-radius: 12px; padding: 18px; }
.kn-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 14px; }
.kn-head h3 { margin: 0; font-size: 16px; color: #2b333b; display: flex; align-items: baseline; gap: 8px; }
.kn-head h3 small { color: #8a94a0; font-weight: 400; font-size: 12px; }
.kn-head > span { color: #8a94a0; font-size: 12px; }
.kn-hello h1 { margin: 0 0 6px; font-size: 22px; color: #2b333b; }
.kn-hello p { margin: 0 0 16px; color: #8a94a0; font-size: 13px; }
.kn-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin-bottom: 14px; }
.kn-stat { background: #fff; border: 1px solid #e7ebe5; border-radius: 12px; padding: 16px; display: flex; flex-direction: column; gap: 4px; }
.kn-stat b { font-size: 24px; color: #2b333b; }
.kn-stat span { color: #8a94a0; font-size: 12px; }
.kn-quick { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin-bottom: 16px; }
.kn-quick button { border: 1px solid #dce6d9; background: #fff; border-radius: 12px; padding: 16px 14px; font-size: 14px; color: var(--sf-strong); cursor: pointer; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 8px; }
.kn-quick button:hover { background: var(--sf-soft); }
.kn-material { border: 1px solid #e7ebe5; border-radius: 10px; padding: 12px; margin-bottom: 12px; }
.kn-material-head { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
.kn-treat { display: flex; flex-wrap: wrap; gap: 8px; }
.kn-treat-item, .kn-chips span { border: 1px solid #dce6d9; background: var(--sf-soft); border-radius: 16px; padding: 6px 14px; font-size: 13px; color: #5b6570; }
.kn-note { color: #8a94a0; font-size: 13px; }
.kn-boxes { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 10px; }
.kn-box { border: 1px solid #e7ebe5; border-radius: 10px; padding: 12px; display: flex; flex-direction: column; gap: 6px; }
.kn-box b { font-size: 14px; color: #2b333b; }
.kn-box small { color: var(--sf-strong); font-size: 12px; }
.kn-float { position: fixed; right: 28px; bottom: 28px; display: flex; align-items: center; gap: 12px; z-index: 30; }
.kn-saved { background: #eef4ea; border: 1px solid #cfe0c2; color: var(--sf-main); font-size: 12px; padding: 6px 12px; border-radius: 16px; }
</style>

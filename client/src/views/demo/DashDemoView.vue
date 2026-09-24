<script setup>
import { computed, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { OfficeBuilding, Postcard, Coin, Box, View, TrendCharts, Tickets, Clock, QuestionFilled, UserFilled } from '@element-plus/icons-vue'
import { computeUnfolded, boxShapes } from '../../lib/box-shapes'

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
const processes = ['烫金', '烫银', '击凸', '丝印UV', '贴窗口']
const treatments = { '哑胶': 0.2, '光胶': 0.2, '逆向 UV': 0.2 }
const stats = { merchants: 4, active: 3, materials: 2, quotes: 128 }
const quotes = [
  { id: 'Q260916-017', merchant: '金福赢包装', amount: 2062.29, status: '已报价', time: '09:40' },
  { id: 'Q260916-016', merchant: '修复验证', amount: 1516.38, status: '已报价', time: '09:12' },
  { id: 'Q260915-041', merchant: '默认商户', amount: 598.00, status: '已下单', time: '17:58' },
  { id: 'Q260915-040', merchant: '金福赢包装', amount: 3280.50, status: '已报价', time: '16:21' },
  { id: 'Q260915-039', merchant: '测试商户', amount: 980.00, status: '已关闭', time: '14:03' },
  { id: 'Q260915-038', merchant: '金福赢包装', amount: 1210.75, status: '已下单', time: '11:47' },
  { id: 'Q260914-052', merchant: '默认商户', amount: 740.20, status: '已报价', time: '15:30' },
  { id: 'Q260914-051', merchant: '修复验证', amount: 1998.00, status: '已下单', time: '10:05' },
]
const activities = [
  { time: '10:32', text: '金福赢包装 更新了价格规则' },
  { time: '10:15', text: '默认商户 修改了品牌副标题' },
  { time: '09:58', text: '修复验证 上传了新 Logo' },
  { time: '09:12', text: 'Q260916-016 生成新报价' },
  { time: '08:47', text: '测试商户 被停用' },
  { time: '08:20', text: '金福赢包装 启用了前台排版 C' },
]
const preview = reactive({ shapeId: 'double-insert', length: 120, width: 80, height: 35, thickness: 1.5, cover: 15, quantity: 500 })
const previewUnfold = computed(() => { try { return computeUnfolded(preview.shapeId, { length: preview.length, width: preview.width, height: preview.height, thickness: preview.thickness, cover: preview.cover }) } catch { return { length: 0, width: 0 } } })
const previewArea = computed(() => previewUnfold.value.length * previewUnfold.value.width / 1e6)
const previewTotal = computed(() => Math.max(previewArea.value * preview.quantity * 8.4, 580).toFixed(2))
function go(s) { section.value = s }
function save() { ElMessage.success('已保存，商户前台已更新') }
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
        <div class="kn-content dash-content">
          <template v-if="section === 'home'">
            <template v-if="isA"><div class="dash-a">
  <div class="kn-hello"><h1>你好，admin 👋</h1><p>3 个商户在线，128 张报价单待跟进。</p></div>
  <div class="dash-a-grid">
    <div class="dash-col">
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
<div class="kn-card"><div class="kn-head"><h3>商户一览</h3><el-button size="small" text @click="go('merchants')">全部 →</el-button></div>
  <el-table :data="merchants" size="small"><el-table-column prop="name" label="商户" /><el-table-column prop="slug" label="标识" /><el-table-column label="状态"><template #default="{ row }"><el-tag :type="row.status === 'active' ? 'success' : 'info'" size="small">{{ row.status === 'active' ? '启用中' : '已停用' }}</el-tag></template></el-table-column><el-table-column label=""><template #default="{ row }"><el-button size="small" type="primary" plain @click="go('brand')">进入配置</el-button></template></el-table-column></el-table>
</div>
    </div>
    <div class="dash-col">
<div class="kn-card"><div class="kn-head"><h3>最近报价单</h3><el-button size="small" text>更多 →</el-button></div>
  <el-table :data="quotes" size="small"><el-table-column prop="id" label="单号" width="120" /><el-table-column prop="merchant" label="商户" min-width="110" /><el-table-column label="金额" width="110"><template #default="{ row }">￥{{ row.amount.toFixed(2) }}</template></el-table-column><el-table-column label="状态" width="90"><template #default="{ row }"><el-tag :type="row.status === '已下单' ? 'success' : row.status === '已关闭' ? 'info' : 'warning'" size="small">{{ row.status }}</el-tag></template></el-table-column><el-table-column prop="time" label="时间" width="80" /></el-table>
</div>
<div class="kn-card"><div class="kn-head"><h3>最近动态</h3></div>
  <ul class="kn-act"><li v-for="(a, i) in activities" :key="i"><b>{{ a.time }}</b><span>{{ a.text }}</span></li></ul>
</div>
    </div>
  </div>
</div></template>
            <template v-else-if="isB"><div class="dash-b">
  <div class="dash-banner"><div><h1>你好，admin 👋</h1><p>欢迎回来，今天有 3 个商户在线、128 张报价单待跟进。</p></div><div class="dash-banner-nums"><div><b>128</b><span>本月报价单</span></div><div><b>42</b><span>已下单</span></div><div><b>￥86.4k</b><span>成交额</span></div></div></div>
<div class="kn-stats">
  <div class="kn-stat"><b>{{ stats.merchants }}</b><span>商户总数</span></div>
  <div class="kn-stat"><b>{{ stats.active }}</b><span>启用中</span></div>
  <div class="kn-stat"><b>{{ stats.materials }}</b><span>纸张材质</span></div>
  <div class="kn-stat"><b>{{ stats.quotes }}</b><span>本月报价单</span></div>
</div>
  <div class="dash-b-grid">
    <div class="dash-b-col"><div class="kn-quick">
  <button @click="go('brand')"><el-icon><Postcard /></el-icon> 品牌设置</button>
  <button @click="go('pricing')"><el-icon><Coin /></el-icon> 价格规则</button>
  <button @click="go('boxes')"><el-icon><Box /></el-icon> 盒形公式</button>
  <button @click="go('preview')"><el-icon><View /></el-icon> 报价预览</button>
</div></div>
    <div class="dash-b-col"><div class="kn-card"><div class="kn-head"><h3>商户一览</h3><el-button size="small" text @click="go('merchants')">全部 →</el-button></div>
  <el-table :data="merchants" size="small"><el-table-column prop="name" label="商户" /><el-table-column prop="slug" label="标识" /><el-table-column label="状态"><template #default="{ row }"><el-tag :type="row.status === 'active' ? 'success' : 'info'" size="small">{{ row.status === 'active' ? '启用中' : '已停用' }}</el-tag></template></el-table-column><el-table-column label=""><template #default="{ row }"><el-button size="small" type="primary" plain @click="go('brand')">进入配置</el-button></template></el-table-column></el-table>
</div></div>
    <div class="dash-b-col"><div class="kn-card"><div class="kn-head"><h3>最近报价单</h3><el-button size="small" text>更多 →</el-button></div>
  <el-table :data="quotes" size="small"><el-table-column prop="id" label="单号" width="120" /><el-table-column prop="merchant" label="商户" min-width="110" /><el-table-column label="金额" width="110"><template #default="{ row }">￥{{ row.amount.toFixed(2) }}</template></el-table-column><el-table-column label="状态" width="90"><template #default="{ row }"><el-tag :type="row.status === '已下单' ? 'success' : row.status === '已关闭' ? 'info' : 'warning'" size="small">{{ row.status }}</el-tag></template></el-table-column><el-table-column prop="time" label="时间" width="80" /></el-table>
</div></div>
  </div>
</div></template>
            <template v-else><div class="dash-c">
  <div class="kn-hello"><h1>你好，admin 👋</h1><p>3 个商户在线，128 张报价单待跟进。</p></div>
  <div class="dash-c-grid">
    <div class="dash-c-main">
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
<div class="kn-card"><div class="kn-head"><h3>商户一览</h3><el-button size="small" text @click="go('merchants')">全部 →</el-button></div>
  <el-table :data="merchants" size="small"><el-table-column prop="name" label="商户" /><el-table-column prop="slug" label="标识" /><el-table-column label="状态"><template #default="{ row }"><el-tag :type="row.status === 'active' ? 'success' : 'info'" size="small">{{ row.status === 'active' ? '启用中' : '已停用' }}</el-tag></template></el-table-column><el-table-column label=""><template #default="{ row }"><el-button size="small" type="primary" plain @click="go('brand')">进入配置</el-button></template></el-table-column></el-table>
</div>
    </div>
    <aside class="dash-c-side">
<div class="kn-card"><div class="kn-head"><h3>当前商户</h3></div>
  <div class="kn-mcard"><div class="kn-mlogo">金</div><div><strong>金福赢包装</strong><code>jinfuying</code><p>专业包装 · 智能报价</p></div></div>
  <el-button class="pb-btn-primary" type="primary" style="width:100%;margin-top:12px" @click="go('brand')">进入配置</el-button>
</div>
<div class="kn-card"><div class="kn-head"><h3>本月概览</h3></div>
  <div class="kn-ov"><div><b>128</b><span>报价单</span></div><div><b>42</b><span>已下单</span></div><div><b>￥86.4k</b><span>成交额</span></div></div>
</div>
<div class="kn-card"><div class="kn-head"><h3>最近动态</h3></div>
  <ul class="kn-act"><li v-for="(a, i) in activities" :key="i"><b>{{ a.time }}</b><span>{{ a.text }}</span></li></ul>
</div>
<div class="kn-card kn-help"><div class="kn-head"><h3>帮助中心</h3></div>
  <p>· 如何配置价格阶梯？</p><p>· 盒形公式说明</p><p>· 前台排版如何切换</p><p>· 联系技术支持</p>
</div>
    </aside>
  </div>
</div></template>
          </template>
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
  <div v-for="(m, mi) in materials" :key="mi" class="kn-material"><div class="kn-material-head"><b>材质 {{ mi + 1 }}</b><el-input v-model="m.name" style="max-width:220px" /></div>
    <el-table :data="m.tiers" size="small"><el-table-column label="数量起点（个）"><template #default="{ row }"><el-input-number v-model="row.q" :min="1" :step="100" controls-position="right" /></template></el-table-column><el-table-column label="单价（元/㎡）"><template #default="{ row }"><el-input-number v-model="row.price" :min="0" :step="0.1" controls-position="right" /></template></el-table-column><el-table-column label="最低消费（元）"><template #default="{ row }"><el-input-number v-model="row.min" :min="0" :step="10" controls-position="right" /></template></el-table-column><el-table-column label=""><template #default="scope"><el-button size="small" text type="danger" @click="m.tiers.splice(scope.$index, 1)">删除</el-button></template></el-table-column></el-table>
  </div>
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
        </div>
      </div>
    </div>
    <div class="cd-bar">
      <a href="/demo" class="cd-back">‹ 返回方案总览</a>
      <span class="cd-title">工作台布局 {{ isA ? 'A · 双栏工作台' : isB ? 'B · 横幅+三列' : 'C · 主区+右侧边栏' }}（导航不变）</span>
      <div class="cd-switch"><router-link :to="'/demo/dash/a'" :class="{ on: isA }">A</router-link><router-link :to="'/demo/dash/b'" :class="{ on: isB }">B</router-link><router-link :to="'/demo/dash/c'" :class="{ on: isC }">C</router-link></div>
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
.kn-content { padding: 20px 24px 60px; display: flex; flex-direction: column; gap: 16px; }
.dash-content { max-width: none; }
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
.kn-act { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
.kn-act li { display: flex; gap: 12px; align-items: baseline; font-size: 13px; color: #5b6570; border-bottom: 1px dashed #eef1f5; padding-bottom: 8px; }
.kn-act li b { color: #8a94a0; font-size: 12px; font-weight: 400; flex: 0 0 46px; }
.kn-mcard { display: flex; gap: 12px; align-items: center; }
.kn-mlogo { width: 42px; height: 42px; border-radius: 10px; background: linear-gradient(135deg,#55a630,#3c7a22); color: #fff; font-weight: 800; font-size: 17px; display: flex; align-items: center; justify-content: center; }
.kn-mcard strong { display: block; font-size: 15px; color: #2b333b; }
.kn-mcard code { color: var(--sf-strong); font-size: 11px; }
.kn-mcard p { margin: 4px 0 0; color: #8a94a0; font-size: 12px; }
.kn-ov { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.kn-ov div { background: #f4f7f1; border-radius: 10px; padding: 12px 8px; text-align: center; }
.kn-ov b { display: block; font-size: 17px; color: #2b333b; }
.kn-ov span { font-size: 11px; color: #8a94a0; }
.kn-help p { color: #8a94a0; font-size: 12px; margin: 6px 0; }
.kn-material { border: 1px solid #e7ebe5; border-radius: 10px; padding: 12px; margin-bottom: 12px; }
.kn-material-head { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
.kn-boxes { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 10px; }
.kn-box { border: 1px solid #e7ebe5; border-radius: 10px; padding: 12px; display: flex; flex-direction: column; gap: 6px; }
.kn-box b { font-size: 14px; color: #2b333b; }
.kn-box small { color: var(--sf-strong); font-size: 12px; }
/* A 双栏 */
.dash-a-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; align-items: start; }
.dash-col { display: flex; flex-direction: column; gap: 16px; min-width: 0; }
/* B 横幅+三列 */
.dash-banner { background: linear-gradient(120deg,#eef6e6,#dcecd0); border: 1px solid #cfe0c2; border-radius: 14px; padding: 22px 26px; display: flex; align-items: center; justify-content: space-between; gap: 20px; margin-bottom: 16px; }
.dash-banner h1 { margin: 0 0 4px; font-size: 22px; color: #2b333b; }
.dash-banner p { margin: 0; color: #6b786f; font-size: 13px; }
.dash-banner-nums { display: flex; gap: 26px; }
.dash-banner-nums div { text-align: center; }
.dash-banner-nums b { display: block; font-size: 22px; color: var(--sf-strong); }
.dash-banner-nums span { font-size: 11px; color: #6b786f; }
.dash-b-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; align-items: start; }
.dash-b-col { display: flex; flex-direction: column; gap: 16px; min-width: 0; }
/* C 主区+右侧边栏 */
.dash-c-grid { display: grid; grid-template-columns: minmax(0,1fr) 300px; gap: 16px; align-items: start; }
.dash-c-main { display: flex; flex-direction: column; gap: 16px; min-width: 0; }
.dash-c-side { display: flex; flex-direction: column; gap: 16px; position: sticky; top: 76px; }
</style>

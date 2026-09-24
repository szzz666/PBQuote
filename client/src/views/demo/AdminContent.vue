<script setup>
const props = defineProps({
  section: String,
  tabTitles: Object,
  merchants: Array,
  materials: Array,
  user: Object,
  preview: Object,
  previewUnfold: Object,
  previewArea: Number,
  previewTotal: String,
  stats: Object,
  treatments: { type: Object, default: () => ({}) },
})
import { boxShapes, CUSTOM_SHAPE } from '../../lib/box-shapes'
import { Postcard, Coin, View, Box } from '@element-plus/icons-vue'
const emit = defineEmits(['go', 'save', 'savePricing'])
</script>

<template>
  <section v-if="section === 'home'" class="ad-home">
    <div class="ad-stats">
      <div class="ad-stat"><b>{{ stats.merchants }}</b><span>商户总数</span></div>
      <div class="ad-stat"><b>{{ stats.active }}</b><span>启用中</span></div>
      <div class="ad-stat"><b>{{ stats.materials }}</b><span>纸张材质</span></div>
      <div class="ad-stat"><b>{{ stats.quotes }}</b><span>本月报价单</span></div>
    </div>
    <div class="ad-quick">
      <button @click="emit('go', 'brand')"><el-icon><Postcard /></el-icon> 品牌设置</button>
      <button @click="emit('go', 'pricing')"><el-icon><Coin /></el-icon> 价格规则</button>
      <button @click="emit('go', 'preview')"><el-icon><View /></el-icon> 报价预览</button>
      <button @click="emit('go', 'boxes')"><el-icon><Box /></el-icon> 盒形公式</button>
    </div>
  </section>

  <section v-else-if="section === 'merchants'" class="ad-card">
    <div class="ad-head"><h3>商户管理 <small>{{ merchants.length }} 个商户</small></h3><el-input placeholder="搜索名称或标识" style="width:220px" /></div>
    <el-table :data="merchants" stripe>
      <el-table-column prop="name" label="商户" min-width="160"><template #default="{ row }"><strong>{{ row.name }}</strong></template></el-table-column>
      <el-table-column prop="slug" label="专属标识" min-width="120" />
      <el-table-column label="状态" width="110"><template #default="{ row }"><el-tag :type="row.status === 'active' ? 'success' : 'info'" size="small">{{ row.status === 'active' ? '启用中' : '已停用' }}</el-tag></template></el-table-column>
      <el-table-column label="操作" width="200"><template #default="{ row }"><el-button size="small" type="primary" plain @click="emit('go', 'brand')">进入配置</el-button><el-button size="small">{{ row.status === 'active' ? '停用' : '启用' }}</el-button></template></el-table-column>
    </el-table>
  </section>

  <section v-else-if="section === 'brand'" class="ad-card">
    <div class="ad-head"><h3>品牌设置</h3><span>显示在客户报价前台</span></div>
    <el-form label-width="110px" style="max-width:620px">
      <el-form-item label="商户名称"><el-input :model-value="merchants[0].name" /></el-form-item>
      <el-form-item label="品牌副标题"><el-input placeholder="包装报价云" /></el-form-item>
      <el-form-item label="宣传语"><el-input placeholder="专业包装 · 智能报价" /></el-form-item>
      <el-form-item label="前台排版"><el-select style="width:100%"><el-option label="A · 单列卡片流（移动友好）" value="a" /><el-option label="B · 左右分栏工作台（桌面高效）" value="b" /><el-option label="C · 分步向导（强引导）" value="c" /></el-select></el-form-item>
    </el-form>
    <el-button class="pb-btn-primary" type="primary" @click="emit('save')">保存品牌设置</el-button>
  </section>

  <section v-else-if="section === 'pricing'" class="ad-card">
    <div class="ad-head"><h3>纸张材质与数量阶梯</h3><el-button type="primary" plain size="small">＋ 新增材质</el-button></div>
    <div v-for="(m, mi) in materials" :key="mi" class="ad-material">
      <div class="ad-material-head"><b>材质 {{ mi + 1 }}</b><el-input v-model="m.name" style="max-width:240px" /><el-button size="small" text type="danger" :disabled="materials.length === 1">删除材质</el-button></div>
      <el-table :data="m.tiers" size="small">
        <el-table-column label="数量起点（个）"><template #default="{ row }"><el-input-number v-model="row.q" :min="1" :step="100" controls-position="right" /></template></el-table-column>
        <el-table-column label="单价（元/㎡）"><template #default="{ row }"><el-input-number v-model="row.price" :min="0" :step="0.1" controls-position="right" /></template></el-table-column>
        <el-table-column label="最低消费（元）"><template #default="{ row }"><el-input-number v-model="row.min" :min="0" :step="10" controls-position="right" /></template></el-table-column>
        <el-table-column label=""><template #default="scope"><el-button size="small" text type="danger" @click="m.tiers.splice(scope.$index, 1)">删除</el-button></template></el-table-column>
      </el-table>
      <el-button size="small" text type="primary" @click="m.tiers.push({ q: 0, price: 0, min: 0 })">＋ 新增档位</el-button>
    </div>
    <div class="ad-save-row"><span>数量 ≥ 档位起点取该档单价，低于最小档按最小档计价。</span><el-button class="pb-btn-primary" type="primary" @click="emit('savePricing')">保存价格规则</el-button></div>
  </section>

  <section v-else-if="section === 'boxes'" class="ad-card">
    <div class="ad-head"><h3>盒形公式 <small>系统内置，不可编辑</small></h3></div>
    <div class="ad-boxes">
      <div v-for="s in [...boxShapes, CUSTOM_SHAPE]" :key="s.id" class="ad-box"><b>{{ s.name }}</b><small>{{ s.formulaText ? s.formulaText.length : '手动填写展开尺寸' }}</small><span>{{ s.params.map(p => p.label).join('、') }}</span></div>
    </div>
  </section>

  <section v-else-if="section === 'preview'" class="ad-card">
    <div class="ad-head"><h3>报价预览</h3><span>按当前规则试算</span></div>
    <el-form inline label-width="80px">
      <el-form-item label="盒形"><el-select v-model="preview.shapeId" style="width:150px"><el-option v-for="s in boxShapes" :key="s.id" :label="s.name" :value="s.id" /></el-select></el-form-item>
      <el-form-item label="长"><el-input-number v-model="preview.length" :min="1" controls-position="right" /></el-form-item>
      <el-form-item label="宽"><el-input-number v-model="preview.width" :min="1" controls-position="right" /></el-form-item>
      <el-form-item label="高"><el-input-number v-model="preview.height" :min="1" controls-position="right" /></el-form-item>
      <el-form-item label="数量"><el-input-number v-model="preview.quantity" :min="1" controls-position="right" /></el-form-item>
    </el-form>
    <el-descriptions :column="2" border style="max-width:640px">
      <el-descriptions-item label="展开尺寸">{{ previewUnfold.length }} × {{ previewUnfold.width }} mm</el-descriptions-item>
      <el-descriptions-item label="单个面积">{{ previewArea.toFixed(4) }} ㎡</el-descriptions-item>
      <el-descriptions-item label="预估总计"><strong>￥{{ previewTotal }}</strong></el-descriptions-item>
    </el-descriptions>
  </section>
</template>

<style scoped>
.ad-card { background: #fff; border: 1px solid #e7ebe5; border-radius: 12px; padding: 18px; }
.ad-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 14px; }
.ad-head h3 { margin: 0; font-size: 16px; color: #2b333b; display: flex; align-items: baseline; gap: 8px; }
.ad-head h3 small { color: #8a94a0; font-weight: 400; font-size: 12px; }
.ad-head > span { color: #8a94a0; font-size: 12px; }
.ad-material { border: 1px solid #e7ebe5; border-radius: 10px; padding: 12px; margin-bottom: 12px; }
.ad-material-head { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
.ad-material-head b { font-size: 14px; color: #2b333b; }
.ad-save-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-top: 6px; }
.ad-save-row span { color: #8a94a0; font-size: 12px; }
.ad-boxes { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px; }
.ad-box { border: 1px solid #e7ebe5; border-radius: 10px; padding: 12px; display: flex; flex-direction: column; gap: 6px; }
.ad-box b { font-size: 14px; color: #2b333b; }
.ad-box small { color: var(--sf-strong); font-size: 12px; }
.ad-box span { color: #8a94a0; font-size: 12px; }
.ad-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin-bottom: 14px; }
.ad-stat { background: #fff; border: 1px solid #e7ebe5; border-radius: 12px; padding: 16px; display: flex; flex-direction: column; gap: 4px; }
.ad-stat b { font-size: 24px; color: #2b333b; }
.ad-stat span { color: #8a94a0; font-size: 12px; }
.ad-quick { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin-bottom: 16px; }
.ad-quick button { border: 1px solid #dce6d9; background: #fff; border-radius: 12px; padding: 18px 14px; font-size: 14px; color: var(--sf-strong); cursor: pointer; font-weight: 600; }
.ad-quick button:hover { background: var(--sf-soft); }
</style>
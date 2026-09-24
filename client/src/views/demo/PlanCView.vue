<script setup>
import { computed, ref } from 'vue'
import { ArrowLeft } from '@element-plus/icons-vue'
import { useRoute } from 'vue-router'
import { useStorefrontQuote } from '../../composables/useStorefrontQuote'
import ContactModal from '../../components/ContactModal.vue'
import UnfoldDimsEditor from '../../components/UnfoldDimsEditor.vue'
const route = useRoute()
const isDemo = computed(() => route.path.startsWith('/demo'))
const { GLUE_OPTIONS, PRINT_MODES, printRequirementOptions, apiError, baseProductionAmount, boxOptions, checkoutSummary, config, contact, contactOpen, contactEntries, copyMessage, copySummary, createOrder, displayed, form, glueCharge, materialOptions, orderState, processOptions, processTotal, qqUrl, qrUrl, quantityLocked, quantityTiers, selectBoxType, selectedBoxType, selectedShape, spotColorCharge, toggleProcess, treatmentCharge, treatmentOptions, unfoldAreaM2, unfolded } = useStorefrontQuote()
const isAutoDims = computed(() => !!selectedShape.value?.formulaText && form.unfoldMode !== 'manual')
const step = ref(1)
const steps = ['选盒型', '填尺寸', '材料与工艺', '下单']
function next() {
  if (step.value === 2 && (form.length <= 0 || form.width <= 0 || form.height <= 0)) { apiError.value = '请先填写成品尺寸'; return }
  if (step.value < 4) step.value++
}
function prev() { if (step.value > 1) step.value-- }
</script>

<template>
  <div class="plan-c">
    <header v-if="isDemo" class="c-top">
      <router-link to="/demo" class="c-back"><el-icon style="vertical-align:-2px"><ArrowLeft /></el-icon> 返回</router-link>
      <div><strong>{{ config.merchant.name }}</strong><small>方案 C · 分步向导</small></div>
      <span class="c-badge">引导式</span>
    </header>

    <nav class="c-steps">
      <div v-for="(s, i) in steps" :key="s" class="c-step" :class="{ on: step === i + 1, done: step > i + 1 }">
        <span class="c-dot">{{ step > i + 1 ? '✓' : i + 1 }}</span><em>{{ s }}</em>
      </div>
    </nav>

    <main class="c-main">
      <section v-if="step === 1" class="c-card">
        <div class="c-boxhead"><h2>选择盒型</h2><div class="c-var"><button :class="{ on: form.boxVariant === 'ka' }" @click="form.boxVariant = 'ka'">卡盒</button><button :class="{ on: form.boxVariant === 'keng' }" @click="form.boxVariant = 'keng'">坑盒</button></div></div>
        <p class="c-sub">先选结构，尺寸会自动换算展开面积。</p>
        <div class="c-boxes">
          <button v-for="item in boxOptions" :key="item.name" class="c-box" :class="{ on: config.product.boxType === item.name }" @click="selectBoxType(item.name)">
            <img :src="item.icon" :alt="item.name"><span>{{ item.name }}</span>
          </button>
        </div>
      </section>

      <section v-else-if="step === 2" class="c-card">
        <h2>成品尺寸</h2><p class="c-sub">单位毫米，填写后底部实时显示展开尺寸。</p>
                <UnfoldDimsEditor :form="form" :selected-shape="selectedShape" :unfolded="unfolded" :area-m2="unfoldAreaM2" />

      </section>

      <section v-else-if="step === 3" class="c-card">
        <h2>材料与工艺</h2><p class="c-sub">数量会自动落档计价，低于最小档按最小档。</p>
        <div class="c-row">
          <label>纸张材质<el-select v-model="form.material" style="width:100%"><el-option v-for="m in materialOptions" :key="m" :label="m" :value="m" /></el-select></label>
          <label>数量
            <div class="c-qty">
              <el-input-number v-if="!quantityLocked" v-model="form.quantity" :min="1" :step="100" controls-position="right" />
              <div class="c-tiers"><button v-for="t in quantityTiers" :key="t.quantity" :class="{ on: form.quantity === t.quantity }" @click="form.quantity = t.quantity">{{ t.quantity.toLocaleString() }}</button></div>
            </div>
          </label>
        </div>
        <div class="c-row">
          <label>表面处理<el-select v-model="form.treatment" style="width:100%"><el-option v-for="t in treatmentOptions" :key="t" :label="t" :value="t" /></el-select></label>
          <label>印刷面数
            <div class="c-chips"><button v-for="m in PRINT_MODES" :key="m" :class="{ on: form.printMode === m }" @click="form.printMode = m">{{ m }}</button></div>
          </label>
        </div>
        <div class="c-row">
          <label>印刷要求<el-select v-model="form.printRequirement" style="width:100%"><el-option v-for="p in printRequirementOptions" :key="p" :label="p" :value="p" /></el-select></label>
          <label>粘盒<el-select v-model="form.glue" style="width:100%"><el-option v-for="g in GLUE_OPTIONS" :key="g" :label="g" :value="g" /></el-select></label>
        </div>
        <div class="c-procs">
          <span>工艺（可多选）</span>
          <div class="c-chips"><button v-for="p in processOptions" :key="p" :class="{ on: form.processes.some(s => s.name === p) }" @click="toggleProcess(p)">{{ p }}</button></div>
          <template v-for="sel in form.processes" :key="'x' + sel.name">
            <div v-if="config.pricing.processes[sel.name]?.billingMode === 'area'" class="c-proc">
              <label>{{ sel.name }}宽<el-input-number v-model="sel.graphicWidth" :min="0" controls-position="right" :placeholder="'默认 ' + unfolded.width" /></label>
              <label>{{ sel.name }}高<el-input-number v-model="sel.graphicHeight" :min="0" controls-position="right" :placeholder="'默认 ' + unfolded.height" /></label>
            </div>
            <div v-else-if="config.pricing.processes[sel.name]?.billingMode === 'times'" class="c-proc">
              <label>{{ sel.name }}次数<el-input-number v-model="sel.times" :min="1" controls-position="right" /></label>
            </div>
          </template>
          <label class="c-spot">专色数<el-input-number v-model="form.spotColors" :min="0" :max="8" controls-position="right" /></label>
        </div>
      </section>

      <section v-else-if="step === 4" class="c-card">
        <h2>核对并下单</h2><p class="c-sub">确认规格后点击下单，复制报价并联系商家。</p>
        <div class="c-summary">
          <div><span>盒型</span><b>{{ selectedBoxType.name }}</b></div>
          <div v-if="isAutoDims"><span>成品尺寸</span><b>{{ form.length }} × {{ form.width }} × {{ form.height }} mm</b></div>
          <div><span>展开尺寸</span><b>{{ unfolded.length }} × {{ unfolded.width }} mm（{{ unfoldAreaM2.toFixed(4) }} ㎡）</b></div>
          <div><span>材质</span><b>{{ form.material || materialOptions[0] }}</b></div>
          <div><span>数量</span><b>{{ form.quantity.toLocaleString() }} 个</b></div>
          <div><span>表面处理</span><b>{{ form.treatment || '无' }}</b></div>
          <div><span>工艺</span><b>{{ form.processes.length ? form.processes.map(p => p.name).join('、') : '无' }}</b></div>
        </div>
        <div class="c-lines">
          <div><span>基础生产金额</span><b>￥{{ baseProductionAmount.toFixed(2) }}</b></div>
          <div v-if="treatmentCharge > 0"><span>表面处理</span><b>￥{{ treatmentCharge.toFixed(2) }}</b></div>
          <div v-if="glueCharge > 0"><span>粘盒</span><b>￥{{ glueCharge.toFixed(2) }}</b></div>
          <div v-if="spotColorCharge > 0"><span>专色</span><b>￥{{ spotColorCharge.toFixed(2) }}</b></div>
          <div><span>工艺费用</span><b>￥{{ processTotal.toFixed(2) }}</b></div>
        </div>
        <div class="c-total"><span>总计</span><strong>￥{{ displayed.total.toFixed(2) }}</strong></div>
      </section>

      <p v-if="apiError" class="c-err">{{ apiError }}</p>
    </main>

    <footer class="c-nav">
      <el-button :disabled="step === 1" @click="prev()">‹ 上一步</el-button>
      <span class="c-progress">{{ step }} / 4</span>
      <el-button v-if="step < 4" type="primary" @click="next()">下一步 ›</el-button>
      <el-button v-else type="primary" size="large" :loading="orderState === 'loading'" @click="createOrder">{{ orderState === 'success' ? '报价已复制' : '立即下单 ↗' }}</el-button>
    </footer>

    <ContactModal :open="contactOpen" :entries="contactEntries" :checkout-summary="checkoutSummary" :copy-message="copyMessage" @close="contactOpen = false" @copy="copySummary" />
  </div>
</template>

<style scoped>
.plan-c { min-height: 100vh; background: #f5f6f8; color: #253446; }
.c-top { display: flex; align-items: center; gap: 14px; padding: 14px 22px; background: #fff; border-bottom: 1px solid #e7ebe5; position: sticky; top: 0; z-index: 5; }
.c-back { color: var(--sf-main); text-decoration: none; font-size: 13px; }
.c-top strong { font-size: 16px; }
.c-top small { display: block; color: #8a94a0; font-size: 12px; }
.c-badge { margin-left: auto; font-size: 12px; color: var(--sf-strong); background: var(--sf-soft); padding: 4px 10px; border-radius: 20px; }
/* 步骤条：经典步进器 —— 序号圆点 + 连接线，无胶囊底色，融入卡片上方 */
.c-steps { display: flex; justify-content: center; align-items: flex-start; padding: 14px 0 10px; background: transparent; }
.c-step { display: flex; align-items: center; gap: 6px; color: #a9b6ab; }
.c-step::after { content: ''; width: 34px; height: 2px; background: #dce6d9; margin: 0 10px; }
.c-step:last-child::after { display: none; }
.c-step .c-dot { width: 24px; height: 24px; border-radius: 50%; border: 2px solid #dce6d9; background: #fff; color: #8a94a0; display: inline-flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600; }
.c-step em { font-style: normal; font-size: 13px; }
.c-step.on { color: var(--sf-main); font-weight: 600; }
.c-step.on .c-dot { background: var(--sf-main); border-color: var(--sf-main); color: #fff; }
.c-step.done { color: var(--sf-light); }
.c-step.done .c-dot { background: var(--sf-light); border-color: var(--sf-light); color: #fff; }
.c-step.on::after, .c-step.done::after { background: var(--sf-light); }
.c-main { max-width: 720px; margin: 14px auto 90px; padding: 0 14px; }
.c-card { background: #fff; border: 1px solid #e7ebe5; border-radius: 14px; padding: 20px; }
.c-card h2 { margin: 0 0 4px; font-size: 17px; color: #2b333b; }
.c-sub { margin: 0 0 14px; color: #8a94a0; font-size: 13px; }
.c-boxes { display: grid; grid-template-columns: repeat(auto-fill, minmax(108px, 1fr)); gap: 10px; }
.c-box { border: 1px solid #e7ebe5; border-radius: 10px; background: #fff; padding: 10px; display: flex; flex-direction: column; align-items: center; gap: 6px; cursor: pointer; transition: all .15s; }
.c-box img { width: 60px; height: 42px; object-fit: contain; }
.c-box span { font-size: 12px; color: #5b6570; }
.c-box.on { border-color: var(--sf-main); background: var(--sf-soft); box-shadow: 0 2px 8px rgba(88,116,80,.12); }
.c-dims { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 12px; }
.c-dims label { display: flex; flex-direction: column; gap: 6px; font-size: 13px; color: #5b6570; }
.c-dims .el-input-number { width: 100%; }
.c-unfold { margin-top: 12px; background: var(--sf-soft); border: 1px dashed var(--sf-border); border-radius: 10px; padding: 12px 14px; display: flex; align-items: baseline; gap: 10px; }
.c-unfold span { color: #8a94a0; font-size: 12px; }
.c-unfold strong { color: var(--sf-main); font-size: 18px; }
.c-unfold small { margin-left: auto; color: #8a94a0; }
.c-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px; }
.c-row label { display: flex; flex-direction: column; gap: 6px; font-size: 13px; color: #5b6570; }
.c-qty { display: flex; flex-direction: column; gap: 8px; }
.c-qty .el-input-number { width: 100%; }
.c-tiers, .c-chips { display: flex; flex-wrap: wrap; gap: 8px; }
.c-tiers button, .c-chips button { border: 1px solid #dce6d9; background: #fff; border-radius: 8px; padding: 8px 12px; color: #5b6570; cursor: pointer; }
.c-tiers button.on, .c-chips button.on { background: var(--sf-main); border-color: var(--sf-main); color: #fff; }
.c-procs > span { display: block; font-size: 13px; color: #5b6570; margin-bottom: 8px; }
.c-proc { display: flex; gap: 10px; margin-top: 8px; }
.c-proc label { display: flex; align-items: center; gap: 8px; font-size: 12px; color: #8a94a0; }
.c-proc .el-input-number { width: 130px; }
.c-spot { display: flex; align-items: center; gap: 8px; margin-top: 10px; font-size: 13px; color: #5b6570; }
.c-summary, .c-lines { display: flex; flex-direction: column; gap: 8px; }
.c-summary > div, .c-lines > div { display: flex; justify-content: space-between; font-size: 13px; color: #5b6570; border-bottom: 1px dashed var(--sf-border); padding-bottom: 8px; }
.c-summary b { color: #2b333b; }
.c-total { display: flex; justify-content: space-between; align-items: baseline; margin-top: 14px; padding-top: 12px; border-top: 1px solid #e7ebe5; }
.c-total span { color: #8a94a0; }
.c-total strong { color: #2b333b; font-size: 24px; }
.c-err { color: #d54941; font-size: 13px; }
.c-nav { position: fixed; left: 0; right: 0; bottom: 0; background: #fff; border-top: 1px solid #e7ebe5; display: flex; align-items: center; justify-content: center; gap: 16px; padding: 12px 16px; z-index: 6; }
.c-progress { color: #8a94a0; font-size: 13px; }
@media (max-width: 560px) { .c-row { grid-template-columns: 1fr; } .c-steps { gap: 0 } .c-step em { font-size: 12px } }
.c-boxhead { display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; }
.c-boxhead h2 { margin: 0; }
.c-var { display: flex; border: 1px solid #dce6d9; border-radius: 8px; overflow: hidden; }
.c-var button { border: none; background: #fff; color: #5b6570; padding: 3px 10px; font-size: 12px; cursor: pointer; }
.c-var button + button { border-left: 1px solid #dce6d9; }
.c-var button.on { background: var(--sf-main); color: #fff; }
</style>

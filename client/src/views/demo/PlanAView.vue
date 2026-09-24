<script setup>
import { computed } from 'vue'
import { ArrowLeft } from '@element-plus/icons-vue'
import { useRoute } from 'vue-router'
import { useStorefrontQuote } from '../../composables/useStorefrontQuote'
import ContactModal from '../../components/ContactModal.vue'
import UnfoldDimsEditor from '../../components/UnfoldDimsEditor.vue'
const route = useRoute()
const isDemo = computed(() => route.path.startsWith('/demo'))
const { GLUE_OPTIONS, PRINT_MODES, printRequirementOptions, boxOptions, checkoutSummary, config, contact, contactOpen, contactEntries, copyMessage, copySummary, createOrder, displayed, form, materialOptions, orderState, processOptions, qqUrl, qrUrl, quantityLocked, quantityTiers, selectBoxType, selectedShape, serverQuote, toggleProcess, treatmentOptions, unfoldAreaM2, unfolded } = useStorefrontQuote()
</script>

<template>
  <div class="plan-a">
    <header v-if="isDemo" class="a-top">
      <router-link to="/demo" class="a-back"><el-icon style="vertical-align:-2px"><ArrowLeft /></el-icon> 返回</router-link>
      <div><strong>{{ config.merchant.name }}</strong><small>方案 A · 单列卡片流</small></div>
      <span class="a-badge">移动友好</span>
    </header>

    <main class="a-main">
      <section class="a-card">
        <div class="a-step"><b>1</b>选择盒型 <small>{{ boxOptions.length }} 种</small><span class="a-var"><button :class="{ on: form.boxVariant === 'ka' }" @click="form.boxVariant = 'ka'">卡盒</button><button :class="{ on: form.boxVariant === 'keng' }" @click="form.boxVariant = 'keng'">坑盒</button></span></div>
        <div class="a-boxes">
          <button v-for="item in boxOptions" :key="item.name" class="a-box" :class="{ on: config.product.boxType === item.name }" @click="selectBoxType(item.name)">
            <img :src="item.icon" :alt="item.name"><span>{{ item.name }}</span>
          </button>
        </div>
      </section>

      <section class="a-card">
        <div class="a-step"><b>2</b>成品尺寸 <small>毫米</small></div>
                <UnfoldDimsEditor :form="form" :selected-shape="selectedShape" :unfolded="unfolded" :area-m2="unfoldAreaM2" />

      </section>

      <section class="a-card">
        <div class="a-step"><b>3</b>材质与数量</div>
        <div class="a-row">
          <label>纸张材质<el-select v-model="form.material" style="width:100%"><el-option v-for="m in materialOptions" :key="m" :label="m" :value="m" /></el-select></label>
          <label>数量
            <div class="a-qty">
        <div class="a-qty">
              <span v-if="!quantityLocked" class="a-qty-input"><el-input-number v-model="form.quantity" :min="1" :step="100" controls-position="right" /></span>
              <div class="a-tiers"><button v-for="t in quantityTiers" :key="t.quantity" :class="{ on: form.quantity === t.quantity }" @click="form.quantity = t.quantity">{{ t.quantity.toLocaleString() }}</button></div>
        </div>
            </div>
          </label>
        </div>
      </section>

      <section class="a-card">
        <div class="a-step"><b>4</b>工艺与要求</div>
        <div class="a-row">
          <label>表面处理<el-select v-model="form.treatment" style="width:100%"><el-option v-for="t in treatmentOptions" :key="t" :label="t" :value="t" /></el-select></label>
          <label>面数
            <div class="a-chips"><button v-for="m in PRINT_MODES" :key="m" :class="{ on: form.printMode === m }" @click="form.printMode = m">{{ m }}</button></div>
          </label>
        </div>
        <div class="a-row">
          <label>印刷要求<el-select v-model="form.printRequirement" style="width:100%"><el-option v-for="p in printRequirementOptions" :key="p" :label="p" :value="p" /></el-select></label>
          <label>粘盒<el-select v-model="form.glue" style="width:100%"><el-option v-for="g in GLUE_OPTIONS" :key="g" :label="g" :value="g" /></el-select></label>
        </div>
        <div class="a-procs">
          <span>工艺（可多选）</span>
          <div class="a-chips"><button v-for="p in processOptions" :key="p" :class="{ on: form.processes.some(s => s.name === p) }" @click="toggleProcess(p)">{{ p }}</button></div>
          <div v-for="sel in form.processes" :key="sel.name" class="a-proc-input" v-if="false"></div>
          <template v-for="sel in form.processes" :key="'x' + sel.name">
            <div v-if="config.pricing.processes[sel.name]?.billingMode === 'area'" class="a-proc-input">
              <label>{{ sel.name }}宽 <el-input-number v-model="sel.graphicWidth" :min="0" controls-position="right" :placeholder="'默认 ' + unfolded.width" /></label>
              <label>{{ sel.name }}高 <el-input-number v-model="sel.graphicHeight" :min="0" controls-position="right" :placeholder="'默认 ' + unfolded.height" /></label>
            </div>
            <div v-else-if="config.pricing.processes[sel.name]?.billingMode === 'times'" class="a-proc-input">
              <label>{{ sel.name }}次数 <el-input-number v-model="sel.times" :min="1" controls-position="right" /></label>
            </div>
          </template>
          <label class="a-spot">专色数 <el-input-number v-model="form.spotColors" :min="0" :max="8" controls-position="right" /></label>
        </div>
      </section>
    </main>

    <footer class="a-bottombar">
      <div class="a-price"><small>预估总价</small><strong>￥{{ displayed.total.toFixed(2) }}</strong><em v-if="serverQuote">服务端报价</em></div>
      <el-button class="a-order" type="primary" size="large" :loading="orderState === 'loading'" @click="createOrder">{{ orderState === 'success' ? '报价已复制' : '立即下单 ↗' }}</el-button>
    </footer>

    <ContactModal :open="contactOpen" :entries="contactEntries" :checkout-summary="checkoutSummary" :copy-message="copyMessage" @close="contactOpen = false" @copy="copySummary" />
  </div>
</template>

<style scoped>
.plan-a { min-height: 100vh; background: #f5f6f8; color: #253446; }
.a-top { display: flex; align-items: center; gap: 14px; padding: 14px 20px; background: #fff; border-bottom: 1px solid #e7ebe5; position: sticky; top: 0; z-index: 5; }
.a-back { color: var(--sf-main); text-decoration: none; font-size: 13px; }
.a-top strong { font-size: 16px; }
.a-top small { display: block; color: #8a94a0; font-size: 12px; }
.a-badge { margin-left: auto; font-size: 12px; color: var(--sf-main); background: var(--sf-soft); padding: 4px 10px; border-radius: 20px; }
.a-main { max-width: 760px; margin: 18px auto 110px; padding: 0 14px; display: flex; flex-direction: column; gap: 14px; }
.a-card { background: #fff; border: 1px solid #e7ebe5; border-radius: 12px; padding: 18px 16px; }
.a-step { font-size: 15px; font-weight: 700; color: #2b333b; margin-bottom: 12px; display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
.a-step b { color: #fff; background: var(--sf-main); width: 22px; height: 22px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 12px; }
.a-step small { color: #8a94a0; font-weight: 400; }
.a-boxes { display: flex; gap: 10px; overflow-x: auto; padding-bottom: 6px; }
.a-box { flex: 0 0 auto; width: 92px; border: 1px solid #e7ebe5; border-radius: 10px; background: #fff; padding: 8px 6px; display: flex; flex-direction: column; align-items: center; gap: 6px; cursor: pointer; }
.a-box img { width: 54px; height: 40px; object-fit: contain; }
.a-box span { font-size: 12px; color: #5b6570; }
.a-box.on { border-color: var(--sf-light); background: var(--sf-soft); }
.a-dims { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 10px; }
.a-dims label { display: flex; flex-direction: column; gap: 6px; font-size: 13px; color: #5b6570; }
.a-dims .el-input-number { width: 100%; }
.a-unfold { margin-top: 12px; display: flex; align-items: baseline; gap: 12px; background: var(--sf-soft); border: 1px dashed var(--sf-border); border-radius: 10px; padding: 10px 14px; }
.a-unfold span { font-size: 13px; color: #8a94a0; }
.a-unfold strong { color: var(--sf-strong); }
.a-unfold small { margin-left: auto; color: #8a94a0; }
.a-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }
.a-row label { display: flex; flex-direction: column; gap: 6px; font-size: 13px; color: #5b6570; }
.a-qty { display: flex; flex-direction: column; gap: 8px; }
.a-qty-input { width: 100%; }
.a-qty-input .el-input-number { width: 100%; }
.a-tiers { display: flex; flex-wrap: wrap; gap: 8px; }
.a-chips { display: flex; flex-wrap: wrap; gap: 8px; }
.a-tiers button, .a-chips button { border: 1px solid #dce6d9; background: #fff; border-radius: 8px; padding: 8px 12px; color: #5b6570; cursor: pointer; }
.a-tiers button.on, .a-chips button.on { background: var(--sf-soft); border-color: var(--sf-light); color: var(--sf-strong); }
.a-procs { margin-top: 10px; }
.a-procs > span { font-size: 13px; color: #5b6570; display: block; margin-bottom: 8px; }
.a-proc-input { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 8px; }
.a-proc-input label { display: flex; align-items: center; gap: 8px; font-size: 12px; color: #8a94a0; }
.a-proc-input .el-input-number { width: 130px; }
.a-spot { display: flex; align-items: center; gap: 8px; margin-top: 10px; font-size: 13px; color: #5b6570; }
.a-bottombar { position: fixed; left: 0; right: 0; bottom: 0; background: #fff; border-top: 1px solid #e7ebe5; display: flex; align-items: center; gap: 14px; padding: 10px 16px; z-index: 6; }
.a-price { flex: 1; }
.a-price small { display: block; color: #8a94a0; font-size: 12px; }
.a-price strong { font-size: 22px; color: #2b333b; }
.a-price em { font-size: 11px; color: var(--sf-light); margin-left: 6px; font-style: normal; }
.a-order { min-width: 180px; }
@media (max-width: 560px) { .a-row { grid-template-columns: 1fr; } .a-order { min-width: 130px } }
.a-var { margin-left: auto; display: flex; border: 1px solid #dce6d9; border-radius: 8px; overflow: hidden; }
.a-var button { border: none; background: #fff; color: #5b6570; padding: 4px 12px; font-size: 12px; cursor: pointer; }
.a-var button + button { border-left: 1px solid #dce6d9; }
.a-var button.on { background: var(--sf-main); color: #fff; }
</style>

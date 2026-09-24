<script setup>
import { computed } from 'vue'
import { ArrowLeft } from '@element-plus/icons-vue'
import { useRoute } from 'vue-router'
import { useStorefrontQuote } from '../../composables/useStorefrontQuote'
import ContactModal from '../../components/ContactModal.vue'
import UnfoldDimsEditor from '../../components/UnfoldDimsEditor.vue'
const route = useRoute()
const isDemo = computed(() => route.path.startsWith('/demo'))
const { config, boxOptions, selectBoxType, form, selectedShape, unfolded, unfoldAreaM2, materialOptions, quantityLocked, quantityTiers, treatmentOptions, PRINT_MODES, printRequirementOptions, GLUE_OPTIONS, processOptions, toggleProcess, selectedBoxType, baseProductionAmount, treatmentCharge, glueCharge, spotColorCharge, processTotal, processCharges, goodsTotal, shippingFee, displayed, orderState, createOrder, contactOpen, contactEntries, contact, checkoutSummary, copyMessage, qqUrl, qrUrl, copySummary } = useStorefrontQuote()
</script>

<template>
  <div class="plan-b">
    <header v-if="isDemo" class="b-top">
      <router-link to="/demo" class="b-back"><el-icon style="vertical-align:-2px"><ArrowLeft /></el-icon> 返回</router-link>
      <div><strong>{{ config.merchant.name }}</strong><small>方案 B · 左右分栏工作台</small></div>
      <span class="b-badge">桌面高效</span>
    </header>

    <main class="b-grid">
      <!-- 左列：全部配置 -->
      <div class="b-left">
        <section class="b-panel">
          <div class="b-boxhead"><h3>① 盒型</h3><div class="b-var"><button :class="{ on: form.boxVariant === 'ka' }" @click="form.boxVariant = 'ka'">卡盒</button><button :class="{ on: form.boxVariant === 'keng' }" @click="form.boxVariant = 'keng'">坑盒</button></div></div>
          <div class="b-boxes">
            <button v-for="item in boxOptions" :key="item.name" class="b-box" :class="{ on: config.product.boxType === item.name }" @click="selectBoxType(item.name)">
              <img :src="item.icon" :alt="item.name"><span>{{ item.name }}</span>
            </button>
          </div>
        </section>

        <section class="b-panel">
          <h3>② 尺寸 <small>毫米</small></h3>
          <UnfoldDimsEditor :form="form" :selected-shape="selectedShape" :unfolded="unfolded" :area-m2="unfoldAreaM2" />
        </section>

        <section class="b-panel">
          <h3>③ 材料与数量</h3>
          <div class="b-fields">
            <label>纸张材质<el-select v-model="form.material" style="width:100%"><el-option v-for="m in materialOptions" :key="m" :label="m" :value="m" /></el-select></label>
            <label>数量
              <div class="b-qty">
                <el-input-number v-if="!quantityLocked" v-model="form.quantity" :min="1" :step="100" controls-position="right" class="b-qty-input" />
                <div class="b-tiers"><button v-for="t in quantityTiers" :key="t.quantity" :class="{ on: form.quantity === t.quantity }" @click="form.quantity = t.quantity">{{ t.quantity.toLocaleString() }}</button></div>
              </div>
            </label>
          </div>
        </section>

        <section class="b-panel">
          <h3>④ 工艺与要求</h3>
          <div class="b-fields">
            <label>表面处理<el-select v-model="form.treatment" style="width:100%"><el-option v-for="t in treatmentOptions" :key="t" :label="t" :value="t" /></el-select></label>
            <label>印刷面数
              <div class="b-chips"><button v-for="m in PRINT_MODES" :key="m" :class="{ on: form.printMode === m }" @click="form.printMode = m">{{ m }}</button></div>
            </label>
            <label>印刷要求<el-select v-model="form.printRequirement" style="width:100%"><el-option v-for="p in printRequirementOptions" :key="p" :label="p" :value="p" /></el-select></label>
            <label>粘盒<el-select v-model="form.glue" style="width:100%"><el-option v-for="g in GLUE_OPTIONS" :key="g" :label="g" :value="g" /></el-select></label>
            <label>专色数<el-input-number v-model="form.spotColors" :min="0" :max="8" controls-position="right" /></label>
            <label class="b-full">工艺（可多选）
              <div class="b-chips"><button v-for="p in processOptions" :key="p" :class="{ on: form.processes.some(s => s.name === p) }" @click="toggleProcess(p)">{{ p }}</button></div>
            </label>
          </div>
          <div v-for="sel in form.processes" :key="'x' + sel.name" class="b-proc">
            <template v-if="config.pricing.processes[sel.name]?.billingMode === 'area'">
              <label>{{ sel.name }}宽<el-input-number v-model="sel.graphicWidth" :min="0" controls-position="right" :placeholder="'默认 ' + unfolded.width" /></label>
              <label>{{ sel.name }}高<el-input-number v-model="sel.graphicHeight" :min="0" controls-position="right" :placeholder="'默认 ' + unfolded.height" /></label>
            </template>
            <template v-else-if="config.pricing.processes[sel.name]?.billingMode === 'times'">
              <label>{{ sel.name }}次数<el-input-number v-model="sel.times" :min="1" controls-position="right" /></label>
            </template>
          </div>
        </section>
      </div>

      <!-- 右列：固定价格面板 -->
      <aside class="b-right">
        <div class="b-price">
          <h3>报价明细</h3>
          <div class="b-unfold-card">
            <span>展开尺寸</span><strong>{{ unfolded.length || '—' }} × {{ unfolded.width || '—' }} mm</strong>
            <small>面积 {{ unfoldAreaM2.toFixed(4) }} ㎡ · {{ selectedBoxType.name }}</small>
          </div>
          <div class="b-lines">
            <div><span>基础生产金额</span><b>￥{{ baseProductionAmount.toFixed(2) }}</b></div>
            <div v-if="treatmentCharge > 0"><span>表面处理{{ form.treatment ? ' · ' + form.treatment : '' }}</span><b>￥{{ treatmentCharge.toFixed(2) }}</b></div>
            <div v-if="glueCharge > 0"><span>粘盒</span><b>￥{{ glueCharge.toFixed(2) }}</b></div>
            <div v-if="spotColorCharge > 0"><span>专色（{{ Math.floor(Number(form.spotColors) || 0) }} 色）</span><b>￥{{ spotColorCharge.toFixed(2) }}</b></div>
            <div><span>工艺费用</span><b>￥{{ processTotal.toFixed(2) }}</b></div>
            <div v-for="p in processCharges" :key="p.name" class="b-sub"><span>{{ p.name }}</span><b>￥{{ p.total.toFixed(2) }}</b></div>
            <div><span>商品金额</span><b>￥{{ goodsTotal.toFixed(2) }}</b></div>
            <div><span>配送</span><b :class="{ free: shippingFee === 0 }">{{ shippingFee === 0 ? '免运费' : '￥' + shippingFee.toFixed(2) }}</b></div>
          </div>
          <div class="b-total"><span>总计</span><strong>￥{{ displayed.total.toFixed(2) }}</strong></div>
          <el-button class="b-order" type="primary" size="large" :loading="orderState === 'loading'" @click="createOrder">{{ orderState === 'success' ? '报价已复制' : '立即下单 ↗' }}</el-button>
        </div>
      </aside>
    </main>

    <ContactModal :open="contactOpen" :entries="contactEntries" :checkout-summary="checkoutSummary" :copy-message="copyMessage" @close="contactOpen = false" @copy="copySummary" />
  </div>
</template>

<style scoped>
.plan-b { min-height: 100vh; background: #f5f6f8; color: #253446; }
.b-top { display: flex; align-items: center; gap: 14px; padding: 14px 22px; background: #fff; border-bottom: 1px solid #e7ebe5; position: sticky; top: 0; z-index: 5; }
.b-back { color: var(--sf-main); text-decoration: none; font-size: 13px; }
.b-top strong { font-size: 16px; }
.b-top small { display: block; color: #8a94a0; font-size: 12px; }
.b-badge { margin-left: auto; font-size: 12px; color: #3f5f7a; background: #e8f2f8; padding: 4px 10px; border-radius: 20px; }
.b-grid { display: grid; grid-template-columns: minmax(0, 1.45fr) minmax(360px, 0.9fr); gap: 18px; max-width: 1280px; margin: 18px auto; padding: 0 18px; align-items: start; }
.b-left { display: flex; flex-direction: column; gap: 14px; }
.b-panel { background: #fff; border: 1px solid #e7ebe5; border-radius: 12px; padding: 16px 18px; }
.b-panel h3 { margin: 0 0 12px; font-size: 15px; color: #2b333b; display: flex; align-items: baseline; gap: 8px; }
.b-panel h3 small { color: #8a94a0; font-weight: 400; }
.b-boxes { display: flex; flex-wrap: wrap; gap: 10px; }
.b-box { width: 104px; border: 1px solid #e7ebe5; border-radius: 10px; background: #fff; padding: 8px; display: flex; flex-direction: column; align-items: center; gap: 6px; cursor: pointer; }
.b-box img { width: 60px; height: 42px; object-fit: contain; }
.b-box span { font-size: 12px; color: #5b6570; }
.b-box.on { border-color: var(--sf-light); background: var(--sf-soft); }
.b-fields { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px; }
.b-fields label { display: flex; flex-direction: column; gap: 6px; font-size: 13px; color: #5b6570; }
.b-fields .el-input-number, .b-fields .el-input { width: 100%; }
.b-full { grid-column: 1 / -1; }
.b-qty { display: flex; flex-direction: column; gap: 8px; }
.b-qty-input { width: 100%; }
.b-tiers, .b-chips { display: flex; flex-wrap: wrap; gap: 8px; }
.b-tiers button, .b-chips button { border: 1px solid #dce6d9; background: #fff; border-radius: 8px; padding: 8px 12px; color: #5b6570; cursor: pointer; }
.b-tiers button.on, .b-chips button.on { background: var(--sf-soft); border-color: var(--sf-light); color: var(--sf-strong); }
.b-proc { display: flex; gap: 12px; margin-top: 10px; flex-wrap: wrap; }
.b-proc label { display: flex; align-items: center; gap: 8px; font-size: 12px; color: #8a94a0; }
.b-proc .el-input-number { width: 130px; }
.b-right { position: sticky; top: 76px; }
.b-price { background: #fff; border: 1px solid #e7ebe5; border-radius: 14px; padding: 18px; }
.b-price h3 { margin: 0 0 12px; font-size: 15px; color: #2b333b; }
.b-unfold-card { background: var(--sf-soft); border: 1px dashed var(--sf-border); border-radius: 10px; padding: 12px 14px; display: flex; flex-direction: column; gap: 4px; margin-bottom: 12px; }
.b-unfold-card span { font-size: 12px; color: #8a94a0; }
.b-unfold-card strong { color: var(--sf-strong); font-size: 18px; }
.b-unfold-card small { color: #8a94a0; font-size: 12px; }
.b-lines { display: flex; flex-direction: column; gap: 8px; }
.b-lines > div { display: flex; justify-content: space-between; font-size: 13px; color: #5b6570; }
.b-lines .b-sub { padding-left: 14px; color: #8a94a0; font-size: 12px; }
.b-lines .free { color: var(--sf-light); }
.b-total { display: flex; justify-content: space-between; align-items: baseline; border-top: 1px solid #e7ebe5; margin-top: 12px; padding-top: 12px; }
.b-total span { color: #8a94a0; }
.b-total strong { font-size: 24px; color: #2b333b; }
.b-order { width: 100%; margin-top: 14px; }
@media (max-width: 960px) { .b-grid { grid-template-columns: 1fr; } .b-right { position: static; } }
.b-boxhead { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.b-boxhead h3 { margin: 0; }
.b-var { display: flex; border: 1px solid #dce6d9; border-radius: 8px; overflow: hidden; }
.b-var button { border: none; background: #fff; color: #5b6570; padding: 4px 12px; font-size: 12px; cursor: pointer; }
.b-var button + button { border-left: 1px solid #dce6d9; }
.b-var button.on { background: var(--sf-main); color: #fff; }
</style>

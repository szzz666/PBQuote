<script setup>
import { computed, watch } from 'vue'

/**
 * 尺寸区（三套排版共用）：
 * - 公式盒型：〔按成品尺寸计算 / 直接填展开尺寸〕二选一；
 *   手动模式下只显示 展开长×展开宽，价格按手填展开尺寸计算。
 * - 自定义盒型：无公式，只显示 展开长×展开宽，隐藏成品尺寸与切换开关。
 */
const props = defineProps({
  form: { type: Object, required: true },
  selectedShape: { type: Object, default: null },
  unfolded: { type: Object, default: () => ({ length: 0, width: 0 }) },
  areaM2: { type: Number, default: 0 },
})

const isCustom = computed(() => !props.selectedShape?.formulaText)
const isManual = computed(() => props.form.unfoldMode === 'manual' || isCustom.value)

function setMode(mode) {
  if (isCustom.value) return
  props.form.unfoldMode = mode
}
// 切到手动时，若展开尺寸为空则用公式结果预填
watch(isManual, (manual) => {
  if (manual && !isCustom.value) {
    if (!props.form.unfoldLength) props.form.unfoldLength = props.unfolded.length || 0
    if (!props.form.unfoldWidth) props.form.unfoldWidth = props.unfolded.width || 0
  }
})
</script>

<template>
  <div class="ud-editor">
    <p v-if="isCustom" class="ud-note">自定义盒型：请直接填写展开尺寸（毫米）。</p>
    <div v-else class="ud-switch">
      <button type="button" :class="{ on: !isManual }" @click="setMode('auto')">按成品尺寸计算</button>
      <button type="button" :class="{ on: isManual }" @click="setMode('manual')">直接填展开尺寸</button>
    </div>

    <!-- 自动：成品尺寸 + 展开预览 -->
    <div v-if="!isManual" class="ud-dims">
      <label>长<el-input-number v-model="form.length" :min="1" controls-position="right" /></label>
      <label>宽<el-input-number v-model="form.width" :min="1" controls-position="right" /></label>
      <label>高<el-input-number v-model="form.height" :min="1" controls-position="right" /></label>
      <label v-if="selectedShape?.params?.some(p => p.key === 'thickness')">纸板厚<el-input-number v-model="form.thickness" :min="0.1" :step="0.1" controls-position="right" /></label>
      <label v-if="selectedShape?.params?.some(p => p.key === 'cover')">盖高<el-input-number v-model="form.cover" :min="1" :step="0.5" controls-position="right" /></label>
    </div>
    <div v-else class="ud-manual">
      <label>展开长<el-input-number v-model="form.unfoldLength" :min="0" controls-position="right" placeholder="展开长(mm)" /></label>
      <label>展开宽<el-input-number v-model="form.unfoldWidth" :min="0" controls-position="right" placeholder="展开宽(mm)" /></label>
    </div>

    <div class="ud-preview">
      <span>展开尺寸</span><strong>{{ (isManual ? form.unfoldLength : unfolded.length) || '—' }} × {{ (isManual ? form.unfoldWidth : unfolded.width) || '—' }} mm</strong>
      <small>面积 {{ areaM2.toFixed(4) }} ㎡</small>
    </div>
  </div>
</template>

<style scoped>
.ud-note { font-size: 12px; color: #b3783d; background: #fdf3e3; border: 1px dashed #e3b870; border-radius: 8px; padding: 8px 10px; margin: 0 0 10px; }
.ud-switch { display: flex; gap: 8px; margin-bottom: 10px; }
.ud-switch button { border: 1px solid #dce6d9; background: #fff; border-radius: 8px; padding: 8px 14px; color: #6b786f; font-size: 12px; cursor: pointer; }
.ud-switch button.on { background: var(--sf-soft); border-color: var(--sf-light); color: var(--sf-strong); font-weight: 600; }
.ud-dims, .ud-manual { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; }
.ud-dims label, .ud-manual label { display: flex; flex-direction: column; gap: 6px; font-size: 13px; color: #5b6570; }
.ud-dims .el-input-number, .ud-manual .el-input-number { width: 100%; }
.ud-preview { margin-top: 12px; display: flex; align-items: baseline; gap: 10px; background: var(--sf-soft); border: 1px dashed var(--sf-border); border-radius: 10px; padding: 10px 14px; }
.ud-preview span { font-size: 12px; color: #8a94a0; }
.ud-preview strong { color: var(--sf-strong); font-size: 16px; }
.ud-preview small { margin-left: auto; color: #8a94a0; font-size: 12px; }
</style>

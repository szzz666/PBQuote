<script setup>
import { computed } from 'vue'

const props = defineProps({
  open: Boolean,
  entries: { type: Array, default: () => [] },
  checkoutSummary: { type: String, default: '' },
  copyMessage: { type: String, default: '' },
})
defineEmits(['close', 'copy'])

function imgSrc(value) {
  const v = String(value || '').trim()
  if (!v) return ''
  if (v.startsWith('/uploads/')) return new URL(v, window.location.origin).toString()
  if (v.startsWith('http://') || v.startsWith('https://')) return v
  return ''
}
function isSafeLink(value) {
  const v = String(value || '').trim()
  if (!v) return false
  if (v.startsWith('/') && !v.startsWith('//')) return true
  return v.startsWith('http://') || v.startsWith('https://')
}
const textEntries = computed(() => props.entries.filter((x) => x.type === 'text'))
const imageEntries = computed(() => props.entries.filter((x) => x.type === 'image' && imgSrc(x.value)))
const linkEntries = computed(() => props.entries.filter((x) => x.type === 'link' && isSafeLink(x.value)))
</script>

<template>
<div v-if="open" class="modal-backdrop" @click.self="$emit('close')">
  <section class="contact-dialog" role="dialog" aria-modal="true" aria-label="联系商家">
    <button class="modal-close" @click="$emit('close')" aria-label="关闭联系窗口">×</button>
    <h2>报价已准备好</h2>
    <p role="status">{{ copyMessage }}</p>
    <textarea readonly :value="checkoutSummary" aria-label="完整报价摘要" @focus="$event.target.select()"></textarea>
    <button class="primary-action" @click="$emit('copy')">复制完整报价</button>

    <div v-if="textEntries.length || imageEntries.length || linkEntries.length" class="contact-options">
      <div v-for="t in textEntries" :key="t.name" class="co-item">
        <strong>{{ t.name }}</strong>
        <p>{{ t.value }}</p>
      </div>
      <div v-for="im in imageEntries" :key="im.name" class="co-item">
        <strong>{{ im.name }}</strong>
        <img :src="imgSrc(im.value)" :alt="im.name" />
      </div>
      <div v-for="lk in linkEntries" :key="lk.name" class="co-item">
        <a :href="lk.value" target="_blank" rel="noopener noreferrer" class="co-link">{{ lk.name }}<el-icon style="vertical-align:-2px"><TopRight /></el-icon></a>
      </div>
    </div>
    <p v-else class="co-empty">商家尚未设置联系入口，请保留报价摘要。</p>
  </section>
</div>
</template>

<style scoped>
.contact-options { display: flex; flex-direction: column; gap: 10px; margin-top: 14px; }
.co-item { display: flex; align-items: center; gap: 10px; }
.co-item strong { font-size: 13px; color: #2b333b; min-width: 48px; }
.co-item p { margin: 0; font-size: 13px; color: #5b6570; }
.co-item img { width: 120px; height: 120px; object-fit: contain; border: 1px solid #ecefe9; border-radius: 8px; }
.co-link { display: inline-flex; align-items: center; gap: 4px; background: var(--sf-main, #587450); color: #fff; padding: 8px 16px; border-radius: 8px; text-decoration: none; font-size: 13px; }
.co-empty { color: #8a94a0; font-size: 13px; margin: 14px 0 0; }
</style>

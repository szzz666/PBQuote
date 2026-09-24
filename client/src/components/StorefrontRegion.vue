<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useConfigStore } from '../stores/config'
import { useStorefrontEditor } from '../composables/useStorefrontEditor'
import { isSafeWebUrl, resolveAssetUrl } from '../utils/url'
import { REGION_W, BLOCK_MIN_W, BLOCK_MIN_H } from '../utils/canvas'

const props = defineProps({ region: { type: String, default: 'top' } })

const configStore = useConfigStore()
const editor = useStorefrontEditor()

const wrapRef = ref(null)
const scale = ref(1)
let ro = null
function measure() {
  if (!wrapRef.value) return
  const w = wrapRef.value.clientWidth
  const designW = REGION_W[props.region] || 1200
  if (w > 0) scale.value = w / designW
}
onMounted(() => { measure(); ro = new ResizeObserver(measure); ro.observe(wrapRef.value) })
onUnmounted(() => { if (ro) ro.disconnect() })

const designW = computed(() => REGION_W[props.region] || 1200)
const blocks = computed(() =>
  editor.editing.value
    ? editor.regionBlocks(props.region)
    : (configStore.config.contentBlocks || []).filter((b) => (b.region || 'top') === props.region))
const canvasH = computed(() => editor.editing.value ? editor.regionH(props.region) : Math.max(REGION_H_VIEW, ...blocks.value.map((b) => (b.y || 0) + (b.h || 0)) + 16))
const REGION_H_VIEW = props.region === 'left' || props.region === 'right' ? 320 : props.region === 'bottom' ? 140 : 260

const drag = ref(null)
const guides = ref({ v: [], h: [] })
function onPointerDown(e, b, handle) {
  if (!editor.editing.value) return
  e.preventDefault()
  editor.selectBlock(b.id)
  drag.value = { id: b.id, handle: handle || 'move', sx: e.clientX, sy: e.clientY, bx0: b.x, by0: b.y, bw0: b.w, bh0: b.h }
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
}
function onPointerMove(e) {
  const d = drag.value
  if (!d) return
  const list = editor.draft.value.blocks
  const b = list.find((o) => o.id === d.id)
  if (!b) return
  const dx = (e.clientX - d.sx) / scale.value
  const dy = (e.clientY - d.sy) / scale.value
  const others = list.filter((o) => o.id !== d.id && (o.region || 'top') === props.region)
  const region = props.region
  const W = designW.value
  let rect, rx = false, ry = false
  if (d.handle === 'move') rect = { x: d.bx0 + dx, y: d.by0 + dy, w: d.bw0, h: d.bh0 }
  else {
    rx = ['e', 'se', 'sw'].includes(d.handle)
    ry = ['s', 'se', 'ne'].includes(d.handle)
    let w = d.bw0, h = d.bh0, x = d.bx0, y = d.by0
    if (d.handle.includes('e')) w = d.bw0 + dx
    if (d.handle.includes('s')) h = d.bh0 + dy
    if (d.handle.includes('w')) { w = d.bw0 - dx; x = d.bx0 + dx }
    if (d.handle.includes('n')) { h = d.bh0 - dy; y = d.by0 + dy }
    w = Math.max(BLOCK_MIN_W, w); h = Math.max(BLOCK_MIN_H, h)
    rect = { x, y, w, h }
  }
  rect.x = Math.max(0, Math.min(rect.x, W - rect.w))
  rect.y = Math.max(0, rect.y)
  const snapped = editor.snapRect(rect, region, others, rx, ry)
  editor.updateBlockById(d.id, { x: snapped.x, y: snapped.y, w: snapped.w, h: snapped.h })
  guides.value = { v: snapped.gx, h: snapped.gy }
}
function onPointerUp() {
  drag.value = null
  guides.value = { v: [], h: [] }
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
}

const bstyle = (b) => ({ left: (b.x || 0) + 'px', top: (b.y || 0) + 'px', width: (b.w || 0) + 'px', height: (b.h || 0) + 'px' })
function imgOf(b) { return b?.imageUrl ? resolveAssetUrl(b.imageUrl, configStore.apiBase) : '' }
function linkOf(b) { const v = String(b?.link || '').trim(); return isSafeWebUrl(v) ? v : '' }
function textOf(b) { return String(b?.text || '').trim() }
const HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']
</script>

<template>
  <div ref="wrapRef" class="sr-wrap">
    <div v-if="blocks.length" class="sr-box" :style="{ height: Math.round(canvasH * scale) + 'px' }">
      <div class="sr-canvas" :style="{ width: designW + 'px', transform: 'scale(' + scale + ')', transformOrigin: 'top left' }">
        <div v-for="b in blocks" :key="b.id" class="sr-block" :class="{ 'sr-edit': editor.editing.value, 'sr-selected': editor.editing.value && editor.selectedId.value === b.id }" :style="bstyle(b)" @click.stop="editor.editing.value && editor.selectBlock(b.id)" @pointerdown.stop="onPointerDown($event, b, 'move')">
          <router-link v-if="linkOf(b) && !editor.editing.value && linkOf(b).startsWith('/')" :to="linkOf(b)" class="sr-inner">
            <img v-if="imgOf(b)" :src="imgOf(b)" :alt="textOf(b) || '推荐内容'" class="sr-img" />
            <span v-if="textOf(b)" class="sr-text">{{ textOf(b) }}</span>
          </router-link>
          <a v-else-if="linkOf(b) && !editor.editing.value" :href="linkOf(b)" target="_blank" rel="noopener noreferrer" class="sr-inner">
            <img v-if="imgOf(b)" :src="imgOf(b)" :alt="textOf(b) || '推荐内容'" class="sr-img" />
            <span v-if="textOf(b)" class="sr-text">{{ textOf(b) }}</span>
          </a>
          <div v-else class="sr-inner">
            <img v-if="imgOf(b)" :src="imgOf(b)" :alt="textOf(b) || '推荐内容'" class="sr-img" />
            <span v-if="textOf(b)" class="sr-text">{{ textOf(b) }}</span>
          </div>
          <template v-if="editor.editing.value">
            <span v-for="h in HANDLES" :key="h" :class="'sr-handle sr-h-' + h" @pointerdown.stop="onPointerDown($event, b, h)"></span>
          </template>
        </div>
        <div v-for="(v, i) in guides.v" :key="'gv' + i" class="sr-guide sr-guide-v" :style="{ left: v + 'px' }"></div>
        <div v-for="(hh, i) in guides.h" :key="'gh' + i" class="sr-guide sr-guide-h" :style="{ top: hh + 'px' }"></div>
      </div>
    </div>
    <div v-else-if="editor.editing.value" class="sr-empty" @click="editor.addBlock(props.region, 'center')">＋ 在{{ '左/右/底/顶'[['top','left','right','bottom'].indexOf(props.region)] }}侧区域新增内容块</div>
  </div>
</template>

<style scoped>
.sr-wrap { width: 100%; }
.sr-box { position: relative; overflow: hidden; width: 100%; border-radius: 10px; background: #fbfcfd; }
.sr-canvas { position: relative; background: transparent; }
.sr-block { position: absolute; box-sizing: border-box; }
.sr-edit { border: 1px solid var(--sf-border); background: rgba(255,255,255,.6); border-radius: 6px; cursor: move; }
.sr-edit.sr-selected { border-color: var(--sf-main); box-shadow: 0 0 0 1px var(--sf-main); }
.sr-inner { display: flex; width: 100%; height: 100%; align-items: center; justify-content: center; flex-direction: column; overflow: hidden; text-decoration: none; }
.sr-img { display: block; max-width: 100%; max-height: 100%; object-fit: contain; }
.sr-text { color: #3d4750; font-size: 13px; text-align: center; padding: 2px 6px; }
.sr-handle { position: absolute; width: 9px; height: 9px; background: #fff; border: 1px solid var(--sf-main); border-radius: 2px; z-index: 3; }
.sr-h-nw { left: -5px; top: -5px; cursor: nwse-resize; }
.sr-h-n { left: 50%; top: -5px; margin-left: -5px; cursor: ns-resize; }
.sr-h-ne { right: -5px; top: -5px; cursor: nesw-resize; }
.sr-h-e { right: -5px; top: 50%; margin-top: -5px; cursor: ew-resize; }
.sr-h-se { right: -5px; bottom: -5px; cursor: nwse-resize; }
.sr-h-s { left: 50%; bottom: -5px; margin-left: -5px; cursor: ns-resize; }
.sr-h-sw { left: -5px; bottom: -5px; cursor: nesw-resize; }
.sr-h-w { left: -5px; top: 50%; margin-top: -5px; cursor: ew-resize; }
.sr-guide { position: absolute; background: #e0453a; z-index: 4; pointer-events: none; }
.sr-guide-v { width: 1px; top: 0; bottom: 0; }
.sr-guide-h { height: 1px; left: 0; right: 0; }
.sr-empty { border: 1px dashed var(--sf-border); border-radius: 10px; color: #87929e; padding: 20px; text-align: center; cursor: pointer; font-size: 13px; }
</style>

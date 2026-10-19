<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useConfigStore } from '../stores/config'
import PlanAView from './demo/PlanAView.vue'
import PlanBView from './demo/PlanBView.vue'
import PlanCView from './demo/PlanCView.vue'
import StorefrontRegion from '../components/StorefrontRegion.vue'
import StorefrontEditor from '../components/StorefrontEditor.vue'
import { useTopbarEmbed } from '../composables/useTopbarEmbed'

const route = useRoute()
const configStore = useConfigStore()
const config = computed(() => configStore.config)
const layout = computed(() => config.value.storefrontLayout || 'b')
const LayoutComp = computed(() => layout.value === 'a' ? PlanAView : layout.value === 'c' ? PlanCView : PlanBView)

// 顶栏「嵌入」链接：替换报价区内容，返回即恢复
const embed = useTopbarEmbed()

// 前台可用性：由本组件负责加载与判定，避免"先渲染默认配置再闪一下"的情况
const UNAVAILABLE_MESSAGE = '商家前台不存在或已停用'
const storefrontUnavailable = ref(false)
const ready = ref(false)
const slug = computed(() => String(route.params.slug || 'default'))

function isUnavailable(e) {
  const msg = String(e?.message || e || '')
  return msg.includes('不存在或已停用') || msg.includes('Not Found')
}

async function loadStorefront() {
  const target = slug.value
  storefrontUnavailable.value = false
  ready.value = false
  // 换商户/重新加载时关闭嵌入层，避免残留上一个商户的链接
  embed.close()
  try {
    await configStore.loadStorefront(target)
    if (slug.value !== target) return
  } catch (e) {
    if (slug.value !== target) return
    if (isUnavailable(e)) storefrontUnavailable.value = true
  } finally {
    if (slug.value === target) ready.value = true
  }
}

onMounted(loadStorefront)
watch(slug, loadStorefront)

// ---- 嵌入层高度自适应 ----
// 同源内容：读取 iframe 内容高度并按需撑开（页面内滚动查看完整内容）；
// 跨域内容：浏览器安全策略禁止读取 innerDocument，回退为「铺满顶栏以下区域」。
const embedFrame = ref(null)
const frameHeight = ref('100%')

function resetFrameHeight() { frameHeight.value = '100%' }

function measureFrame() {
  const el = embedFrame.value
  if (!el) return
  let doc = null
  try { doc = el.contentDocument } catch { doc = null }
  if (!doc) { frameHeight.value = '100%'; return }
  const h = Math.max(
    doc.documentElement?.scrollHeight || 0,
    doc.body?.scrollHeight || 0,
    doc.body?.offsetHeight || 0,
  )
  if (!h) { frameHeight.value = '100%'; return }
  const viewH = Math.max(320, window.innerHeight - 64)
  frameHeight.value = h > viewH ? Math.ceil(h) + 'px' : '100%'
}

function onFrameLoad() {
  embed.loaded()
  measureFrame()
  // 内容多为异步渲染，多测几次以适配最终高度
  setTimeout(measureFrame, 300)
  setTimeout(measureFrame, 900)
  setTimeout(measureFrame, 1800)
}

function onWindowResize() { if (embed.isOpen.value) { resetFrameHeight(); setTimeout(measureFrame, 120) } }
if (typeof window !== 'undefined') window.addEventListener('resize', onWindowResize)
onBeforeUnmount(() => { if (typeof window !== 'undefined') window.removeEventListener('resize', onWindowResize) })

// 切换嵌入地址时先复位高度
watch(() => embed.activeUrl.value, () => { frameHeight.value = '100%' })

// 嵌入层铺满视口：打开时锁定页面滚动，关闭/离开时恢复
watch(() => embed.isOpen.value, (open) => {
  if (typeof document === 'undefined') return
  document.body.style.overflow = open ? 'hidden' : ''
}, { immediate: true })
onBeforeUnmount(() => { if (typeof document !== 'undefined') document.body.style.overflow = '' })
</script>

<template>
  <div class="sv-shell">
    <!-- 整页遮罩：前台不存在或已停用，所有报价交互不可用 -->
    <div v-if="storefrontUnavailable" class="sv-mask">
      <div class="sv-mask-card">
        <svg class="sv-mask-icon" viewBox="0 0 24 24" width="52" height="52" aria-hidden="true">
          <path fill="currentColor" d="M12 2 1 21h22L12 2Zm0 5.5 7.5 12.5h-15L12 7.5Zm-1 4v4h2v-4h-2Zm0 5v2h2v-2h-2Z"/>
        </svg>
        <h1 class="sv-mask-title">{{ UNAVAILABLE_MESSAGE }}</h1>
        <p class="sv-mask-sub">店铺标识：<code>{{ slug }}</code></p>
        <p class="sv-mask-tip">请确认链接是否正确，或联系商家获取新的报价链接。</p>
      </div>
    </div>

    <template v-else-if="ready">
      <div class="sv-top"><StorefrontRegion region="top" /></div>
      <div class="sv-row">
        <aside class="sv-side sv-left"><StorefrontRegion region="left" /></aside>
        <main class="sv-main">
          <!-- 顶栏嵌入：铺满顶栏以下整块区域，视觉上等同于本页内容 -->
          <div v-if="embed.isOpen.value" class="sv-embed">
            <div v-if="embed.failed.value" class="sv-embed-fail">
              <p>该网站不允许被嵌入显示（对方站点设置了 X-Frame-Options 或 CSP 限制）。</p>
              <a :href="embed.activeUrl.value" target="_blank" rel="noopener noreferrer" class="sv-embed-btn">在新窗口打开</a>
            </div>
            <template v-else>
              <div v-if="embed.loading.value" class="sv-embed-loading">正在加载…</div>
              <iframe
                ref="embedFrame"
                :src="embed.activeUrl.value"
                :title="embed.activeName.value || '嵌入内容'"
                class="sv-embed-frame"
                :style="{ height: frameHeight }"
                referrerpolicy="no-referrer"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                @load="onFrameLoad()"
                @error="embed.error()"
              />
            </template>
          </div>
          <component :is="LayoutComp" v-else />
        </main>
        <aside class="sv-side sv-right"><StorefrontRegion region="right" /></aside>
      </div>
      <div class="sv-bottom"><StorefrontRegion region="bottom" /></div>
      <StorefrontEditor />
    </template>
  </div>
</template>

<style scoped>
.sv-shell { max-width: 1560px; margin: 0 auto; padding: 0 18px 90px; }
.sv-top { margin: 16px 0 2px; }
.sv-row { display: flex; gap: 14px; align-items: flex-start; }
.sv-side { flex: 0 0 260px; min-width: 0; }
.sv-main { flex: 1; min-width: 0; }
.sv-bottom { margin-top: 16px; }
@media (max-width: 1180px) { .sv-side { display: none; } .sv-row { display: block; } }

/* 顶栏嵌入：覆盖顶部栏（64px）以下的全部区域，无边框无圆角 */
.sv-embed {
  position: fixed; top: var(--topbar-h, 64px); left: 0; right: 0; bottom: 0;
  z-index: 15; background: #fff; overflow-y: auto; overflow-x: hidden;
}
.sv-embed-frame { width: 100%; min-height: 100%; border: 0; display: block; background: #fff; }
.sv-embed-loading { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; color: #8a94a0; font-size: 13px; background: #fff; }
.sv-embed-fail { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px; text-align: center; color: #3d4750; font-size: 14px; line-height: 1.7; background: #fff; }
.sv-embed-fail p { margin: 0 0 18px; }
.sv-embed-btn { display: inline-block; padding: 8px 20px; border-radius: 8px; background: var(--sf-main, #3f7134); color: #fff; text-decoration: none; font-size: 13px; }

/* 遮罩 */
.sv-mask {
  position: fixed; inset: 0; z-index: 3000;
  display: flex; align-items: center; justify-content: center;
  padding: 24px;
  background: rgba(24, 30, 36, .55);
  backdrop-filter: blur(3px);
}
.sv-mask-card {
  width: min(480px, 100%); background: #fff; border-radius: 16px;
  padding: 36px 30px 30px; text-align: center;
  box-shadow: 0 24px 60px rgba(0, 0, 0, .22);
}
.sv-mask-icon { color: #e6a23c; margin-bottom: 14px; }
.sv-mask-title { margin: 0 0 10px; font-size: 20px; font-weight: 700; color: #2b333b; }
.sv-mask-sub { margin: 0 0 6px; font-size: 13px; color: #6b7684; }
.sv-mask-sub code { background: #f2f4f7; padding: 1px 6px; border-radius: 4px; color: #444; }
.sv-mask-tip { margin: 0; font-size: 13px; color: #8a94a0; line-height: 1.6; }
</style>

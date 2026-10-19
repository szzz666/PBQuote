import { computed, ref } from 'vue'

/**
 * 顶栏「嵌入」链接的共享状态。
 * 点击顶栏中 mode=embed 的链接时，把地址写进 activeUrl，
 * 前台 StorefrontView 用 iframe 替换报价区内容；点「返回报价」清空即可恢复。
 */
const activeUrl = ref('')
const activeName = ref('')
const loading = ref(false)
/** 加载失败标记：多数站点用 X-Frame-Options / CSP 禁止嵌入，超时或 error 时置 true */
const failed = ref(false)

let timer = null

export function useTopbarEmbed() {
  const isOpen = computed(() => Boolean(activeUrl.value))

  function open(url, name = '') {
    if (!url) return
    activeUrl.value = url
    activeName.value = name
    failed.value = false
    loading.value = true
    if (timer) clearTimeout(timer)
    // 8 秒内没有收到 load 事件就当加载失败（被拒绝嵌入时往往只触发空白屏）
    timer = setTimeout(() => {
      if (activeUrl.value === url && loading.value) { loading.value = false; failed.value = true }
    }, 8000)
  }

  function loaded() {
    if (timer) clearTimeout(timer)
    loading.value = false
    failed.value = false
  }

  function error() {
    if (timer) clearTimeout(timer)
    loading.value = false
    failed.value = true
  }

  function close() {
    if (timer) clearTimeout(timer)
    activeUrl.value = ''
    activeName.value = ''
    loading.value = false
    failed.value = false
  }

  return { activeUrl, activeName, loading, failed, isOpen, open, loaded, error, close }
}

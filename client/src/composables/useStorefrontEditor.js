import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '../stores/auth'
import { useConfigStore } from '../stores/config'
import { http } from '../api/client'
import { isSafeWebUrl } from '../utils/url'
import { REGION_W, BLOCK_MIN_W, BLOCK_MIN_H, SNAP_THRESHOLD, REGIONS } from '../utils/canvas'
import { THEME_IDS } from '../config/themes'

const clone = (v) => JSON.parse(JSON.stringify(v))
const bId = () => 'b' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)

/** 编辑状态模块级单例：按钮/工具栏/各区域画布共享同一份 */
const editing = ref(false)
const saving = ref(false)
const confirmExit = ref(false)
const selectedId = ref(null)
const draft = ref({ blocks: [], links: [] })

const DEFAULT_W = 360
const DEFAULT_H = 120
const REGION_MIN_H = { top: 260, bottom: 140, left: 320, right: 320 }

export function useStorefrontEditor() {
  const route = useRoute()
  const auth = useAuthStore()
  const configStore = useConfigStore()

  const routeSlug = computed(() => route.params.slug || auth.user?.merchantSlug || configStore.config.merchant?.slug || 'default')
  const isSuperAdmin = computed(() => auth.user?.role === 'super_admin')
  const canEdit = computed(() =>
    Boolean(auth.token) && (isSuperAdmin.value || (auth.user?.role === 'merchant' && auth.user.merchantSlug === routeSlug.value)))

  function enterEdit() {
    draft.value = {
      blocks: clone((configStore.config.contentBlocks || []).map((b) => ({ region: 'top', ...b }))),
      links: clone(configStore.config.topbarLinks || []),
      layout: ['a', 'b', 'c'].includes(configStore.config.storefrontLayout) ? configStore.config.storefrontLayout : 'b',
      theme: THEME_IDS.includes(configStore.config.storefrontTheme) ? configStore.config.storefrontTheme : 'green',
    }
    selectedId.value = draft.value.blocks[0]?.id ?? null
    editing.value = true
    confirmExit.value = false
  }
  function exitEdit(force = false) {
    if (!force && dirty()) { confirmExit.value = true; return }
    editing.value = false
    draft.value = { blocks: [], links: [] }
    selectedId.value = null
    confirmExit.value = false
  }
  const dirty = () =>
    JSON.stringify(draft.value.blocks) !== JSON.stringify((configStore.config.contentBlocks || []).map((b) => ({ region: 'top', ...b }))) ||
    JSON.stringify(draft.value.links) !== JSON.stringify(configStore.config.topbarLinks || []) ||
    draft.value.layout !== (['a', 'b', 'c'].includes(configStore.config.storefrontLayout) ? configStore.config.storefrontLayout : 'b') ||
    draft.value.theme !== (THEME_IDS.includes(configStore.config.storefrontTheme) ? configStore.config.storefrontTheme : 'green')

  const blocks = computed(() => draft.value.blocks)
  const selected = computed(() => blocks.value.find((b) => b.id === selectedId.value) || null)

  function regionBlocks(region) { return draft.value.blocks.filter((b) => (b.region || 'top') === region) }
  function regionH(region) {
    const list = regionBlocks(region)
    const maxY = list.reduce((m, b) => Math.max(m, (b.y || 0) + (b.h || 0)), 0)
    return Math.max(REGION_MIN_H[region] || 260, Math.ceil(maxY) + 16)
  }

  function selectBlock(id) { selectedId.value = id }
  function updateBlock(patch) { const b = selected.value; if (b) Object.assign(b, patch) }
  function updateBlockById(id, patch) { const b = blocks.value.find((x) => x.id === id); if (b) Object.assign(b, patch) }
  function removeBlock(id) {
    draft.value.blocks = draft.value.blocks.filter((b) => b.id !== id)
    if (selectedId.value === id) selectedId.value = draft.value.blocks[0]?.id ?? null
  }

  /** region: top | left | right | bottom；edge: top|bottom|left|right|center */
  function addBlock(region = 'top', edge = 'center') {
    if (blocks.value.length >= 50) { ElMessage.warning('内容块最多 50 个'); return }
    const W = REGION_W[region]
    const H = regionH(region)
    const w = Math.min(DEFAULT_W, W)
    let x = (W - w) / 2
    let y = Math.max(0, (H - DEFAULT_H) / 2)
    if (edge === 'top') y = 0
    else if (edge === 'bottom') y = Math.max(0, H - DEFAULT_H)
    else if (edge === 'left') { x = 0; y = Math.max(0, (H - DEFAULT_H) / 2) }
    else if (edge === 'right') { x = W - w; y = Math.max(0, (H - DEFAULT_H) / 2) }
    const b = { id: bId(), region, x: Math.round(Math.min(Math.max(0, x), W - w)), y: Math.round(Math.max(0, y)), w: Math.round(w), h: DEFAULT_H, imageUrl: '', text: '推荐内容', link: '' }
    draft.value.blocks.push(b)
    selectedId.value = b.id
  }

  const links = computed(() => draft.value.links)
  function addLink() { if (links.value.length < 6) draft.value.links.push({ name: '', url: '' }) }
  function removeLink(i) { draft.value.links.splice(i, 1) }

  function snapRect(rect, region, others, isResizeX, isResizeY) {
    const W = REGION_W[region] || 1200
    const H = regionH(region)
    const gx = [], gy = []
    let x = rect.x, y = rect.y, w = rect.w, h = rect.h
    const rx = isResizeX ? x + w : x + w / 2
    const ry = isResizeY ? y + h : y + h / 2
    const cx = [], cy = []
    cx.push(0, W / 2, W)
    cy.push(0, H / 2, H)
    for (const o of others) {
      cx.push(o.x, o.x + o.w, o.x + o.w / 2)
      cy.push(o.y, o.y + o.h, o.y + o.h / 2)
    }
    if (isResizeX) { for (const t of cx) if (Math.abs(rx - t) <= SNAP_THRESHOLD) { w = Math.max(w, t - x); gx.push(t); break } }
    else { for (const t of cx) if (Math.abs(rx - t) <= SNAP_THRESHOLD) { x = Math.min(x + w, t - w / 2); gx.push(t); break } }
    if (isResizeY) { for (const t of cy) if (Math.abs(ry - t) <= SNAP_THRESHOLD) { h = Math.max(h, t - y); gy.push(t); break } }
    else { for (const t of cy) if (Math.abs(ry - t) <= SNAP_THRESHOLD) { y = Math.min(y + h, t - h / 2); gy.push(t); break } }
    return { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h), gx, gy }
  }

  async function save() {
    if (saving.value) return
    const err = validate(draft.value.blocks, draft.value.links)
    if (err) { ElMessage.warning(err); return }
    saving.value = true
    try {
      const data = await http.patch('/merchant/' + encodeURIComponent(routeSlug.value) + '/config', {
        storefrontLayout: ['a', 'b', 'c'].includes(draft.value.layout) ? draft.value.layout : 'b',
        storefrontTheme: THEME_IDS.includes(draft.value.theme) ? draft.value.theme : 'green',
        topbarLinks: draft.value.links,
        contentBlocks: draft.value.blocks.map((b) => ({ id: b.id, region: b.region || 'top', x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.w), h: Math.round(b.h), imageUrl: (b.imageUrl || '').trim(), text: (b.text || '').trim(), link: (b.link || '').trim() })),
      })
      configStore.apply(data)
      await configStore.loadStorefront(routeSlug.value)
      editing.value = false
      draft.value = { blocks: [], links: [] }
      selectedId.value = null
      ElMessage.success('已保存并生效')
    } catch (e) { ElMessage.error(e.message || '保存失败') }
    finally { saving.value = false }
  }

  function validate(list, links) {
    if ((links || []).length > 6) return '顶栏链接最多 6 个'
    for (const l of links || []) {
      if (!String(l.name || '').trim()) return '顶栏链接名称不能为空'
      if (!String(l.url || '').trim()) return '顶栏链接地址不能为空'
      if (!isSafeWebUrl(l.url)) return '顶栏链接仅支持 http/https 或站内路径'
    }
    for (const b of list || []) {
      const region = ['top', 'left', 'right', 'bottom'].includes(b.region) ? b.region : 'top'
      const W = REGION_W[region]
      if (b.w < BLOCK_MIN_W || b.h < BLOCK_MIN_H) return '内容块尺寸过小'
      if (b.x < 0 || b.y < 0 || b.x + b.w > W) return '内容块超出所在区域画布范围'
      if (!String(b.imageUrl || '').trim() && !String(b.text || '').trim()) return '每个内容块至少填写图片或文本'
      if (b.imageUrl && !isSafeWebUrl(b.imageUrl)) return '内容块图片地址无效'
      if (b.link && !isSafeWebUrl(b.link)) return '内容块链接地址无效'
    }
    return ''
  }

  return {
    canEdit,
    editing, saving, confirmExit, selectedId, routeSlug,
    draft, blocks, selected, links,
    regionBlocks, regionH, REGION_W, REGIONS,
    enterEdit, exitEdit, dirty, save,
    selectBlock, updateBlock, updateBlockById, removeBlock, addBlock,
    addLink, removeLink, snapRect, validate,
  }
}

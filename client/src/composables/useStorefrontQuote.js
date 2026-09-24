import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useClipboard } from '@vueuse/core'
import { http } from '../api/client'
import { useAuthStore } from '../stores/auth'
import { useConfigStore } from '../stores/config'
import { boxTypeAssets } from '../config/merchant-assets'
import { boxShapes, computeUnfolded, findBoxShape, CUSTOM_SHAPE } from '../lib/box-shapes'

/** 前台报价的全部逻辑：盒形/尺寸/材质/工艺/价格/下单/联系。供多种排版复用。 */
export function useStorefrontQuote() {
  const route = useRoute()
  const auth = useAuthStore()
  const user = computed(() => auth.user)
  const configStore = useConfigStore()
  const config = computed(() => configStore.config)

  const loading = ref(false)
  const apiError = ref('')
  const quoteRequested = ref(false)
  const serverQuote = ref(null)
  const orderState = ref('idle')
  const checkoutSummary = ref('')
  const contactOpen = ref(false)
  const copyMessage = ref('')

  const routeSlug = computed(() => route.params.slug || user.value?.merchantSlug || config.value.merchant.slug || 'default')

const form = reactive({ length: 120, width: 80, height: 35, thickness: 1.5, cover: 15, unfoldMode: 'auto', unfoldLength: 0, unfoldWidth: 0, quantity: 500, material: '', treatment: '', printMode: '单面印刷', printRequirement: '正常', glue: '不粘', spotColors: 0, processes: [], boxVariant: 'ka' })
const BOX_VARIANTS = [{ id: 'ka', label: '卡盒' }, { id: 'keng', label: '坑盒' }]
const PRINT_MODES = ['单面印刷', '双面印刷']
const GLUE_OPTIONS = ['不粘', '粘']
const printRequirementOptions = computed(() => (config.value.pricing.requirements?.list ?? []).map((r) => r.name))
const selectedRequirement = computed(() => (config.value.pricing.requirements?.list ?? []).find((r) => r.name === form.printRequirement) ?? { name: '正常', rate: 0 })

const brandLogo = computed(() => { const url = config.value.merchant.logoUrl || ''; if (!url) return ''; if (url.startsWith('/uploads/')) return new URL(url, configStore.apiBase).toString(); return url })
const brandSubtitle = computed(() => config.value.merchant.brandSubtitle || '')

const shapeCatalog = computed(() => [...boxShapes, CUSTOM_SHAPE])
const selectedShape = computed(() => findBoxShape(config.value.product.boxType) || CUSTOM_SHAPE)
const selectedBoxType = computed(() => boxOptions.value.find((item) => item.name === config.value.product.boxType) || boxOptions.value[0])
const unfolded = computed(() => {
  if (form.unfoldMode === 'manual' || !selectedShape.value.formulaText) return { length: Number(form.unfoldLength) || 0, width: Number(form.unfoldWidth) || 0 }
  try {
    return computeUnfolded(selectedShape.value.id, { length: Number(form.length) || 0, width: Number(form.width) || 0, height: Number(form.height) || 0, thickness: Number(form.thickness) || 1.5, cover: Number(form.cover) || 15 }, form.boxVariant)
  } catch { return { length: 0, width: 0 } }
})
const unfoldAreaM2 = computed(() => (Number(unfolded.value.length || 0) * Number(unfolded.value.width || 0)) / 1000000)
const selectedMaterial = computed(() => config.value.pricing.materials.find(m => m.name === form.material) || config.value.pricing.materials[0])
const quantityTiers = computed(() => [...(selectedMaterial.value?.quantityTiers ?? [])].sort((a, b) => a.quantity - b.quantity))
const quantityLocked = computed(() => config.value.pricing.quantityMode === 'options')
if (import.meta.env.DEV) { /* noop */ }
const selectedPricingTier = computed(() => quantityTiers.value.filter(t => t.quantity <= Number(form.quantity)).pop() || quantityTiers.value[0] || { quantity: 0, unitPricePerM2: 0, minimumCharge: 0 })
const sideFactor = computed(() => form.printMode === '双面印刷' ? 1 + Number(config.value.pricing.print?.doubleSidedSurcharge ?? 0.6) : 1)
const requirementFactor = computed(() => 1 + Number(selectedRequirement.value?.rate ?? 0))
const processCharges = computed(() => form.processes.map((sel) => {
  const rule = config.value.pricing.processes?.[sel.name] || { billingMode: 'area', setupFee: 150, unitPrice: 0.1 }
  const quantity = Number(form.quantity) || 0
  let variable = 0
  if (rule.billingMode === 'area') {
    const gw = Number(sel.graphicWidth) || unfolded.value.width
    const gh = Number(sel.graphicHeight) || unfolded.value.height
    variable = (gw * gh / 1e6) * quantity * Number(rule.unitPrice)
  } else if (rule.billingMode === 'times') {
    variable = Number(rule.unitPrice) * Math.max(1, Number(sel.times) || 1) * quantity
  } else {
    variable = Number(rule.unitPrice) * quantity
  }
  return { name: sel.name, billingMode: rule.billingMode, setupFee: Number(rule.setupFee), variable: Number(variable.toFixed(2)), total: Number((Number(rule.setupFee) + variable).toFixed(2)) }
}))
const processTotal = computed(() => processCharges.value.reduce((sum, item) => sum + item.total, 0))
const unitPrice = computed(() => Number(selectedPricingTier.value.unitPricePerM2 || 0))
const baseProductionAmount = computed(() => Number((Math.max(unfoldAreaM2.value * unitPrice.value * Number(form.quantity || 0), Number(selectedPricingTier.value.minimumCharge || 0)) * sideFactor.value * requirementFactor.value).toFixed(2)))
const treatmentCharge = computed(() => { const rule = form.treatment && config.value.pricing.treatments?.[form.treatment]; return rule ? Number((unfoldAreaM2.value * Number(form.quantity || 0) * Number(rule.unitPricePerM2)).toFixed(2)) : 0 })
const glueCharge = computed(() => form.glue === '粘' ? Number((Number(form.quantity || 0) * Number(config.value.pricing.glue?.unitPricePerPiece ?? 0.05)).toFixed(2)) : 0)
const spotColorCharge = computed(() => Math.max(0, Math.floor(Number(form.spotColors) || 0)) * Number(config.value.pricing.spotColor?.plateFeePerColor ?? 150))
const goodsTotal = computed(() => Number((baseProductionAmount.value + treatmentCharge.value + glueCharge.value + spotColorCharge.value + processTotal.value).toFixed(2)))
const shippingFee = computed(() => goodsTotal.value >= Number(config.value.shipping.freeThreshold) ? 0 : Number(config.value.shipping.fee))
const total = computed(() => goodsTotal.value + shippingFee.value)
const displayed = computed(() => serverQuote.value || { unitPrice: Number((goodsTotal.value / Number(form.quantity || 1)).toFixed(2)), goodsTotal: goodsTotal.value, shippingFee: shippingFee.value, total: total.value })
const materialOptions = computed(() => config.value.pricing.materials.map(m => m.name))
const treatmentOptions = computed(() => Object.keys(config.value.pricing.treatments))
const processOptions = computed(() => Object.keys(config.value.pricing.processes))
const boxOptions = computed(() => shapeCatalog.value.map((shape) => { const asset = boxTypeAssets.find((item) => item.name === shape.name); return { ...shape, icon: asset?.icon, unfoldImage: asset?.unfoldImage || boxTypeAssets[boxTypeAssets.length - 1].unfoldImage } }))
const selectedBoxAsset = computed(() => selectedBoxType.value || boxOptions.value[0])
const heroProductImage = computed(() => selectedBoxAsset.value.unfoldImage)

function snapQuantity() {
  if (!quantityLocked.value) return
  const tiers = quantityTiers.value
  if (!tiers.some(t => t.quantity === Number(form.quantity))) form.quantity = tiers[0]?.quantity || 500
}
watch([quantityTiers, quantityLocked], snapQuantity)

function selectBoxType(name) {
  const selected = boxOptions.value.find((item) => item.name === name)
  if (!selected) return
  config.value.product.boxType = selected.name
  config.value.product.name = '卡纸盒 · ' + selected.name
  form.unfoldMode = selected.formulaText ? 'auto' : 'manual'
  form.unfoldLength = 0
  form.unfoldWidth = 0
  if (selected.params?.includes('thickness') && !form.thickness) form.thickness = 1.5
  if (selected.params?.includes('cover') && !form.cover) form.cover = 15
  serverQuote.value = null
  quoteRequested.value = false
}
function toggleProcess(name) {
  const index = form.processes.findIndex(item => item.name === name)
  if (index >= 0) form.processes.splice(index, 1)
  else form.processes.push({ name, graphicWidth: '', graphicHeight: '', times: '' })
}

function applyConfig(value) {
  configStore.apply(value)
  const tiers = [...(config.value.pricing.materials[0]?.quantityTiers ?? [])].sort((a, b) => a.quantity - b.quantity)
  form.quantity = Number(form.quantity) > 0 ? form.quantity : (tiers[0]?.quantity || 500)
  form.material = materialOptions.value.includes(form.material) ? form.material : materialOptions.value[0]
  form.treatment = treatmentOptions.value.includes(form.treatment) ? form.treatment : (treatmentOptions.value[0] || '')
  form.printMode = PRINT_MODES.includes(form.printMode) ? form.printMode : PRINT_MODES[0]
  form.printRequirement = printRequirementOptions.value.includes(form.printRequirement) ? form.printRequirement : (printRequirementOptions.value[0] || '正常')
  form.glue = GLUE_OPTIONS.includes(form.glue) ? form.glue : GLUE_OPTIONS[0]
  form.processes = form.processes.filter(item => processOptions.value.includes(item.name))
  snapQuantity()
}

let retried = false
async function loadRouteData() {
  apiError.value = ''; serverQuote.value = null; quoteRequested.value = false
  loading.value = true
  try { await configStore.loadStorefront(routeSlug.value); applyConfig(configStore.config) }
  catch (e) {
    // 后端偶发 500（如重启窗口/瞬时抖动）时自动重试一次，避免页面直接报错
    if (retried) throw e
    retried = true
    await new Promise(r => setTimeout(r, 800))
    await configStore.loadStorefront(routeSlug.value); applyConfig(configStore.config)
  }
  finally { loading.value = false }
}
watch(() => routeSlug.value, () => { if (String(route.name || '').startsWith('storefront')) loadRouteData() })

const quoteInput = () => ({ quantity: form.quantity, shapeId: selectedShape.value.id, boxVariant: form.boxVariant === 'keng' ? 'keng' : 'ka', finishedDimensions: selectedShape.value.formulaText ? { length:form.length, width:form.width, height:form.height, thickness:form.thickness, cover:form.cover } : null, dimensionMode:form.unfoldMode, unfoldedDimensions:unfolded.value, boxType:config.value.product.boxType, material:form.material, treatment:form.treatment, printMode:form.printMode, printRequirement:form.printRequirement, glue:form.glue, spotColors:form.spotColors, processes:form.processes.map(sel => ({ name: sel.name, graphicWidth: Number(sel.graphicWidth) || undefined, graphicHeight: Number(sel.graphicHeight) || undefined, times: Number(sel.times) || undefined })) })
const inputKey = () => JSON.stringify(quoteInput())
watch(() => [JSON.stringify(form), config.value.product.boxType], () => { serverQuote.value=null; quoteRequested.value=false; contactOpen.value=false; orderState.value='idle' }, {flush:'sync'})

async function requestQuote() { const key=inputKey(); apiError.value=''; serverQuote.value=null; quoteRequested.value=false; try { const result=await http.post('/storefront/'+routeSlug.value+'/quotes', quoteInput()); if(key!==inputKey()) return; serverQuote.value=result; quoteRequested.value=true } catch(e) {apiError.value=e.message} }

const contact = computed(() => config.value.contact || {})
const contactEntries = computed(() => config.value.contactEntries || [])
function safeContactUrl(value) { try { const url = new URL(value); return ['http:','https:','mqq:'].includes(url.protocol) ? url.href : '' } catch { return '' } }
const qqUrl = computed(() => safeContactUrl(contact.value.qqContactUrl) || (/^[1-9][0-9]{4,14}$/.test(contact.value.qq || '') ? 'https://wpa.qq.com/msgrd?v=3&uin='+contact.value.qq+'&site=qq&menu=yes' : ''))
const qrUrl = computed(() => contact.value.wechatQrUrl?.startsWith('/uploads/') ? new URL(contact.value.wechatQrUrl, new URL(configStore.apiBase, window.location.origin)).href : safeContactUrl(contact.value.wechatQrUrl))

const { copy } = useClipboard({ legacy: true })
async function copySummary() { try { await copy(checkoutSummary.value); copyMessage.value='完整报价已复制，请联系商家'; ElMessage.success('完整报价已复制，请联系商家') } catch { ElMessage.warning('未获得剪贴板权限，请选中下面文字手动复制') } }

async function createOrder() {
  if (orderState.value==='loading') return
  orderState.value='loading'; apiError.value=''
  const input=quoteInput(), key=inputKey()
  try {
    const result=await http.post('/storefront/'+routeSlug.value+'/quotes', input)
    if (inputKey()!==key) throw new Error('规格已改变，请重新获取报价')
    serverQuote.value=result; quoteRequested.value=true
    const price=n=>Number(n).toFixed(2), dims=result.unfoldedDimensions
    checkoutSummary.value=[
      '包装报价 · '+config.value.merchant.name,'盒型：'+input.boxType,
      ...(input.finishedDimensions ? ['成品尺寸：'+Object.values(input.finishedDimensions).join(' × ')+' mm'] : []),
      '展开尺寸：'+dims.length+' × '+dims.width+' mm','数量：'+input.quantity+' 个',
      '纸张材质：'+input.material,'表面处理：'+(input.treatment || '无'),'印刷面数：'+input.printMode,
      '印刷要求：'+input.printRequirement,'粘盒：'+input.glue,
      '基础生产金额：￥'+price(result.baseProductionAmount),
      ...(result.treatmentCharge ? ['表面处理（'+result.treatmentCharge.name+'）：￥'+price(result.treatmentCharge.amount)] : []),
      ...(result.glueCharge ? ['粘盒：￥'+price(result.glueCharge.amount)] : []),
      ...(result.spotColorCharge ? ['专色（'+result.spotColorCharge.count+'色）：￥'+price(result.spotColorCharge.amount)] : []),
      ...(result.processCharges || []).map(p=>p.name+'：￥'+price(p.amount)),
      '工艺合计：￥'+price(result.processTotal),'商品金额：￥'+price(result.goodsTotal),
      '运费：￥'+price(result.shippingFee),'最终价格：￥'+price(result.total)
    ].join('\n')
    contactOpen.value=true; await copySummary(); orderState.value='success'
  } catch(e) { apiError.value=e.message; orderState.value='error' }
}

  onMounted(loadRouteData)
  watch(() => routeSlug.value, () => { loadRouteData() })

  return {
    loading, apiError, quoteRequested, serverQuote, orderState, checkoutSummary, contactOpen, copyMessage,
    routeSlug, config, form,
    PRINT_MODES, printRequirementOptions, GLUE_OPTIONS, BOX_VARIANTS,
    brandLogo, brandSubtitle, shapeCatalog, selectedShape, selectedBoxType, unfolded, unfoldAreaM2,
    selectedMaterial, quantityTiers, quantityLocked, selectedPricingTier, sideFactor, requirementFactor,
    processCharges, processTotal, unitPrice, baseProductionAmount, treatmentCharge, glueCharge,
    spotColorCharge, goodsTotal, shippingFee, total, displayed,
    materialOptions, treatmentOptions, processOptions,
    boxOptions, selectedBoxAsset, heroProductImage,
    selectBoxType, toggleProcess, snapQuantity, requestQuote, createOrder, copySummary,
    contact, contactEntries, qqUrl, qrUrl, loadRouteData,
  }
}

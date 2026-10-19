import { ref } from 'vue'
import { defineStore } from 'pinia'
import { http, API_BASE } from '../api/client'

const clone = (value) => JSON.parse(JSON.stringify(value))

const defaults = {
  merchant: { name: '默认商户', slug: 'default', slogan: '专业包装 · 智能报价', logoUrl: '', brandSubtitle: '包装报价云' },
  product: { name: '卡纸盒 · 双插盒', boxType: '双插盒' },
  pricing: {
    quantityMode: 'custom',
    materials: [{ name: '350克富桂白卡', quantityTiers: [{ quantity: 1000, unitPricePerM2: 4.1, minimumCharge: 180 }, { quantity: 2000, unitPricePerM2: 3.8, minimumCharge: 260 }, { quantity: 3000, unitPricePerM2: 3.5, minimumCharge: 360 }, { quantity: 4000, unitPricePerM2: 3.3, minimumCharge: 500 }, { quantity: 5000, unitPricePerM2: 3, minimumCharge: 550 }, { quantity: 6000, unitPricePerM2: 2.9, minimumCharge: 600 }, { quantity: 7000, unitPricePerM2: 2.9, minimumCharge: 630 }, { quantity: 8000, unitPricePerM2: 2.9, minimumCharge: 680 }, { quantity: 9000, unitPricePerM2: 2.9, minimumCharge: 730 }, { quantity: 10000, unitPricePerM2: 2.7, minimumCharge: 780 }] }, { name: '400克富桂白卡', quantityTiers: [{ quantity: 1000, unitPricePerM2: 4.8, minimumCharge: 300 }, { quantity: 2000, unitPricePerM2: 4.05, minimumCharge: 400 }, { quantity: 3000, unitPricePerM2: 3.95, minimumCharge: 550 }, { quantity: 4000, unitPricePerM2: 3.8, minimumCharge: 680 }, { quantity: 5000, unitPricePerM2: 3.7, minimumCharge: 750 }, { quantity: 6000, unitPricePerM2: 3.6, minimumCharge: 790 }, { quantity: 7000, unitPricePerM2: 3.5, minimumCharge: 830 }, { quantity: 8000, unitPricePerM2: 3.4, minimumCharge: 860 }, { quantity: 9000, unitPricePerM2: 3.4, minimumCharge: 890 }, { quantity: 10000, unitPricePerM2: 3.3, minimumCharge: 920 }] }, { name: '300克白卡+白E坑', quantityTiers: [{ quantity: 500, unitPricePerM2: 8.4, minimumCharge: 580 }, { quantity: 1000, unitPricePerM2: 5.6, minimumCharge: 850 }, { quantity: 2000, unitPricePerM2: 5.1, minimumCharge: 1080 }, { quantity: 3000, unitPricePerM2: 4.6, minimumCharge: 1380 }, { quantity: 5000, unitPricePerM2: 4, minimumCharge: 1900 }, { quantity: 10000, unitPricePerM2: 3.9, minimumCharge: 3700 }] }, { name: '300克白卡+黄E坑', quantityTiers: [{ quantity: 500, unitPricePerM2: 8.4, minimumCharge: 580 }, { quantity: 1000, unitPricePerM2: 5.6, minimumCharge: 850 }, { quantity: 2000, unitPricePerM2: 5.1, minimumCharge: 1080 }, { quantity: 3000, unitPricePerM2: 4.6, minimumCharge: 1380 }, { quantity: 5000, unitPricePerM2: 4, minimumCharge: 1900 }, { quantity: 10000, unitPricePerM2: 3.9, minimumCharge: 3700 }] }, { name: '300克灰底白+白E坑', quantityTiers: [{ quantity: 500, unitPricePerM2: 8.4, minimumCharge: 580 }, { quantity: 1000, unitPricePerM2: 5.6, minimumCharge: 850 }, { quantity: 2000, unitPricePerM2: 5.1, minimumCharge: 1080 }, { quantity: 3000, unitPricePerM2: 4.6, minimumCharge: 1380 }, { quantity: 5000, unitPricePerM2: 4, minimumCharge: 1900 }, { quantity: 10000, unitPricePerM2: 3.9, minimumCharge: 3700 }] }, { name: '300克灰底白+黄E坑', quantityTiers: [{ quantity: 500, unitPricePerM2: 8.4, minimumCharge: 580 }, { quantity: 1000, unitPricePerM2: 5.6, minimumCharge: 850 }, { quantity: 2000, unitPricePerM2: 5.1, minimumCharge: 1080 }, { quantity: 3000, unitPricePerM2: 4.6, minimumCharge: 1380 }, { quantity: 5000, unitPricePerM2: 4, minimumCharge: 1900 }, { quantity: 10000, unitPricePerM2: 3.9, minimumCharge: 3700 }] }, { name: '375银卡', quantityTiers: [{ quantity: 1000, unitPricePerM2: 6.1, minimumCharge: 360 }, { quantity: 2000, unitPricePerM2: 5, minimumCharge: 510 }, { quantity: 3000, unitPricePerM2: 4.7, minimumCharge: 600 }, { quantity: 4000, unitPricePerM2: 4.3, minimumCharge: 650 }, { quantity: 5000, unitPricePerM2: 4.08, minimumCharge: 750 }, { quantity: 6000, unitPricePerM2: 4, minimumCharge: 880 }, { quantity: 7000, unitPricePerM2: 3.9, minimumCharge: 1050 }, { quantity: 8000, unitPricePerM2: 3.8, minimumCharge: 1100 }, { quantity: 9000, unitPricePerM2: 3.6, minimumCharge: 1150 }, { quantity: 10000, unitPricePerM2: 3.3, minimumCharge: 1200 }] }, { name: '375素面镭射银', quantityTiers: [{ quantity: 1000, unitPricePerM2: 7.3, minimumCharge: 420 }, { quantity: 2000, unitPricePerM2: 6.2, minimumCharge: 600 }, { quantity: 3000, unitPricePerM2: 5.3, minimumCharge: 680 }, { quantity: 4000, unitPricePerM2: 4.8, minimumCharge: 780 }, { quantity: 5000, unitPricePerM2: 4.3, minimumCharge: 820 }, { quantity: 6000, unitPricePerM2: 4.1, minimumCharge: 880 }, { quantity: 7000, unitPricePerM2: 3.9, minimumCharge: 980 }, { quantity: 8000, unitPricePerM2: 3.8, minimumCharge: 1080 }, { quantity: 9000, unitPricePerM2: 3.7, minimumCharge: 1180 }, { quantity: 10000, unitPricePerM2: 3.6, minimumCharge: 1280 }] }],
    treatments: { '光胶': { unitPricePerM2: 0 }, '哑胶': { unitPricePerM2: 0 }, '不过胶': { unitPricePerM2: 0 } },
    processes: { '击凸': { billingMode: 'area', setupFee: 200, unitPrice: 0.1 }, '击凹': { billingMode: 'area', setupFee: 200, unitPrice: 0.1 }, '烫金': { billingMode: 'area', setupFee: 200, unitPrice: 0.1 }, '烫银': { billingMode: 'area', setupFee: 200, unitPrice: 0.1 }, '丝印UV': { billingMode: 'times', setupFee: 200, unitPrice: 0.1 }, '贴窗口': { billingMode: 'area', setupFee: 200, unitPrice: 0.1 } },
    print: { doubleSidedSurcharge: 0.6 },
    requirements: { list: [{ name: '电脑色正常4色印', rate: 0 }, { name: '有样板跟色', rate: 0 }, { name: '通知客户看色', rate: 0 }] },
    glue: { unitPricePerPiece: 0 },
    spotColor: { plateFeePerColor: 300 },
  },
  shipping: { freeThreshold: 0, fee: 0 },
  contact: {},
  contactEntries: [],
  storefrontLayout: 'b',
  storefrontTheme: 'green',
  topbarLinks: [],
  contentBlocks: [],
}

export function normalizeConfig(value) {
  const source = value || {}
  const pricing = { ...clone(defaults.pricing), ...(source.pricing || {}) }
  pricing.materials = source.pricing?.materials?.length ? clone(source.pricing.materials) : clone(defaults.pricing.materials)
  pricing.treatments = source.pricing?.treatments && Object.keys(source.pricing.treatments).length ? source.pricing.treatments : clone(defaults.pricing.treatments)
  pricing.processes = source.pricing?.processes && Object.keys(source.pricing.processes).length ? source.pricing.processes : clone(defaults.pricing.processes)
  pricing.print = { ...defaults.pricing.print, ...(source.pricing?.print || {}) }
  pricing.requirements = source.pricing?.requirements?.list?.length ? { list: clone(source.pricing.requirements.list) } : clone(defaults.pricing.requirements)
  pricing.glue = { ...defaults.pricing.glue, ...(source.pricing?.glue || {}) }
  pricing.spotColor = { ...defaults.pricing.spotColor, ...(source.pricing?.spotColor || {}) }
  return {
    ...clone(defaults), ...source,
    storefrontLayout: ['a', 'b', 'c'].includes(source?.storefrontLayout) ? source.storefrontLayout : defaults.storefrontLayout,
    storefrontTheme: ['green', 'blue', 'orange', 'red', 'purple', 'teal', 'brown', 'graphite'].includes(source?.storefrontTheme) ? source.storefrontTheme : defaults.storefrontTheme,
    merchant: { ...defaults.merchant, ...(source.merchant || {}) },
    product: { ...defaults.product, ...(source.product || {}) },
    pricing,
    shipping: { ...defaults.shipping, ...(source.shipping || {}) },
    contact: { ...defaults.contact, ...(source.contact || {}) },
  }
}

export const useConfigStore = defineStore('config', () => {
  // 用 ref 持有配置，apply 时整体替换——避免浅跟踪导致的 '改了不生效'
  const config = ref(normalizeConfig(null))
  /** 前台不存在或已停用（404）：前台据此显示整页遮罩 */
  const unavailable = ref(false)

  function apply(value) { config.value = normalizeConfig(value); return config.value }

  async function loadStorefront(slug) {
    unavailable.value = false
    try {
      return apply(await http.get('/storefront/' + encodeURIComponent(slug) + '/config'))
    } catch (e) {
      const msg = String(e?.message || '')
      if (msg.includes('不存在或已停用') || msg.includes('Not Found')) unavailable.value = true
      throw e
    }
  }
  async function loadAdmin(slug) { return apply(await http.get('/merchant/' + encodeURIComponent(slug) + '/config')) }
  async function save(slug, patch) { return apply(await http.patch('/merchant/' + encodeURIComponent(slug) + '/config', patch)) }

  return { config, unavailable, apiBase: API_BASE, apply, loadStorefront, loadAdmin, save }
})

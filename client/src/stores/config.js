import { ref } from 'vue'
import { defineStore } from 'pinia'
import { http, API_BASE } from '../api/client'

const clone = (value) => JSON.parse(JSON.stringify(value))

const defaults = {
  merchant: { name: '默认商户', slug: 'default', slogan: '专业包装 · 智能报价', logoUrl: '', brandSubtitle: '包装报价云' },
  product: { name: '卡纸盒 · 双插盒', boxType: '双插盒' },
  pricing: {
    quantityMode: 'custom',
    materials: [{ name: '350克白卡', quantityTiers: [{ quantity: 500, unitPricePerM2: 8.4, minimumCharge: 580 }, { quantity: 1000, unitPricePerM2: 5.6, minimumCharge: 850 }, { quantity: 2000, unitPricePerM2: 5.1, minimumCharge: 1080 }, { quantity: 3000, unitPricePerM2: 4.6, minimumCharge: 1380 }, { quantity: 5000, unitPricePerM2: 4, minimumCharge: 1900 }, { quantity: 10000, unitPricePerM2: 3.9, minimumCharge: 3700 }] }],
    treatments: { '哑胶': { unitPricePerM2: 0.2 }, '光胶': { unitPricePerM2: 0.2 }, '逆向 UV': { unitPricePerM2: 0.2 } },
    processes: { '烫金': { billingMode: 'area', setupFee: 150, unitPrice: 0.1 }, '烫银': { billingMode: 'area', setupFee: 150, unitPrice: 0.1 }, '击凸': { billingMode: 'area', setupFee: 150, unitPrice: 0.1 }, '丝印UV': { billingMode: 'area', setupFee: 150, unitPrice: 0.1 }, '贴窗口': { billingMode: 'area', setupFee: 150, unitPrice: 0.1 } },
    print: { doubleSidedSurcharge: 0.6 },
    requirements: { list: [{ name: '正常', rate: 0 }, { name: '跟色', rate: 0.08 }, { name: '打样', rate: 0.1 }] },
    glue: { unitPricePerPiece: 0.05 },
    spotColor: { plateFeePerColor: 150 },
  },
  shipping: { freeThreshold: 1000, fee: 18 },
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

  function apply(value) { config.value = normalizeConfig(value); return config.value }

  async function loadStorefront(slug) { return apply(await http.get('/storefront/' + encodeURIComponent(slug) + '/config')) }
  async function loadAdmin(slug) { return apply(await http.get('/merchant/' + encodeURIComponent(slug) + '/config')) }
  async function save(slug, patch) { return apply(await http.patch('/merchant/' + encodeURIComponent(slug) + '/config', patch)) }

  return { config, apiBase: API_BASE, apply, loadStorefront, loadAdmin, save }
})

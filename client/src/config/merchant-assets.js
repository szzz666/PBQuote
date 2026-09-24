/** Local presentation assets only; merchant identity comes from API configuration. */
const base = '/merchant/default/'
const boxBase = base + 'box-types/'

export const boxTypeAssets = Object.freeze([
  { name: '双插盒', icon: boxBase + 'double-insert.png', unfoldImage: boxBase + 'double-insert-dieline.jpg' },
  { name: '锁底盒', icon: boxBase + 'lock-bottom.png', unfoldImage: boxBase + 'lock-bottom-dieline.jpeg' },
  { name: '自动锁底盒', icon: boxBase + 'auto-lock-bottom.png', unfoldImage: boxBase + 'auto-lock-bottom-dieline.jpeg' },
  { name: '平粘盒', icon: boxBase + 'flat-glue.png', unfoldImage: boxBase + 'flat-glue-dieline.jpeg' },
  { name: '一体成型盒', icon: boxBase + 'integrated.png', unfoldImage: boxBase + 'integrated-dieline.jpeg' },
  { name: '抽屉盒', icon: boxBase + 'drawer.png', unfoldImage: boxBase + 'drawer-dieline.gif' },
  { name: '天地盒', icon: boxBase + 'lid-base.png', unfoldImage: boxBase + 'lid-base-dieline.gif' },
  { name: '吊口盒', icon: boxBase + 'hanging.png', unfoldImage: boxBase + 'hanging-dieline.png' },
  { name: '封套及特殊', icon: boxBase + 'sleeve-special.png', unfoldImage: boxBase + 'sleeve-special-dieline.jpeg' },
  { name: '自定义盒型', icon: boxBase + 'custom.png', unfoldImage: boxBase + 'custom-dieline.jpeg' },
])

export const merchantAssets = Object.freeze({
  logo: base + 'logo.png',
  product: base + 'folding-box.jpg',
  content: Object.freeze([base + 'folding-box-detail-1.jpg', base + 'folding-box-detail-2.jpg']),
  manifest: base + 'manifest.json',
})

export const merchantPresentation = Object.freeze({
  merchantName: '默认商户',
  logo: merchantAssets.logo,
  logoAlt: '商户标志',
  productName: '包装产品',
  productImage: merchantAssets.product,
  productImageAlt: '包装产品示意图',
  contentImages: Object.freeze(merchantAssets.content.map((src, index) => Object.freeze({ src, alt: '产品详情 ' + (index + 1) }))),
})

export default merchantPresentation

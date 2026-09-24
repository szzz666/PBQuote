/**
 * 盒形展开尺寸公式（前端镜像）。
 * 与 server/src/box-shapes.ts 保持一致，服务端报价时以其自身公式为准。
 * 卡盒=unfold；坑盒=unfoldKeng（坑厚固定常量 3mm，粘口 15→30，插舌/翼片计入 2×3）。
 * 单位：毫米；变量：length=成品长，width=成品宽，height=成品高，thickness=纸板厚，cover=盖高。
 */
const round = (v) => Math.round(v * 100) / 100
const n = (v, fallback = 0) => (Number.isFinite(Number(v)) ? Number(v) : fallback)
const KENG_T = 3

export const boxShapes = [
  {
    id: 'double-insert',
    name: '双插盒',
    description: '两侧插耳成型的经典卡盒，结构简单、装盒方便。',
    params: [
      { key: 'length', label: '成品长' },
      { key: 'width', label: '成品宽' },
      { key: 'height', label: '成品高' },
    ],
    formulaText: { length: '(成品长 + 成品宽) × 2 + 15（粘口）', width: '成品高 + 成品宽 × 2 + 30' },
    formulaTextKeng: { length: '(成品长 + 成品宽) × 2 + 20（坑盒粘口，参考分享印 双插盒_微坑）', width: '成品高 + 成品宽 × 2 + 40（插舌）' },
    unfold: d => ({ length: (d.length + d.width) * 2 + 15, width: d.height + d.width * 2 + 30 }),
    unfoldKeng: d => ({ length: (d.length + d.width) * 2 + 20, width: d.height + d.width * 2 + 40 }),
  },
  {
    id: 'lock-bottom',
    name: '锁底盒',
    description: '底部锁合结构，承重更好，适合较重的产品。',
    params: [
      { key: 'length', label: '成品长' },
      { key: 'width', label: '成品宽' },
      { key: 'height', label: '成品高' },
    ],
    formulaText: { length: '(成品长 + 成品宽) × 2 + 15（粘口）', width: 'max(15 + 成品宽 + 成品高 + 0.18×成品长 + 0.12×成品宽 + 10, 15 + 成品宽 + 成品高 + 成品宽÷2 + 成品宽÷4)' },
    formulaTextKeng: { length: '(成品长 + 成品宽) × 2 + 20（坑盒粘口，参考分享印 锁底盒_微坑）', width: 'max(20 + 成品宽 + 成品高 + 0.18×成品长 + 0.12×成品宽 + 10, 20 + 成品宽 + 成品高 + 成品宽÷2 + 成品宽÷4)' },
    unfold: d => ({ length: (d.length + d.width) * 2 + 15, width: Math.max(15 + d.width + d.height + 0.18 * d.length + 0.12 * d.width + 10, 15 + d.width + d.height + d.width / 2 + d.width / 4) }),
    unfoldKeng: d => ({ length: (d.length + d.width) * 2 + 20, width: Math.max(20 + d.width + d.height + 0.18 * d.length + 0.12 * d.width + 10, 20 + d.width + d.height + d.width / 2 + d.width / 4) }),
  },
  {
    id: 'auto-lock-bottom',
    name: '自动锁底盒',
    description: '底部预粘、压盒即自动弹开成型，适合自动化包装线。',
    params: [
      { key: 'length', label: '成品长' },
      { key: 'width', label: '成品宽' },
      { key: 'height', label: '成品高' },
    ],
    formulaText: { length: '(成品长 + 成品宽) × 2 + 15（粘口）', width: '成品高 + 成品宽 + 成品宽÷2 × 1.4 + 15' },
    formulaTextKeng: { length: '(成品长 + 成品宽) × 2 + 20（坑盒粘口；站点无自动锁底坑盒数据，按同目录规律）', width: '成品高 + 成品宽 + 成品宽÷2 × 1.4 + 40' },
    unfold: d => ({ length: (d.length + d.width) * 2 + 15, width: d.height + d.width + (d.width / 2) * 1.4 + 15 }),
    unfoldKeng: d => ({ length: (d.length + d.width) * 2 + 20, width: d.height + d.width + (d.width / 2) * 1.4 + 40 }),
  },
  {
    id: 'flat-glue',
    name: '平粘盒',
    description: '整片平贴成型，结构简洁，常用于服装、食品包装。',
    params: [
      { key: 'length', label: '成品长' },
      { key: 'width', label: '成品宽' },
      { key: 'height', label: '成品高' },
    ],
    formulaText: { length: '(成品长 + 成品宽) × 2 + 15（粘口）', width: '成品高 + 成品宽 × 2' },
    formulaTextKeng: { length: '(成品长 + 成品宽) × 2 + 20（坑盒粘口，参考分享印 平口盒_微坑）', width: '成品高 + 成品宽' },
    unfold: d => ({ length: (d.length + d.width) * 2 + 15, width: d.height + d.width * 2 }),
    unfoldKeng: d => ({ length: (d.length + d.width) * 2 + 20, width: d.height + d.width }),
  },
  {
    id: 'lid-base',
    name: '天地盒',
    description: '天盖 + 地盒的分离结构，常用于礼盒，需填写纸板厚与盖高。',
    params: [
      { key: 'length', label: '成品长' },
      { key: 'width', label: '成品宽' },
      { key: 'height', label: '成品高' },
      { key: 'thickness', label: '纸板厚', defaultValue: 1.5 },
      { key: 'cover', label: '盖高', defaultValue: 15 },
    ],
    formulaText: { length: '成品宽 × 2 + 盖高 × 4 + 成品高 × 4 + 纸板厚 × 2 + 80', width: 'max(成品高 × 4 + 成品长 + 纸板厚 × 2 + 30, 成品长 + 成品宽 + 30)' },
    formulaTextKeng: { length: '成品宽 × 2 + 盖高 × 4 + 成品高 × 4 + 2×3（坑厚）+ 80', width: 'max(成品高 × 4 + 成品长 + 2×3 + 30, 成品长 + 成品宽 + 30)' },
    unfold: d => ({ length: d.width * 2 + n(d.cover) * 4 + d.height * 4 + n(d.thickness) * 2 + 80, width: Math.max(d.height * 4 + d.length + n(d.thickness) * 2 + 30, d.length + d.width + 30) }),
    unfoldKeng: d => ({ length: d.width * 2 + n(d.cover) * 4 + d.height * 4 + 2 * KENG_T + 80, width: Math.max(d.height * 4 + d.length + 2 * KENG_T + 30, d.length + d.width + 30) }),
  },
  {
    id: 'drawer',
    name: '抽屉盒',
    description: '抽拉式结构（外套 + 内屉），需填写纸板厚。',
    params: [
      { key: 'length', label: '成品长' },
      { key: 'width', label: '成品宽' },
      { key: 'height', label: '成品高' },
      { key: 'thickness', label: '纸板厚', defaultValue: 1.5 },
    ],
    formulaText: { length: '成品高 × 5 + 纸板厚 × 2 + 成品宽 + 成品长 + 65', width: '成品高 × 4 + 纸板厚 × 2 + 成品长 + 30' },
    formulaTextKeng: { length: '成品高 × 5 + 2×3 + 成品宽 + 成品长 + 70', width: '成品高 × 4 + 2×3 + 成品长 + 35' },
    unfold: d => ({ length: d.height * 5 + n(d.thickness) * 2 + d.width + d.length + 65, width: d.height * 4 + n(d.thickness) * 2 + d.length + 30 }),
    unfoldKeng: d => ({ length: d.height * 5 + 2 * KENG_T + d.width + d.length + 70, width: d.height * 4 + 2 * KENG_T + d.length + 35 }),
  },
  {
    id: 'integrated',
    name: '一体成型盒',
    description: '一纸成型无需组装内托，展开后直接折叠成盒。',
    params: [
      { key: 'length', label: '成品长' },
      { key: 'width', label: '成品宽' },
      { key: 'height', label: '成品高' },
    ],
    formulaText: { length: 'max(成品长 + 成品高 × 4, 成品长 + 成品宽 × 2÷3)', width: '成品宽 × 2 + 成品高 × 3' },
    formulaTextKeng: { length: 'max(成品长 + 成品高 × 4 + 13, 成品长 + 成品宽 × 2÷3)（参考分享印 一体成型盒_微坑）', width: '成品宽 × 2 + 成品高 × 3' },
    unfold: d => ({ length: Math.max(d.length + d.height * 4, d.length + (d.width * 2) / 3), width: d.width * 2 + d.height * 3 }),
    unfoldKeng: d => ({ length: Math.max(d.length + d.height * 4 + 13, d.length + (d.width * 2) / 3), width: d.width * 2 + d.height * 3 }),
  },
]

export const CUSTOM_SHAPE = { id: 'custom', name: '自定义盒型', description: '已有展开图或特殊结构，手动填写展开尺寸。', params: [], formulaText: null, formulaTextKeng: null }

export function findBoxShape(idOrName) {
  if (!idOrName) return undefined
  return boxShapes.find(s => s.id === idOrName || s.name === idOrName)
}

/** variant: 'ka' 卡盒（默认） / 'keng' 坑盒 */
export function computeUnfolded(shapeId, dims, variant = 'ka') {
  const shape = findBoxShape(shapeId)
  if (!shape) throw new Error('未知盒形：' + shapeId)
  const merged = { ...dims, thickness: n(dims.thickness, 1.5), cover: n(dims.cover, 15) }
  const fn = variant === 'keng' && shape.unfoldKeng ? shape.unfoldKeng : shape.unfold
  return { length: round(fn(merged).length), width: round(fn(merged).width) }
}

export const boxShapeCatalog = () => boxShapes.map(s => ({ id: s.id, name: s.name, description: s.description, params: s.params, formulaText: s.formulaText, formulaTextKeng: s.formulaTextKeng ?? null }))

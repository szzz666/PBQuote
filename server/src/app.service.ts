import { BadRequestException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DatabaseService } from './database.service';
import { computeUnfolded, findBoxShape } from './box-shapes';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { logoExtension, assetExtension, UPLOADS_ROOT } from './merchant-logo';
import type { LogoFile } from './merchant-logo';

/** 数量阶梯：quantity 为档位起点（区间匹配，数量 ≥ 起点取该档单价） */
interface Tier { quantity: number; unitPricePerM2: number; minimumCharge: number }
/** 材质：每种纸张一套独立数量阶梯 */
interface MaterialPricing { name: string; quantityTiers: Tier[] }
/** 工艺：area=按图形面积(前台输入宽×高) / times=按次(前台输入次数) / piece=按个 */
interface ProcessRule { billingMode: 'area' | 'piece' | 'times'; setupFee: number; unitPrice: number }
/** 表面处理：按 展开总面积㎡ × 单价 */
interface TreatmentRule { unitPricePerM2: number }
interface PrintRequirement { name: string; rate: number }

interface Pricing {
  /** 数量输入方式：options=仅可选档位 / custom=允许客户填写 */
  quantityMode: 'options' | 'custom';
  materials: MaterialPricing[];
  treatments: Record<string, TreatmentRule>;
  processes: Record<string, ProcessRule>;
  print: { doubleSidedSurcharge: number };
  requirements: { list: PrintRequirement[] };
  glue: { unitPricePerPiece: number };
  spotColor: { plateFeePerColor: number };
}

const defaultTiers: Tier[] = [
  { quantity: 500, unitPricePerM2: 8.4, minimumCharge: 580 },
  { quantity: 1000, unitPricePerM2: 5.6, minimumCharge: 850 },
  { quantity: 2000, unitPricePerM2: 5.1, minimumCharge: 1080 },
  { quantity: 3000, unitPricePerM2: 4.6, minimumCharge: 1380 },
  { quantity: 5000, unitPricePerM2: 4, minimumCharge: 1900 },
  { quantity: 10000, unitPricePerM2: 3.9, minimumCharge: 3700 },
];
const defaultMaterialNames = ['350克白卡'];
const defaultTreatmentNames = ['哑胶', '光胶', '逆向 UV'];
const defaultProcessNames = ['烫金', '烫银', '击凸', '丝印UV', '贴窗口'];
const money = (n: number) => Number(n.toFixed(2));
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));
/** 安全链接：http/https，或 / 开头的站内路径（含 /uploads/）。拒绝 javascript:/data://// 等 */
const safeWebUrl = (url: string) => {
  const u = String(url || '').trim();
  if (!u) return false;
  if (u.startsWith('/') && !u.startsWith('//') && !u.startsWith('/\\')) return true;
  return u.startsWith('http://') || u.startsWith('https://');
};
const CANVAS_W = 1200; // 推荐内容区设计稿宽度（px），前端按容器等比缩放
const REGION_W = { top: CANVAS_W, bottom: CANVAS_W, left: 260, right: 260 } as Record<string, number>;

const defaultPrintRequirements: PrintRequirement[] = [
  { name: '正常', rate: 0 },
  { name: '跟色', rate: 0.08 },
  { name: '打样', rate: 0.1 },
];

const defaultPricing: Pricing = {
  quantityMode: 'custom',
  materials: defaultMaterialNames.map(name => ({ name, quantityTiers: clone(defaultTiers) })),
  treatments: Object.fromEntries(defaultTreatmentNames.map(n => [n, { unitPricePerM2: 0.2 }])),
  processes: Object.fromEntries(defaultProcessNames.map(n => [n, { billingMode: 'area', setupFee: 150, unitPrice: 0.1 }])),
  print: { doubleSidedSurcharge: 0.6 },
  requirements: { list: clone(defaultPrintRequirements) },
  glue: { unitPricePerPiece: 0.05 },
  spotColor: { plateFeePerColor: 150 },
};

const seed: any = {
  merchant: { name: process.env.MERCHANT_NAME || '示例商户', slug: process.env.MERCHANT_SLUG || 'default', slogan: '专业包装 · 智能报价' },
  product: { name: '卡纸盒 · 双插盒', boxType: '双插盒' },
  pricing: defaultPricing,
  shipping: { freeThreshold: 1000, fee: 18 },
  contact: {},
  contactEntries: [],
  topbarLinks: [],
  contentBlocks: [],
};

@Injectable() export class AppService {
  private readonly configs = new Map<string, any>([[seed.merchant.slug, structuredClone(seed)]]);
  private readonly carts = new Map<string, any>();
  private readonly orders = new Map<string, any>();
  constructor(@Optional() private readonly database?: DatabaseService) {}

  health() { return { status: 'ok', service: 'pbquote-api', database: this.database?.configured ? 'mysql' : 'mysql-pending' } }
  async listMerchants() { return this.database?.listMerchants() ?? [] }

  async uploadLogo(slug: string, file?: LogoFile) {
    if (!/^[a-z0-9][a-z0-9-]{0,62}$/.test(slug)) throw new BadRequestException('商家标识无效');
    await this.getAdminConfig(slug);
    const ext = logoExtension(file);
    const directory = join(UPLOADS_ROOT, 'merchants', slug);
    await mkdir(directory, { recursive: true });
    const filename = randomUUID() + '.' + ext;
    await writeFile(join(directory, filename), file!.buffer, { flag: 'wx' });
    return { logoUrl: '/uploads/merchants/' + slug + '/' + filename };
  }

  /** 通用图片资源上传（前台定制用），字段 image，上限 1 MiB，返回 /uploads/ 路径 */
  async uploadAsset(slug: string, file?: LogoFile) {
    if (!/^[a-z0-9][a-z0-9-]{0,62}$/.test(slug)) throw new BadRequestException('商家标识无效');
    await this.getAdminConfig(slug);
    const ext = assetExtension(file);
    const directory = join(UPLOADS_ROOT, 'merchants', slug);
    await mkdir(directory, { recursive: true });
    const filename = randomUUID() + '.' + ext;
    await writeFile(join(directory, filename), file!.buffer, { flag: 'wx' });
    return { url: '/uploads/merchants/' + slug + '/' + filename };
  }

  async getConfig(slug: string) {
    const p: any = await this.database?.loadConfig(slug);
    if (this.database?.configured && !p) throw new NotFoundException('商家前台不存在或已停用');
    const c = p || this.configs.get(slug);
    if (!c) throw new NotFoundException('商家前台不存在');
    const n = this.normalize(c);
    this.configs.set(slug, n);
    return n;
  }

  async getAdminConfig(slug: string) {
    const p: any = await this.database?.loadConfigAdmin(slug);
    const c = p || this.configs.get(slug);
    if (!c) throw new NotFoundException('商家不存在');
    return this.normalize(c);
  }

  /** 归一化：pricing 迁移到新结构，并派生前台需要的只读列表（材质名、档位、工艺名、表面处理名） */
  private normalize(c: any) {
    const storefrontLayout = ['a', 'b', 'c'].includes(c?.storefrontLayout) ? c.storefrontLayout : 'b';
    const pricing = this.validPricing(c.pricing) ? this.migratePricing(c.pricing, c) : clone(defaultPricing);
    const { materials, quantities, treatments, processes, ...rest } = c;
    return {
      ...rest,
      storefrontLayout,
      storefrontTheme: ['green', 'blue', 'orange', 'red', 'purple', 'teal', 'brown', 'graphite'].includes(c?.storefrontTheme) ? c.storefrontTheme : 'green',
      contactEntries: Array.isArray(c?.contactEntries) ? c.contactEntries : [],
      topbarLinks: Array.isArray(c?.topbarLinks) ? c.topbarLinks : [],
      contentBlocks: Array.isArray(c?.contentBlocks) ? c.contentBlocks : [],
      pricing,
      materials: pricing.materials.map((m: MaterialPricing) => m.name),
      quantities: pricing.materials[0]?.quantityTiers.map((t: Tier) => t.quantity) ?? [],
      treatments: Object.keys(pricing.treatments),
      processes: Object.keys(pricing.processes),
    };
  }

  private validPricing(p: any) {
    if (!p) return false;
    const hasMaterials = Array.isArray(p.materials) && p.materials.length > 0;
    const hasLegacyTiers = Array.isArray(p.quantityTiers) && p.quantityTiers.length > 0;
    if (!hasMaterials && !hasLegacyTiers) return false;
    if (!p.processes || typeof p.processes !== 'object') return false;
    try { this.validatePricing(this.migratePricing(p, p)); return true } catch { return false }
  }

  /** 旧结构（全局 quantityTiers + 字符串材质列表）→ 新结构（每材质一套阶梯） */
  private migratePricing(p: any, ctx: any): Pricing {
    const legacyTiers: Tier[] = Array.isArray(p.quantityTiers) && p.quantityTiers.length ? p.quantityTiers : clone(defaultTiers);
    const tierSource = (t: any): Tier[] => (Array.isArray(t) && t.length ? t : clone(legacyTiers));
    let materials: MaterialPricing[];
    if (p.materials !== undefined && (!Array.isArray(p.materials) || !p.materials.length)) throw new Error('材质阶梯无效');
    if (Array.isArray(p.materials) && p.materials.length) {
      materials = p.materials.map((m: any) => ({ name: String(m?.name ?? m), quantityTiers: tierSource(m?.quantityTiers) }));
    } else {
      const names: string[] = Array.isArray(ctx?.materials) && ctx.materials.length ? ctx.materials.map(String) : clone(defaultMaterialNames);
      materials = names.map(name => ({ name, quantityTiers: clone(legacyTiers) }));
    }
    const treatmentNames: string[] = p.treatments && Object.keys(p.treatments).length ? Object.keys(p.treatments)
      : (Array.isArray(ctx?.treatments) && ctx.treatments.length ? ctx.treatments.map(String) : clone(defaultTreatmentNames));
    const treatments: Record<string, TreatmentRule> = Object.fromEntries(treatmentNames.map(n => {
      const r = p.treatments?.[n];
      return [n, { unitPricePerM2: Number(r?.unitPricePerM2 ?? 0.2) }];
    }));
    const processes: Record<string, ProcessRule> = {};
    const processNames = p.processes && Object.keys(p.processes).length ? Object.keys(p.processes) : clone(defaultProcessNames);
    for (const n of processNames) {
      const r = p.processes?.[n] ?? {};
      const mode = r.billingMode === 'quantity' ? 'piece' : (['area', 'piece', 'times'].includes(r.billingMode) ? r.billingMode : 'area');
      processes[n] = { billingMode: mode as ProcessRule['billingMode'], setupFee: Number(r.setupFee ?? 150), unitPrice: Number(r.unitPrice ?? 0.1) };
    }
    return {
      quantityMode: p.quantityMode === 'options' ? 'options' : 'custom',
      materials,
      treatments,
      processes,
      print: { doubleSidedSurcharge: Number(p.print?.doubleSidedSurcharge ?? 0.6) },
      requirements: { list: this.migratePrintRequirements(p.requirements) },
      glue: { unitPricePerPiece: Number(p.glue?.unitPricePerPiece ?? 0.05) },
      spotColor: { plateFeePerColor: Number(p.spotColor?.plateFeePerColor ?? 150) },
    };
  }

  private migratePrintRequirements(req?: any): PrintRequirement[] {
    if (Array.isArray(req?.list) && req.list.length) return req.list.map((x: any) => ({ name: String(x?.name ?? '').trim() || '正常', rate: Number(x?.rate ?? 0) }));
    const oldFollow = req?.followColorSurchargeRate;
    return clone(defaultPrintRequirements).map((r) => (r.name === '跟色' && oldFollow !== undefined ? { ...r, rate: Number(oldFollow) } : r));
  }

  private validatePricing(p: Pricing) {
    if (p.quantityMode !== undefined && !['options', 'custom'].includes(p.quantityMode)) throw new Error('数量输入方式无效');
    if (!Array.isArray(p.materials) || !p.materials.length) throw new Error('材质阶梯无效');
    const names = p.materials.map(m => String(m?.name ?? '').trim());
    if (names.some(n => !n) || new Set(names).size !== names.length) throw new Error('材质名称不能重复或为空');
    for (const m of p.materials) {
      const tiers = m.quantityTiers;
      if (!Array.isArray(tiers) || !tiers.length || new Set(tiers.map((x: any) => x.quantity)).size !== tiers.length) throw new Error('数量阶梯无效');
      for (const x of tiers) {
        if (!Number.isSafeInteger(x.quantity) || x.quantity <= 0 || ![x.unitPricePerM2, x.minimumCharge].every((v: any) => Number.isFinite(v) && v >= 0)) throw new Error('数量价格无效');
      }
    }
    for (const [n, t] of Object.entries(p.treatments ?? {})) {
      if (!n || !Number.isFinite((t as any)?.unitPricePerM2) || (t as any).unitPricePerM2 < 0) throw new Error('表面处理价格无效');
    }
    for (const [n, r] of Object.entries(p.processes ?? {})) {
      if (!n || !['area', 'piece', 'times'].includes((r as any)?.billingMode) || ![(r as any).setupFee, (r as any).unitPrice].every((v: any) => Number.isFinite(v) && v >= 0)) throw new Error('工艺价格无效');
    }
    const list = p.requirements?.list;
    if (!Array.isArray(list) || !list.length) throw new Error('印刷要求列表无效');
    const reqNames = list.map((x: any) => String(x?.name ?? '').trim());
    if (reqNames.some((n: string) => !n) || new Set(reqNames).size !== reqNames.length) throw new Error('印刷要求不能重复或为空');
    for (const x of list) if (!Number.isFinite(Number(x.rate)) || Number(x.rate) < 0) throw new Error('印刷要求系数无效');
    const nums: [string, any][] = [
      ['双面加收系数', p.print?.doubleSidedSurcharge],
      ['糊盒单价', p.glue?.unitPricePerPiece],
      ['专色版费', p.spotColor?.plateFeePerColor],
    ];
    for (const [label, v] of nums) if (!Number.isFinite(Number(v)) || Number(v) < 0) throw new Error(label + '无效');
  }

  private validateCustomization(patch: any) {
    if (patch.topbarLinks !== undefined) {
      if (!Array.isArray(patch.topbarLinks) || patch.topbarLinks.length > 6) throw new Error('顶栏链接最多 6 个');
      for (const l of patch.topbarLinks) {
        const name = String(l?.name ?? '').trim();
        const url = String(l?.url ?? '').trim();
        if (!name) throw new Error('顶栏链接名称不能为空');
        if (name.length > 30) throw new Error('顶栏链接名称不能超过 30 字');
        if (!url) throw new Error('顶栏链接地址不能为空');
        if (!safeWebUrl(url)) throw new Error('顶栏链接仅支持 http/https 或站内路径');
      }
    }
    if (patch.contentBlocks !== undefined) {
      const list = patch.contentBlocks;
      if (!Array.isArray(list)) throw new Error('内容块无效');
      if (list.length > 50) throw new Error('内容块最多 50 个');
      for (const b of list) {
        if (!b?.id || typeof b.id !== 'string') throw new Error('内容块标识无效');
        const x = Number(b?.x ?? 0), y = Number(b?.y ?? 0), w = Number(b?.w ?? 0), h = Number(b?.h ?? 0);
        if (![x, y, w, h].every((v: any) => Number.isFinite(Number(v)))) throw new Error('内容块坐标无效');
        if (w < 40 || h < 20) throw new Error('内容块尺寸过小');
        const region = String(b?.region ?? 'top');
        if (!['top', 'bottom', 'left', 'right'].includes(region)) throw new Error('内容块区域无效');
        if (x < 0 || y < 0 || x + w > REGION_W[region]) throw new Error('内容块超出该区域画布范围');
        const imageUrl = String(b?.imageUrl ?? '').trim();
        const text = String(b?.text ?? '').trim();
        if (!imageUrl && !text) throw new Error('内容块至少填写图片或文本');
        if (imageUrl && !safeWebUrl(imageUrl)) throw new Error('内容块图片仅支持 http/https 或 /uploads/ 路径');
        const link = String(b?.link ?? '').trim();
        if (link && !safeWebUrl(link)) throw new Error('内容块链接仅支持 http/https 或站内路径');
        if (text.length > 200) throw new Error('内容块文本不能超过 200 字');
      }
    }
    if (patch.contactEntries !== undefined) {
      const list = patch.contactEntries;
      if (!Array.isArray(list)) throw new Error('联系入口无效');
      if (list.length > 12) throw new Error('联系入口最多 12 个');
      for (const it of list) {
        const name = String(it?.name ?? '').trim();
        const type = String(it?.type ?? '');
        const value = String(it?.value ?? '').trim();
        if (!name) throw new Error('联系入口名称不能为空');
        if (name.length > 30) throw new Error('联系入口名称不能超过 30 字');
        if (!['text', 'image', 'link'].includes(type)) throw new Error('联系入口类型无效');
        if (!value) throw new Error('联系入口内容不能为空');
        if (type === 'image' && !safeWebUrl(value)) throw new Error('联系图片仅支持 http/https 或 /uploads/ 路径');
        if (type === 'link' && !safeWebUrl(value)) throw new Error('联系链接仅支持 http/https 或站内路径');
        if (type === 'text' && value.length > 500) throw new Error('联系文本不能超过 500 字');
      }
    }
  }
  async updateConfig(slug: string, patch: any) {
    if (patch.merchant?.slug !== undefined && patch.merchant.slug !== slug) throw new Error('商家标识不能修改');
    if (patch.storefrontLayout !== undefined && !['a', 'b', 'c'].includes(patch.storefrontLayout)) throw new Error('前台排版无效');
    if (patch.storefrontTheme !== undefined && !['green', 'blue', 'orange', 'red', 'purple', 'teal', 'brown', 'graphite'].includes(patch.storefrontTheme)) throw new Error('前台配色无效');
    this.validateCustomization(patch);
    const cur = await this.getAdminConfig(slug);
    if (patch.pricing) {
      patch = { ...patch, pricing: this.migratePricing(patch.pricing, cur) };
      this.validatePricing(patch.pricing);
    }
    const next = this.normalize({ ...cur, ...patch, merchant: { ...cur.merchant, ...(patch.merchant || {}) }, product: { ...cur.product, ...(patch.product || {}) }, shipping: { ...cur.shipping, ...(patch.shipping || {}) }, contact: { ...cur.contact, ...(patch.contact || {}) } });
    await this.database?.saveConfig(slug, next);
    this.configs.set(slug, next);
    return next;
  }

  async quote(slug: string, input: any) {
    const c = await this.getConfig(slug);
    const p: Pricing = c.pricing;
    const q = Number(input.quantity);
    if (!Number.isSafeInteger(q) || q <= 0) throw new Error('印刷数量必须为安全正整数');

    // 1. 材质 + 数量阶梯（区间匹配）
    const material = p.materials.find((m: MaterialPricing) => m.name === input.material) ?? p.materials[0];
    const tiers = [...material.quantityTiers].sort((a, b) => a.quantity - b.quantity);
    const tier = tiers.filter((x: Tier) => x.quantity <= q).pop() ?? tiers[0];

    // 2. 展开尺寸（内置盒形公式 或 自定义手填）
    const f = input.finishedDimensions || {};
    // 手动填写展开尺寸（含自定义盒型）时，成品尺寸不是必填
    if (input.dimensionMode !== 'manual' && [f.length, f.width, f.height].some((v: any) => !Number.isFinite(Number(v)) || Number(v) <= 0)) throw new Error('成品尺寸必须为正数');
    const dims = { length: Number(f.length), width: Number(f.width), height: Number(f.height), thickness: Number(f.thickness ?? 1.5), cover: Number(f.cover ?? 15) };
    const boxVariant: 'ka' | 'keng' = input.boxVariant === 'keng' ? 'keng' : 'ka';
    let u: any; let shapeInfo: any = null;
    if (input.dimensionMode === 'manual') {
      u = input.unfoldedDimensions;
      if (!u || [u.length, u.width].some((v: any) => !Number.isFinite(Number(v)) || Number(v) <= 0)) throw new Error('展开尺寸必须为正数');
      u = { length: Number(u.length), width: Number(u.width) };
    } else {
      const shape = findBoxShape(input.shapeId ?? input.boxType ?? c.product.boxType);
      if (!shape) throw new Error('未知盒形，请重新选择');
      u = computeUnfolded(shape.id, dims, boxVariant);
      shapeInfo = { id: shape.id, name: shape.name, variant: boxVariant, formulaText: boxVariant === 'keng' ? (shape.formulaTextKeng ?? shape.formulaText) : shape.formulaText };
    }
    const area = u.length * u.width / 1e6;
    const totalAreaM2 = area * q;

    // 3. 基础生产金额 = max(面积×数量×档位单价, 最低消费)，再乘印刷面数系数与跟色系数
    const calculated = area * q * tier.unitPricePerM2;
    const base = Math.max(calculated, tier.minimumCharge);
    const printMode = input.printMode === '双面印刷' ? '双面印刷' : '单面印刷';
    const sideFactor = printMode === '双面印刷' ? 1 + p.print.doubleSidedSurcharge : 1;
    const requirement = p.requirements.list.find((r: PrintRequirement) => r.name === input.printRequirement) ?? p.requirements.list[0] ?? { name: '正常', rate: 0 };
    let baseProduction = base * sideFactor * (1 + requirement.rate);
    baseProduction = money(baseProduction);

    // 4. 表面处理：展开总面积㎡ × 单价（单选，空 = 不上光）
    const treatmentName = typeof input.treatment === 'string' ? input.treatment : '';
    const treatmentRule = treatmentName ? p.treatments[treatmentName] : undefined;
    const treatmentCharge = treatmentRule ? { name: treatmentName, unitPricePerM2: treatmentRule.unitPricePerM2, amount: money(totalAreaM2 * treatmentRule.unitPricePerM2) } : null;

    // 5. 粘盒：按个数
    const glueOn = input.glue === '粘';
    const glueCharge = glueOn ? { name: '粘盒', unitPricePerPiece: p.glue.unitPricePerPiece, amount: money(q * p.glue.unitPricePerPiece) } : null;

    // 6. 专色：每色一块版
    const spotCount = Math.max(0, Math.min(8, Math.floor(Number(input.spotColors) || 0)));
    const spotColorCharge = spotCount > 0 ? { count: spotCount, plateFeePerColor: p.spotColor.plateFeePerColor, amount: money(spotCount * p.spotColor.plateFeePerColor) } : null;


    // 8. 工艺：area=图形面积(默认展开尺寸) / times=次数(默认1) / piece=按个
    const rawProcesses: any[] = Array.isArray(input.processes) ? input.processes : [];
    const seen = new Set<string>();
    const charges = [];
    for (const raw of rawProcesses) {
      const name = typeof raw === 'string' ? raw : String(raw?.name ?? '');
      if (!name) continue;
      if (!p.processes[name]) throw new Error('未知工艺');
      if (seen.has(name)) continue;
      seen.add(name);
      const rule = p.processes[name];
      let variable = 0; let note: any = null;
      if (rule.billingMode === 'area') {
        const gw = Number(typeof raw === 'object' ? raw?.graphicWidth : NaN) || u.length;
        const gh = Number(typeof raw === 'object' ? raw?.graphicHeight : NaN) || u.width;
        const graphicAreaM2 = gw * gh / 1e6;
        variable = graphicAreaM2 * q * rule.unitPrice;
        note = { graphicWidth: gw, graphicHeight: gh, graphicAreaM2 };
      } else if (rule.billingMode === 'times') {
        const times = Math.max(1, Math.floor(Number(typeof raw === 'object' ? raw?.times : NaN) || 1));
        variable = rule.unitPrice * times * q;
        note = { times };
      } else {
        variable = rule.unitPrice * q;
      }
      charges.push({ name, ...rule, ...note, variableAmount: money(variable), amount: money(rule.setupFee + variable) });
    }
    const processTotal = money(charges.reduce((s: number, x: any) => s + x.amount, 0));

    // 9. 汇总
    const goodsTotal = money(baseProduction
      + (treatmentCharge?.amount ?? 0) + (glueCharge?.amount ?? 0)
      + (spotColorCharge?.amount ?? 0)
      + processTotal);
    const shippingFee = money(goodsTotal >= Number(c.shipping?.freeThreshold ?? Infinity) ? 0 : Number(c.shipping?.fee ?? 0));
    const total = money(goodsTotal + shippingFee);
    const result = {
      merchant: c.merchant,
      boxShape: shapeInfo,
      boxVariant,
      dimensionMode: input.dimensionMode === 'manual' ? 'manual' : 'auto',
      finishedDimensions: f,
      unfoldedDimensions: u,
      areaM2: area,
      totalAreaM2,
      materialApplied: { name: material.name, tierQuantity: tier.quantity, unitPricePerM2: tier.unitPricePerM2, minimumCharge: tier.minimumCharge },
      calculatedBaseAmount: money(calculated),
      minimumCharge: tier.minimumCharge,
      printSides: { mode: printMode, factor: sideFactor },
      printRequirement: requirement.name,
      printRequirementRate: requirement.rate,
      baseProductionAmount: baseProduction,
      treatmentCharge,
      glueCharge,
      spotColorCharge,
      processCharges: charges,
      processTotal,
      goodsTotal,
      shippingFee,
      total,
      unitPrice: money(goodsTotal / q),
      currency: 'CNY',
    };
    const version = this.database?.configured ? await this.database.getConfigVersion(slug) : 1;
    await this.database?.saveQuote(slug, input, result, version || 1);
    return result;
  }

  async listOptions(slug: string, category?: string) { return this.database?.listOptions(slug, category) ?? [] }
  async listProducts(slug: string) { return this.database?.listProducts(slug) ?? [] }
  async saveCart(slug: string, key: string, items: any[]) { const r = await this.database?.saveCart(slug, key, items); return r ?? { merchant: slug, sessionKey: key, items } }
  async getCart(slug: string, key: string) { return await this.database?.getCart(slug, key) ?? this.carts.get(slug + ':' + key) ?? { merchant: slug, sessionKey: key, items: [] } }
  async createOrder(slug: string, input: any) { const qi = input.quoteInput ?? input; const quote = await this.quote(slug, qi); const c = await this.database?.createOrder(slug, qi, quote, input.quoteId); return { ...(c ?? { id: randomUUID(), merchantId: slug, status: 'pending' }), quote } }
  async listOrders(slug: string, status?: string) { return await this.database?.listOrders(slug, status) ?? [...this.orders.values()] }
  async createMerchant(input: any) { const c = await this.database?.createMerchant(input); if (!c) throw new Error('MySQL 未连接，无法创建商家'); return c }
  async updateMerchantStatus(id: string, status: any) { return await this.database?.updateMerchantStatus(id, status) }
  async deleteMerchant(id: string) { const r = await this.database?.deleteMerchant(id); if (!r) throw new Error('商户不存在或已删除'); return r }
  async createOption(s: string, i: any) { return await this.database?.createOption(s, i) }
  async updateOption(s: string, id: string, i: any) { return await this.database?.updateOption(s, id, i) }
  async createProduct(s: string, i: any) { return await this.database?.createProduct(s, i) }
  async updateProduct(s: string, id: string, i: any) { return await this.database?.updateProduct(s, id, i) }
  async updateOrderStatus(s: string, id: string, st: string) { return await this.database?.updateOrderStatus(s, id, st) }
}

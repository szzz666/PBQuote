import { AppService } from './app.service';

const dims = { length: 120, width: 80, height: 35 };

describe('AppService', () => {
  const database = () => ({ configured: false, loadConfig: jest.fn().mockResolvedValue(null), saveQuote: jest.fn().mockResolvedValue(undefined) });

  it('calculates unfolded size from built-in formula and itemized charges', async () => {
    const service = new AppService(database() as any);
    const r = await service.quote('default', {
      quantity: 1000, shapeId: 'double-insert', finishedDimensions: dims, dimensionMode: 'auto',
      material: '350克白卡', treatment: '哑胶', glue: '粘', spotColors: 1, printMode: '单面印刷', printRequirement: '正常',
      processes: [{ name: '烫金' }],
    });
    // 双插盒展开：(120+80)×2+15=415；35+80×2+30=225 → 面积 0.093375㎡
    expect(r.unfoldedDimensions).toEqual({ length: 415, width: 225 });
    // 基础 = max(0.093375×1000×5.6=522.9, 最低消费850) = 850
    expect(r.baseProductionAmount).toBe(850);
    // 工艺（按图形面积=展开尺寸）：150 + 0.093375×1000×0.1 = 159.34
    expect(r.processCharges[0].amount).toBe(159.34);
    // 表面处理 0.2元/㎡×93.375㎡=18.68；粘盒 0.05×1000=50；专色 1×150=150
    expect(r.treatmentCharge.amount).toBe(18.68);
    expect(r.glueCharge.amount).toBe(50);
    expect(r.spotColorCharge.amount).toBe(150);
    expect(r.goodsTotal).toBe(850 + 159.34 + 18.68 + 50 + 150);
    expect(r.shippingFee).toBe(0);
    expect(r.total).toBe(r.goodsTotal);
  });

  it('matches the nearest lower quantity tier per material', async () => {
    const service = new AppService(database() as any);
    const r = await service.quote('default', { quantity: 800, shapeId: 'double-insert', finishedDimensions: dims });
    expect(r.materialApplied.tierQuantity).toBe(500);
    expect(r.materialApplied.unitPricePerM2).toBe(8.4);
    // max(0.093375×800×8.4=627.48, 580) = 627.48
    expect(r.baseProductionAmount).toBe(627.48);
  });

  it('applies double-sided surcharge, follow-color rate and proofing fee', async () => {
    const service = new AppService(database() as any);
    const dbl = await service.quote('default', { quantity: 800, shapeId: 'double-insert', finishedDimensions: dims, printMode: '双面印刷' });
    expect(dbl.baseProductionAmount).toBe(1003.97); // 627.48×1.6=1003.968 → 保留两位
    const follow = await service.quote('default', { quantity: 800, shapeId: 'double-insert', finishedDimensions: dims, printRequirement: '跟色' });
    expect(follow.baseProductionAmount).toBe(677.68); // 627.48×1.08=677.6784 → 677.68
    const proof = await service.quote('default', { quantity: 800, shapeId: 'double-insert', finishedDimensions: dims, printRequirement: '打样' });
    expect(proof.printRequirement).toBe('打样');
    expect(proof.printRequirementRate).toBe(0.1);
    expect(proof.baseProductionAmount).toBe(690.23); // 627.48×1.1=690.228 → 690.23
    expect(proof.goodsTotal).toBe(proof.baseProductionAmount); // 打样已无固定费，直接并入基础金额
  });

  it('supports process billing modes: graphic area override, times and piece', async () => {
    const service = new AppService(database() as any);
    const area = await service.quote('default', { quantity: 1000, shapeId: 'double-insert', finishedDimensions: dims, processes: [{ name: '烫金', graphicWidth: 100, graphicHeight: 50 }] });
    // 图形面积 0.005㎡：150 + 0.005×1000×0.1 = 150.5
    expect(area.processCharges[0].amount).toBe(150.5);
    // 切换为按次计费
    const db = database();
    db.loadConfigAdmin = jest.fn().mockResolvedValue(null);
    db.saveConfig = jest.fn().mockResolvedValue(undefined);
    const svc = new AppService(db as any);
    await svc.updateConfig('default', { pricing: svcConfigWithTimes() });
    const t = await svc.quote('default', { quantity: 1000, shapeId: 'double-insert', finishedDimensions: dims, processes: [{ name: '烫金', times: 2 }] });
    expect(t.processCharges[0].variableAmount).toBe(200); // 0.1×2次×1000
    expect(t.processCharges[0].amount).toBe(350); // 150 开机 + 200
  });

  it('supports manual unfolded dimensions for custom shapes with free shipping', async () => {
    const service = new AppService(database() as any);
    const r = await service.quote('default', { quantity: 500, dimensionMode: 'manual', unfoldedDimensions: { length: 1000, width: 700 }, finishedDimensions: { length: 400, width: 300, height: 100 } });
    expect(r.unfoldedDimensions).toEqual({ length: 1000, width: 700 });
    expect(r.goodsTotal).toBeGreaterThan(1000);
    expect(r.shippingFee).toBe(0);
  });

  it('migrates legacy global tiers into per-material tiers on read', async () => {
    const db = database();
    db.loadConfig = jest.fn().mockResolvedValue({
      merchant: { name: '旧商户', slug: 'old' }, product: { boxType: '双插盒' },
      pricing: { quantityTiers: [{ quantity: 100, unitPricePerM2: 9, minimumCharge: 300 }], processes: { '烫金': { billingMode: 'quantity', setupFee: 150, unitPrice: 0.1 } } },
      materials: ['350克白卡', '300克白卡白E坑'],
    });
    const service = new AppService(db as any);
    const cfg = await service.getConfig('old');
    expect(cfg.pricing.materials).toHaveLength(2);
    expect(cfg.pricing.materials[0].quantityTiers[0]).toEqual({ quantity: 100, unitPricePerM2: 9, minimumCharge: 300 });
    expect(cfg.pricing.treatments['哑胶'].unitPricePerM2).toBe(0.2);
    const r = await service.quote('old', { quantity: 100, shapeId: 'double-insert', finishedDimensions: dims, processes: ['烫金'] });
    // 旧 quantity 计费模式迁移为按个
    expect(r.processCharges[0].billingMode).toBe('piece');
  });

  it('preserves pricing and contact and rejects slug changes or invalid tiers', async () => {
    const service = new AppService();
    const before = await service.getAdminConfig('default');
    await service.updateConfig('default', { contact: { phone: '123' } });
    const next = await service.updateConfig('default', { merchant: { logoUrl: '/uploads/new.png' }, contact: { phone: '456' } });
    expect(next.pricing).toEqual(before.pricing);
    expect(next.contact).toEqual({ phone: '456' });
    await expect(service.updateConfig('default', { merchant: { slug: 'changed' } })).rejects.toThrow('标识');
    await expect(service.updateConfig('default', { pricing: { materials: [], processes: {} } })).rejects.toThrow('材质');
  });

  it('keeps cached config unchanged when persistence fails', async () => {
    const db = { ...database(), loadConfigAdmin: jest.fn().mockResolvedValue(null), saveConfig: jest.fn().mockRejectedValue(new Error('write failed')) };
    const service = new AppService(db as any);
    const before = await service.getAdminConfig('default');
    await expect(service.updateConfig('default', { merchant: { logoUrl: 'failed' } })).rejects.toThrow('write failed');
    expect(await service.getAdminConfig('default')).toEqual(before);
  });

  it('rejects invalid quantities, dimensions, shapes, processes and dedupes processes', async () => {
    const service = new AppService(database() as any);
    await expect(service.quote('default', { quantity: 0, finishedDimensions: dims })).rejects.toThrow('印刷数量');
    await expect(service.quote('default', { quantity: 500, finishedDimensions: { length: 0, width: 1, height: 1 } })).rejects.toThrow('成品尺寸');
    await expect(service.quote('default', { quantity: 500, shapeId: 'no-such-shape', finishedDimensions: dims })).rejects.toThrow('未知盒形');
    await expect(service.quote('default', { quantity: 500, finishedDimensions: dims, processes: ['不存在的工艺'] })).rejects.toThrow('未知工艺');
    const dedup = await service.quote('default', { quantity: 500, shapeId: 'double-insert', finishedDimensions: dims, processes: [{ name: '烫金' }, '烫金'] });
    expect(dedup.processCharges).toHaveLength(1);
  });

  it('validates topbarLinks and contentBlocks canvas customization', async () => {
    const db = { ...database(), loadConfigAdmin: jest.fn().mockResolvedValue(null), saveConfig: jest.fn().mockResolvedValue(undefined) };
    const service = new AppService(db as any);
    const ok = await service.updateConfig('default', { topbarLinks: [{ name: '产品目录', url: 'http://example.com' }, { name: '样册', url: '/shop/default' }], contentBlocks: [{ id: 'b1', x: 0, y: 0, w: 400, h: 120, text: '支持打样', imageUrl: '/uploads/merchants/default/banner.png', link: 'https://example.com' }] });
    expect(ok.topbarLinks).toHaveLength(2);
    expect(ok.contentBlocks).toHaveLength(1);
    expect(ok.contentBlocks[0].x).toBe(0);
    await expect(service.updateConfig('default', { topbarLinks: Array.from({ length: 7 }, (_, i) => ({ name: 'n' + i, url: 'https://a.com' })) })).rejects.toThrow('最多 6 个');
    await expect(service.updateConfig('default', { topbarLinks: [{ name: 'x', url: 'javascript:alert(1)' }] })).rejects.toThrow('仅支持 http/https 或站内路径');
    await expect(service.updateConfig('default', { contentBlocks: [{ id: 'b', x: 0, y: 0, w: 10, h: 10, text: 'x' }] })).rejects.toThrow('尺寸过小');
    await expect(service.updateConfig('default', { contentBlocks: [{ id: 'b', x: 0, y: 0, w: 1300, h: 100, text: 'x' }] })).rejects.toThrow('超出');
    await expect(service.updateConfig('default', { contentBlocks: [{ id: 'b', region: 'right', x: 0, y: 0, w: 300, h: 100, text: 'x' }] })).rejects.toThrow('超出');
    await expect(service.updateConfig('default', { contentBlocks: [{ id: 'b', x: 0, y: 0, w: 100, h: 100 }] })).rejects.toThrow('至少填写图片或文本');
    await expect(service.updateConfig('default', { contentBlocks: [{ id: 'b', x: 0, y: 0, w: 100, h: 100, text: 'x', imageUrl: 'data:text/html,x' }] })).rejects.toThrow('图片仅支持');
    const internal = await service.updateConfig('default', { topbarLinks: [{ name: '本站', url: '/shop/default' }] });
    expect(internal.topbarLinks[0].url).toBe('/shop/default');
    // contactEntries：文本/图片/链接多入口
    const ce = await service.updateConfig('default', { contactEntries: [{ name: '微信', type: 'text', value: 'abc123' }, { name: '二维码', type: 'image', value: '/uploads/merchants/default/qr.png' }, { name: '网站', type: 'link', value: 'https://example.com' }] });
    expect(ce.contactEntries).toHaveLength(3);
    await expect(service.updateConfig('default', { contactEntries: [{ name: '', type: 'text', value: 'x' }] })).rejects.toThrow('名称不能为空');
    await expect(service.updateConfig('default', { contactEntries: [{ name: 'x', type: 'video', value: 'x' }] })).rejects.toThrow('类型无效');
    await expect(service.updateConfig('default', { contactEntries: [{ name: 'x', type: 'link', value: 'javascript:alert(1)' }] })).rejects.toThrow('联系链接');
  });

  it('computes larger unfolded dims for keng (corrugated) variant', async () => {
    const service = new AppService(database() as any);
    const ka = await service.quote('default', { quantity: 1000, shapeId: 'double-insert', finishedDimensions: dims, dimensionMode: 'auto' });
    const keng = await service.quote('default', { quantity: 1000, shapeId: 'double-insert', finishedDimensions: dims, dimensionMode: 'auto', boxVariant: 'keng' });
    expect(keng.boxVariant).toBe('keng');
    expect(ka.boxVariant).toBe('ka');
    // 双插盒卡盒 415×225；坑盒 420×235（粘口 20、插舌 40，参考分享印 双插盒_微坑 goods 340）
    expect(ka.unfoldedDimensions).toEqual({ length: 415, width: 225 });
    expect(keng.unfoldedDimensions).toEqual({ length: 420, width: 235 });
  });
});

function svcConfigWithTimes() {
  return {
    materials: [{ name: '350克白卡', quantityTiers: [{ quantity: 500, unitPricePerM2: 8.4, minimumCharge: 580 }] }],
    treatments: { '哑胶': { unitPricePerM2: 0.2 } },
    processes: { '烫金': { billingMode: 'times', setupFee: 150, unitPrice: 0.1 } },
    print: { doubleSidedSurcharge: 0.6 },
    requirements: { list: [{ name: '正常', rate: 0 }, { name: '跟色', rate: 0.08 }, { name: '打样', rate: 0.1 }] },
    glue: { unitPricePerPiece: 0.05 },
    spotColor: { plateFeePerColor: 150 },
  };
}

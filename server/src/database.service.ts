import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createPool, Pool } from 'mysql2/promise';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private pool?: Pool;
  private merchantIds = new Map<string, string>();
  get configured() { return Boolean(process.env.DB_HOST && process.env.DB_NAME && process.env.DB_USER); }
  async onModuleInit() {
    if (!this.configured) return;
    this.pool = createPool({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT ?? 3306), database: process.env.DB_NAME, user: process.env.DB_USER, password: process.env.DB_PASSWORD ?? '', connectionLimit: Number(process.env.DB_POOL_SIZE ?? 5), waitForConnections: true, multipleStatements: true });
    // 连接重试：最多 3 次，失败给出明确错误，避免静默落入内存模式
    const attempts = 3;
    for (let i = 1; i <= attempts; i++) {
      try { await this.pool.query('SELECT 1'); break; }
      catch (error: any) {
        if (i === attempts) {
          this.pool = undefined;
          throw new Error('无法连接 MySQL（' + process.env.DB_HOST + ':' + (process.env.DB_PORT ?? 3306) + '/' + process.env.DB_NAME + '）：' + (error?.code ?? error?.message ?? error));
        }
        await new Promise(r => setTimeout(r, 2000));
      }
    }
    if (process.env.DB_AUTO_MIGRATE === 'true') await this.migrate();
  }
  async onModuleDestroy() { await this.pool?.end(); }
  async migrate() {
    if (!this.pool) return;
    const base = resolve(process.cwd(), 'database/migrations');
    const sql = await readFile(join(base, '001_initial.sql'), 'utf8');
    await this.pool.query(sql);
    try {
      const sql2 = await readFile(join(base, '002_soft_delete_merchants.sql'), 'utf8');
      await this.pool.query(sql2);
    } catch (e: any) {
      // 列已存在等幂等错误直接忽略
      if (!String(e?.message || '').includes('Duplicate column')) throw e;
    }
  }
  async deleteMerchant(id: string) {
    if (!this.pool) return null;
    const [result] = await this.pool.query<any>('UPDATE merchants SET deleted_at = CURRENT_TIMESTAMP(3) WHERE id = ? AND deleted_at IS NULL', [id]);
    if (!result.affectedRows) return null;
    // 同时停用该商户所有账号，防止已删除商户仍可登录
    await this.pool.query<any>("UPDATE users SET status = 'disabled' WHERE merchant_id = ? AND status = 'active'", [id]);
    return { id, deleted: true };
  }
  async findUser(username: string): Promise<{ username: string; passwordHash: string; role: 'super_admin' | 'merchant'; merchantSlug?: string } | null> {
    if (!this.pool) return null;
    const [rows] = await this.pool.query<any[]>("SELECT u.username, u.password_hash AS passwordHash, u.role, m.slug AS merchantSlug FROM users u LEFT JOIN merchants m ON m.id = u.merchant_id WHERE u.username = ? AND u.status = 'active' LIMIT 1", [username]);
    return rows[0] ?? null;
  }
  async saveSession(token: string, username: string) {
    if (!this.pool) return;
    const [rows] = await this.pool.query<any[]>("SELECT id FROM users WHERE username = ? AND status = 'active' LIMIT 1", [username]);
    if (!rows[0]?.id) return;
    const hash = createHash('sha256').update(token).digest('hex');
    await this.pool.query('INSERT INTO sessions (id, token_hash, user_id, expires_at) VALUES (?, ?, ?, DATE_ADD(CURRENT_TIMESTAMP(3), INTERVAL 12 HOUR))', [this.id(), hash, rows[0].id]);
  }
  async revokeSession(token: string) {
    if (!this.pool) return;
    const hash = createHash('sha256').update(token).digest('hex');
    await this.pool.query('UPDATE sessions SET revoked_at = CURRENT_TIMESTAMP(3) WHERE token_hash = ? AND revoked_at IS NULL', [hash]);
  }

  async findSession(token: string) {
    if (!this.pool) return null;
    const hash = createHash('sha256').update(token).digest('hex');
    const [rows] = await this.pool.query<any[]>("SELECT u.username, u.role, m.slug AS merchantSlug FROM sessions s JOIN users u ON u.id = s.user_id LEFT JOIN merchants m ON m.id = u.merchant_id WHERE s.token_hash = ? AND s.expires_at > CURRENT_TIMESTAMP(3) AND u.status = 'active' LIMIT 1", [hash]);
    return rows[0] ?? null;
  }
  async createMerchant(input: { name: string; slug: string; slogan?: string; brandSubtitle?: string; logoUrl?: string; username: string; passwordHash: string }) {
    if (!this.pool) return null;
    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();
      const merchantId = this.id();
      await connection.query('INSERT INTO merchants (id, name, slug, storefront_name, storefront_slogan) VALUES (?, ?, ?, ?, ?)', [merchantId, input.name, input.slug, input.name, input.slogan ?? null]);
      const defaultConfig = { merchant: { name: input.name, slug: input.slug, slogan: input.slogan ?? '', brandSubtitle: input.brandSubtitle ?? input.slogan ?? '', logoUrl: '' }, ...{ product: { name: '产品', boxType: '', basePrice: 0 }, quantities: [], materials: [], treatments: [], processes: [], printModes: [], printRequirements: [], glueOptions: [], shipping: { freeThreshold: 0, fee: 0 }, topbarLinks: [], contentBlocks: [], contactEntries: [] } };
      await connection.query("INSERT INTO merchant_configs (id, merchant_id, version, status, payload) VALUES (?, ?, 1, 'published', ?)", [this.id(), merchantId, JSON.stringify(defaultConfig)]);
      await connection.query("INSERT INTO users (id, username, password_hash, role, merchant_id) VALUES (?, ?, ?, 'merchant', ?)", [this.id(), input.username, input.passwordHash, merchantId]);
      await connection.commit();
      return { id: merchantId, name: input.name, slug: input.slug, status: 'active', storefrontName: input.name, storefrontSlogan: input.slogan ?? null };
    } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
  }
  async updateMerchantStatus(id: string, status: 'active' | 'disabled') {
    if (!this.pool) return null;
    const [result] = await this.pool.query<any>('UPDATE merchants SET status = ? WHERE id = ?', [status, id]);
    if (!result.affectedRows) return null;
    const [rows] = await this.pool.query<any[]>('SELECT id, name, slug, status, storefront_name AS storefrontName, storefront_slogan AS storefrontSlogan, config_version AS configVersion FROM merchants WHERE id = ?', [id]);
    return rows[0] ?? null;
  }

  async listMerchants() {
    if (!this.pool) return [];
    const [rows] = await this.pool.query<any[]>("SELECT m.id, m.name, m.slug, m.status, m.storefront_name AS storefrontName, m.storefront_slogan AS storefrontSlogan, m.config_version AS configVersion, m.created_at AS createdAt, m.updated_at AS updatedAt, mc.payload AS configPayload FROM merchants m LEFT JOIN merchant_configs mc ON mc.merchant_id = m.id AND mc.status = 'published' AND mc.version = (SELECT MAX(c2.version) FROM merchant_configs c2 WHERE c2.merchant_id = m.id AND c2.status = 'published') WHERE m.deleted_at IS NULL ORDER BY m.created_at DESC");
    return rows.map((row) => {
      const payload = this.parseJson(row.configPayload);
      return { id: row.id, name: row.name, slug: row.slug, status: row.status, storefrontName: row.storefrontName, storefrontSlogan: row.storefrontSlogan, configVersion: row.configVersion, createdAt: row.createdAt, updatedAt: row.updatedAt, logoUrl: payload?.merchant?.logoUrl ?? '' };
    });
  }

  async listOptions(slug: string, category?: string) {
    if (!this.pool) return [];
    const merchantId = await this.merchantId(slug);
    if (!merchantId) return [];
    const [rows] = await this.pool.query<any[]>('SELECT id, category, name, status, payload, sort_order AS sortOrder FROM catalog_options WHERE merchant_id = ?'+(category ? ' AND category = ?' : '')+' ORDER BY category, sort_order, created_at', category ? [merchantId, category] : [merchantId]);
    return rows.map((row) => ({ ...row, payload: this.parseJson(row.payload) }));
  }
  async createOption(slug: string, input: { category: string; name: string; payload: Record<string, unknown>; sortOrder?: number }) {
    if (!this.pool) return null;
    const merchantId = await this.merchantId(slug);
    if (!merchantId) return null;
    const id = this.id();
    await this.pool.query('INSERT INTO catalog_options (id, merchant_id, category, name, payload, sort_order) VALUES (?, ?, ?, ?, ?, ?)', [id, merchantId, input.category, input.name, JSON.stringify(input.payload), input.sortOrder ?? 0]);
    return { id, merchantId, category: input.category, name: input.name, status: 'active', payload: input.payload, sortOrder: input.sortOrder ?? 0 };
  }
  async updateOption(slug: string, id: string, input: { category?: string; name?: string; status?: 'active' | 'disabled'; payload?: Record<string, unknown>; sortOrder?: number }) {
    if (!this.pool) return null;
    const merchantId = await this.merchantId(slug);
    if (!merchantId) return null;
    const fields: string[] = []; const values: unknown[] = [];
    if (input.category !== undefined) { fields.push('category = ?'); values.push(input.category); }
    if (input.name !== undefined) { fields.push('name = ?'); values.push(input.name); }
    if (input.status !== undefined) { fields.push('status = ?'); values.push(input.status); }
    if (input.payload !== undefined) { fields.push('payload = ?'); values.push(JSON.stringify(input.payload)); }
    if (input.sortOrder !== undefined) { fields.push('sort_order = ?'); values.push(input.sortOrder); }
    if (!fields.length) return null; values.push(id, merchantId);
    const [result] = await this.pool.query<any>('UPDATE catalog_options SET '+fields.join(', ')+' WHERE id = ? AND merchant_id = ?', values);
    if (!result.affectedRows) return null;
    const [rows] = await this.pool.query<any[]>('SELECT id, category, name, status, payload, sort_order AS sortOrder FROM catalog_options WHERE id = ? AND merchant_id = ?', [id, merchantId]);
    return rows[0] ? { ...rows[0], payload: this.parseJson(rows[0].payload) } : null;
  }

  async listProducts(slug: string) {
    if (!this.pool) return [];
    const merchantId = await this.merchantId(slug);
    if (!merchantId) return [];
    const [rows] = await this.pool.query<any[]>('SELECT id, name, status, payload, created_at AS createdAt, updated_at AS updatedAt FROM products WHERE merchant_id = ? ORDER BY created_at DESC', [merchantId]);
    return rows.map((row) => ({ ...row, payload: this.parseJson(row.payload) }));
  }
  async createProduct(slug: string, input: { name: string; payload: Record<string, unknown> }) {
    if (!this.pool) return null;
    const merchantId = await this.merchantId(slug);
    if (!merchantId) return null;
    const id = this.id();
    await this.pool.query('INSERT INTO products (id, merchant_id, name, payload) VALUES (?, ?, ?, ?)', [id, merchantId, input.name, JSON.stringify(input.payload)]);
    return { id, merchantId, name: input.name, status: 'active', payload: input.payload };
  }
  async updateProduct(slug: string, id: string, input: { name?: string; status?: 'active' | 'disabled'; payload?: Record<string, unknown> }) {
    if (!this.pool) return null;
    const merchantId = await this.merchantId(slug);
    if (!merchantId) return null;
    const fields: string[] = []; const values: unknown[] = [];
    if (input.name !== undefined) { fields.push('name = ?'); values.push(input.name); }
    if (input.status !== undefined) { fields.push('status = ?'); values.push(input.status); }
    if (input.payload !== undefined) { fields.push('payload = ?'); values.push(JSON.stringify(input.payload)); }
    if (!fields.length) return null;
    values.push(id, merchantId);
    const [result] = await this.pool.query<any>('UPDATE products SET '+fields.join(', ')+' WHERE id = ? AND merchant_id = ?', values);
    if (!result.affectedRows) return null;
    const [rows] = await this.pool.query<any[]>('SELECT id, name, status, payload FROM products WHERE id = ? AND merchant_id = ?', [id, merchantId]);
    return rows[0] ? { ...rows[0], payload: this.parseJson(rows[0].payload) } : null;
  }

  async loadConfig(slug: string): Promise<Record<string, unknown> | null> {
    if (!this.pool) return null;
    const [rows] = await this.pool.query<any[]>("SELECT mc.payload FROM merchant_configs mc JOIN merchants m ON m.id = mc.merchant_id WHERE m.slug = ? AND m.status = 'active' AND mc.status = 'published' ORDER BY mc.version DESC LIMIT 1", [slug]);
    return rows[0]?.payload ? this.parseJson(rows[0].payload) : null;
  }
  async loadConfigAdmin(slug: string): Promise<Record<string, unknown> | null> {
    if (!this.pool) return null;
    const [rows] = await this.pool.query<any[]>("SELECT mc.payload FROM merchant_configs mc JOIN merchants m ON m.id = mc.merchant_id WHERE m.slug = ? AND mc.status = 'published' ORDER BY mc.version DESC LIMIT 1", [slug]);
    return rows[0]?.payload ? this.parseJson(rows[0].payload) : null;
  }
  async saveConfig(slug: string, payload: Record<string, unknown>, previousSlug?: string) {
    if (!this.pool) return;
    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();
      const merchantId = await this.ensureMerchant(connection, slug, payload, previousSlug);
      const [versions] = await connection.query<any[]>('SELECT COALESCE(MAX(version), 0) + 1 AS nextVersion FROM merchant_configs WHERE merchant_id = ?', [merchantId]);
      const version = Number(versions[0].nextVersion);
      await connection.query("INSERT INTO merchant_configs (id, merchant_id, version, status, payload) VALUES (?, ?, ?, 'published', ?)", [this.id(), merchantId, version, JSON.stringify(payload)]);
      const merchant = (payload.merchant ?? {}) as any;
      await connection.query('UPDATE merchants SET config_version = ?, storefront_name = ?, storefront_slogan = ? WHERE id = ?', [version, merchant.name ?? slug, merchant.slogan ?? null, merchantId]);
      await connection.commit();
    } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
  }
  /** 当前商家已发布的配置版本号（报价快照用） */
  async getConfigVersion(slug: string) {
    if (!this.pool) return 1;
    const [rows] = await this.pool.query<any[]>('SELECT config_version AS v FROM merchants WHERE slug = ? LIMIT 1', [slug]);
    return rows[0]?.v ?? 1;
  }

  async saveQuote(slug: string, input: unknown, price: unknown, version: number) {
    if (!this.pool) return;
    const merchantId = await this.merchantId(slug);
    if (!merchantId) return;
    const id = this.id();
    await this.pool.query('INSERT INTO quotes (id, merchant_id, config_version, input_snapshot, price_snapshot, expires_at) VALUES (?, ?, ?, ?, ?, DATE_ADD(CURRENT_TIMESTAMP(3), INTERVAL 15 MINUTE))', [id, merchantId, version, JSON.stringify(input), JSON.stringify(price)]);
    return id;
  }
  async getCart(slug: string, sessionKey: string) {
    if (!this.pool) return null;
    const merchantId = await this.merchantId(slug);
    if (!merchantId) return null;
    const [rows] = await this.pool.query<any[]>("SELECT id, session_key AS sessionKey, items, updated_at AS updatedAt FROM carts WHERE merchant_id = ? AND session_key = ? LIMIT 1", [merchantId, sessionKey]);
    return rows[0] ? { ...rows[0], merchantId, items: this.parseJson(rows[0].items) } : null;
  }

  async saveCart(slug: string, sessionKey: string, items: unknown[]) {
    if (!this.pool) return null;
    const merchantId = await this.merchantId(slug);
    if (!merchantId) return null;
    const id = this.id();
    await this.pool.query("INSERT INTO carts (id, merchant_id, session_key, items) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE items = VALUES(items)", [id, merchantId, sessionKey, JSON.stringify(items)]);
    return this.getCart(slug, sessionKey);
  }

  async createOrder(slug: string, inputSnapshot: unknown, priceSnapshot: unknown, quoteId?: string) {
    if (!this.pool) return null;
    const merchantId = await this.merchantId(slug);
    if (!merchantId) return null;
    const id = this.id();
    await this.pool.query("INSERT INTO orders (id, merchant_id, quote_id, input_snapshot, price_snapshot) VALUES (?, ?, ?, ?, ?)", [id, merchantId, quoteId ?? null, JSON.stringify(inputSnapshot), JSON.stringify(priceSnapshot)]);
    return { id, merchantId, quoteId: quoteId ?? null, status: 'pending', inputSnapshot, priceSnapshot };
  }

  async listOrders(slug: string, status?: string) {
    if (!this.pool) return [];
    const merchantId = await this.merchantId(slug);
    if (!merchantId) return [];
    const [rows] = await this.pool.query<any[]>("SELECT id, quote_id AS quoteId, status, input_snapshot AS inputSnapshot, price_snapshot AS priceSnapshot, created_at AS createdAt, updated_at AS updatedAt FROM orders WHERE merchant_id = ?" + (status ? ' AND status = ?' : '') + ' ORDER BY created_at DESC', status ? [merchantId, status] : [merchantId]);
    return rows.map((row) => ({ ...row, merchantId, inputSnapshot: this.parseJson(row.inputSnapshot), priceSnapshot: this.parseJson(row.priceSnapshot) }));
  }

  async updateOrderStatus(slug: string, id: string, status: string) {
    if (!this.pool) return null;
    const merchantId = await this.merchantId(slug);
    if (!merchantId) return null;
    const [result] = await this.pool.query<any>("UPDATE orders SET status = ? WHERE id = ? AND merchant_id = ?", [status, id, merchantId]);
    if (!result.affectedRows) return null;
    const [rows] = await this.pool.query<any[]>("SELECT id, quote_id AS quoteId, status, input_snapshot AS inputSnapshot, price_snapshot AS priceSnapshot, created_at AS createdAt, updated_at AS updatedAt FROM orders WHERE id = ? AND merchant_id = ?", [id, merchantId]);
    return rows[0] ? { ...rows[0], merchantId, inputSnapshot: this.parseJson(rows[0].inputSnapshot), priceSnapshot: this.parseJson(rows[0].priceSnapshot) } : null;
  }

  private async merchantId(slug: string) {
    if (this.merchantIds.has(slug)) return this.merchantIds.get(slug);
    if (!this.pool) return undefined;
    const [rows] = await this.pool.query<any[]>("SELECT id FROM merchants WHERE slug = ? AND status = 'active' LIMIT 1", [slug]);
    const id = rows[0]?.id as string | undefined;
    if (id) this.merchantIds.set(slug, id);
    return id;
  }
  private async ensureMerchant(connection: any, slug: string, payload: Record<string, unknown>, previousSlug?: string) {
    const existing = await this.merchantIdWithConnection(connection, slug) ?? (previousSlug ? await this.merchantIdWithConnection(connection, previousSlug) : undefined);
    if (existing) {
      if (previousSlug && previousSlug !== slug) {
        await connection.query('UPDATE merchants SET slug = ? WHERE id = ?', [slug, existing]);
        this.merchantIds.delete(previousSlug); this.merchantIds.set(slug, existing);
      }
      return existing;
    }
    const merchantId = this.id(); const merchant = (payload.merchant ?? {}) as any;
    await connection.query('INSERT INTO merchants (id, name, slug, storefront_name, storefront_slogan) VALUES (?, ?, ?, ?, ?)', [merchantId, merchant.name ?? slug, slug, merchant.name ?? slug, merchant.slogan ?? null]);
    this.merchantIds.set(slug, merchantId); return merchantId;
  }
  private async merchantIdWithConnection(connection: any, slug: string) { const [rows] = await connection.query('SELECT id FROM merchants WHERE slug = ? LIMIT 1', [slug]); return (rows as any[])[0]?.id as string | undefined; }
  private parseJson(value: unknown) { return typeof value === 'string' ? JSON.parse(value) : value as Record<string, unknown>; }
  private id() { return randomUUID().replaceAll('-', '').slice(0, 26); }
}

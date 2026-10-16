import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
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
    // 按文件名顺序执行全部迁移；缺表/列已存在等幂等错误忽略，保证可重复执行
    const files = (await readdir(base)).filter((f) => /^\d+.*\.sql$/i.test(f)).sort();
    for (const file of files) {
      const sql = await readFile(join(base, file), 'utf8');
      try {
        await this.pool.query(sql);
      } catch (e: any) {
        const msg = String(e?.message || '');
        if (/Duplicate column|Duplicate key name|already exists|Unknown table/i.test(msg)) continue;
        throw new Error('迁移 ' + file + ' 执行失败：' + msg);
      }
    }
  }
  /**
   * 物理删除商户及其全部关联数据。
   * merchants.slug 与 users.username 都是唯一键，软删除会让这两个值被永久占用、
   * 无法再创建同名标识/账号，因此这里按外键依赖顺序真正删除数据行。
   */
  async deleteMerchant(id: string) {
    if (!this.pool) return null;
    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();
      // 确认商户存在（未删的行才可删；已软删的历史行也允许清掉）
      const [rows] = await connection.query<any[]>('SELECT id, slug FROM merchants WHERE id = ? LIMIT 1', [id]);
      if (!rows[0]) { await connection.rollback(); return null; }
      const slug = rows[0].slug as string;
      // 该商户的用户 id（用于清理 sessions / audit_logs 等引用 users 的表）
      const [userRows] = await connection.query<any[]>('SELECT id FROM users WHERE merchant_id = ?', [id]);
      const userIds = userRows.map((u) => u.id);
      const inUsers = userIds.length ? ' IN (' + userIds.map(() => '?').join(',') + ')' : ' IN (NULL)';
      // 不同版本的建表脚本表集合有差异，这里只删实际存在的表，避免缺表导致整笔删除失败
      const [tableRows] = await connection.query<any[]>('SELECT TABLE_NAME AS t FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()');
      const has = new Set<string>(tableRows.map((r) => String(r.t)));
      const del = async (table: string, where: string, params: any[]) => { if (has.has(table)) await connection.query<any[]>('DELETE FROM ' + table + ' WHERE ' + where, params) };
      // 依赖顺序：先删引用方，再删被引用方
      // orders → quotes；box_types → products；sessions/audit_logs → users；最后 merchants
      await del('orders', 'merchant_id = ?', [id]);
      await del('carts', 'merchant_id = ?', [id]);
      await del('quotes', 'merchant_id = ?', [id]);
      await del('box_types', 'merchant_id = ?', [id]);
      await del('products', 'merchant_id = ?', [id]);
      await del('price_rules', 'merchant_id = ?', [id]);
      await del('catalog_options', 'merchant_id = ?', [id]);
      await del('merchant_configs', 'merchant_id = ?', [id]);
      await del('audit_logs', 'merchant_id = ? OR actor_user_id' + inUsers, [id, ...userIds]);
      await del('sessions', 'user_id' + inUsers, userIds);
      await del('users', 'merchant_id = ?', [id]);
      await del('merchants', 'id = ?', [id]);
      await connection.commit();
      for (const [cachedSlug, cachedId] of this.merchantIds) if (cachedId === id) this.merchantIds.delete(cachedSlug);
      this.merchantIds.delete(slug);
      return { id, slug, deleted: true, hardDeleted: true };
    } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
  }
  async findUser(username: string): Promise<{ id: string; username: string; passwordHash: string; role: 'super_admin' | 'merchant'; merchantId?: string; merchantSlug?: string } | null> {
    if (!this.pool) return null;
    const [rows] = await this.pool.query<any[]>("SELECT u.id, u.username, u.password_hash AS passwordHash, u.role, u.merchant_id AS merchantId, m.slug AS merchantSlug FROM users u LEFT JOIN merchants m ON m.id = u.merchant_id WHERE u.username = ? AND u.status = 'active' LIMIT 1", [username]);
    return rows[0] ?? null;
  }

  /** 商户账号详情（id/slug/name + 该商户的登录账号），账号管理接口使用 */
  async findMerchantAccount(id: string): Promise<{ id: string; name: string; slug: string; userId?: string; username?: string; role?: string } | null> {
    if (!this.pool) return null;
    const [rows] = await this.pool.query<any[]>("SELECT m.id, m.name, m.slug, u.id AS userId, u.username, u.role FROM merchants m LEFT JOIN users u ON u.merchant_id = m.id AND u.role = 'merchant' WHERE m.id = ? AND m.deleted_at IS NULL LIMIT 1", [id]);
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
  /** 撤销某用户全部未撤销会话（改密/改账号后强制重新登录） */
  async revokeUserSessions(userId: string) {
    if (!this.pool) return 0;
    const [result] = await this.pool.query<any>('UPDATE sessions SET revoked_at = CURRENT_TIMESTAMP(3) WHERE user_id = ? AND revoked_at IS NULL', [userId]);
    return Number(result?.affectedRows ?? 0);
  }

  /** 写审计日志（失败不阻断主流程） */
  async audit(entry: { actorUserId?: string | null; merchantId?: string | null; action: string; resourceType: string; resourceId?: string | null; payload?: unknown }) {
    if (!this.pool) return;
    try {
      await this.pool.query('INSERT INTO audit_logs (id, actor_user_id, merchant_id, action, resource_type, resource_id, payload) VALUES (?, ?, ?, ?, ?, ?, ?)', [this.id(), entry.actorUserId ?? null, entry.merchantId ?? null, entry.action, entry.resourceType, entry.resourceId ?? null, entry.payload === undefined ? null : JSON.stringify(entry.payload)]);
    } catch (error) { console.error('[audit] 写入失败', entry.action, error instanceof Error ? error.message : error); }
  }

  /**
   * 修改商户专属标识与登录账号。
   * 改 slug：同一事务内更新 merchants.slug 并把所有 merchant_configs.payload 里的
   * /uploads/merchants/<旧>/ 替换为 /uploads/merchants/<新>/；数据库提交后再迁移图片目录。
   */
  async updateMerchantAccount(input: { id: string; slug?: string; username?: string; userId?: string; oldSlug?: string }) {
    if (!this.pool) return null;
    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();
      await connection.query('UPDATE merchants SET slug = ? WHERE id = ?', [input.slug, input.id]);
      if (input.oldSlug && input.oldSlug !== input.slug) {
        await connection.query('UPDATE merchant_configs SET payload = REPLACE(CAST(payload AS CHAR), ?, ?) WHERE merchant_id = ?', ['/uploads/merchants/' + input.oldSlug + '/', '/uploads/merchants/' + input.slug + '/', input.id]);
      }
      if (input.username && input.userId) {
        await connection.query('UPDATE users SET username = ? WHERE id = ?', [input.username, input.userId]);
      }
      await connection.commit();
    } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
    // 改账号后该商户所有登录态失效，强制用新账号重新登录
    await this.revokeMerchantUserSessions(input.id);
    return { id: input.id, slug: input.slug, username: input.username ?? null };
  }

  /** 撤销某商户下全部未撤销会话 */
  async revokeMerchantUserSessions(merchantId: string) {
    if (!this.pool) return 0;
    const [result] = await this.pool.query<any>('UPDATE sessions SET revoked_at = CURRENT_TIMESTAMP(3) WHERE revoked_at IS NULL AND user_id IN (SELECT id FROM users WHERE merchant_id = ?)', [merchantId]);
    return Number(result?.affectedRows ?? 0);
  }

  /** slug / username 占用预检（改账号接口用，先查再写，兜住唯一键冲突） */
  async isSlugTaken(slug: string, excludeId?: string) {
    if (!this.pool) return false;
    const sql = 'SELECT id FROM merchants WHERE slug = ? AND deleted_at IS NULL' + (excludeId ? ' AND id <> ?' : '') + ' LIMIT 1';
    const [rows] = await this.pool.query<any[]>(sql, excludeId ? [slug, excludeId] : [slug]);
    return Boolean(rows[0]);
  }
  async isUsernameTaken(username: string, excludeUserId?: string) {
    if (!this.pool) return false;
    const sql = 'SELECT id FROM users WHERE username = ?' + (excludeUserId ? ' AND id <> ?' : '') + ' LIMIT 1';
    const [rows] = await this.pool.query<any[]>(sql, excludeUserId ? [username, excludeUserId] : [username]);
    return Boolean(rows[0]);
  }

  /** 重置某用户密码（写入与登录一致的 scrypt 哈希格式，明文不落库） */
  async updatePassword(userId: string, passwordHash: string) {
    if (!this.pool) return false;
    const [result] = await this.pool.query<any>('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, userId]);
    return Boolean(result?.affectedRows);
  }

  /** 按用户名读取含 password_hash 的记录（改密校验原密码用） */
  async findUserRecord(username: string) {
    if (!this.pool) return null;
    const [rows] = await this.pool.query<any[]>("SELECT id, username, password_hash AS passwordHash, role, merchant_id AS merchantId FROM users WHERE username = ? AND status = 'active' LIMIT 1", [username]);
    return rows[0] ?? null;
  }

  /** 全部账号（reset-password.js --list 用） */
  async listUsers() {
    if (!this.pool) return [];
    const [rows] = await this.pool.query<any[]>("SELECT u.username, u.role, u.status, u.merchant_id AS merchantId, m.slug AS merchantSlug FROM users u LEFT JOIN merchants m ON m.id = u.merchant_id ORDER BY u.role, u.username");
    return rows;
  }

  async findSession(token: string) {
    if (!this.pool) return null;
    const hash = createHash('sha256').update(token).digest('hex');
    const [rows] = await this.pool.query<any[]>("SELECT u.id, u.username, u.role, u.merchant_id AS merchantId, m.slug AS merchantSlug FROM sessions s JOIN users u ON u.id = s.user_id LEFT JOIN merchants m ON m.id = u.merchant_id WHERE s.token_hash = ? AND s.revoked_at IS NULL AND s.expires_at > CURRENT_TIMESTAMP(3) AND u.status = 'active' LIMIT 1", [hash]);
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
    const [rows] = await this.pool.query<any[]>("SELECT m.id, m.name, m.slug, m.status, m.storefront_name AS storefrontName, m.storefront_slogan AS storefrontSlogan, m.config_version AS configVersion, m.created_at AS createdAt, m.updated_at AS updatedAt, mc.payload AS configPayload, u.id AS userId, u.username FROM merchants m LEFT JOIN merchant_configs mc ON mc.merchant_id = m.id AND mc.status = 'published' AND mc.version = (SELECT MAX(c2.version) FROM merchant_configs c2 WHERE c2.merchant_id = m.id AND c2.status = 'published') LEFT JOIN users u ON u.merchant_id = m.id AND u.role = 'merchant' WHERE m.deleted_at IS NULL ORDER BY m.created_at DESC");
    return rows.map((row) => {
      const payload = this.parseJson(row.configPayload);
      return { id: row.id, name: row.name, slug: row.slug, status: row.status, storefrontName: row.storefrontName, storefrontSlogan: row.storefrontSlogan, configVersion: row.configVersion, createdAt: row.createdAt, updatedAt: row.updatedAt, logoUrl: payload?.merchant?.logoUrl ?? '', userId: row.userId ?? null, username: row.username ?? null };
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
    const [rows] = await this.pool.query<any[]>("SELECT mc.payload FROM merchant_configs mc JOIN merchants m ON m.id = mc.merchant_id WHERE m.slug = ? AND m.deleted_at IS NULL AND m.status = 'active' AND mc.status = 'published' ORDER BY mc.version DESC LIMIT 1", [slug]);
    return rows[0]?.payload ? this.parseJson(rows[0].payload) : null;
  }
  async loadConfigAdmin(slug: string): Promise<Record<string, unknown> | null> {
    if (!this.pool) return null;
    const [rows] = await this.pool.query<any[]>("SELECT mc.payload FROM merchant_configs mc JOIN merchants m ON m.id = mc.merchant_id WHERE m.slug = ? AND m.deleted_at IS NULL AND mc.status = 'published' ORDER BY mc.version DESC LIMIT 1", [slug]);
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
    const [rows] = await this.pool.query<any[]>('SELECT config_version AS v FROM merchants WHERE slug = ? AND deleted_at IS NULL LIMIT 1', [slug]);
    return rows[0]?.v ?? 1;
  }

  /** 安装向导获取连接池执行 DDL/DML */
  getPool() { return this.pool; }

  /** users 表是否有数据（安装向导判断依据） */
  async hasUsers() {
    if (!this.pool) return false;
    try {
      const [rows] = await this.pool.query<any[]>('SELECT COUNT(*) AS n FROM users');
      return Number(rows[0]?.n ?? 0) > 0;
    } catch { return false; }
  }

  /** 安装向导完成后重连数据库（用新的 .env 配置） */
  async reconnect() {
    if (this.pool) { await this.pool.end().catch(() => {}); this.pool = undefined; }
    await this.onModuleInit();
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

  /** 商户 id 缓存：按旧标识清除、新标识写入（改 slug 后立刻生效） */
  renameSlugCache(oldSlug: string, newSlug: string) {
    const id = this.merchantIds.get(oldSlug);
    this.merchantIds.delete(oldSlug);
    this.merchantIds.delete(newSlug);
    if (id) this.merchantIds.set(newSlug, id);
  }

  /** 显式清除某个标识的 id 缓存（删除商户后调用，避免残留映射） */
  forgetMerchantId(slug?: string) { if (slug) this.merchantIds.delete(slug) }
  /** 按标识读取商户 id（公开，供改账号后刷新缓存回源） */
  async merchantId(slug: string) {
    if (this.merchantIds.has(slug)) return this.merchantIds.get(slug);
    if (!this.pool) return undefined;
    const [rows] = await this.pool.query<any[]>("SELECT id FROM merchants WHERE slug = ? AND status = 'active' AND deleted_at IS NULL LIMIT 1", [slug]);
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

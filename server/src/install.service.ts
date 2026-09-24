import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { createConnection } from 'mysql2/promise';
import { readFile, writeFile } from 'node:fs/promises';
import { randomBytes, scrypt as scryptCb } from 'node:crypto';
import { join } from 'node:path';
import { DatabaseService } from './database.service';

const scryptAsync = (password: string, salt: string, keylen: number) =>
  new Promise<Buffer>((resolve, reject) => scryptCb(password, salt, keylen, (err, key) => (err ? reject(err) : resolve(key))));



export interface InstallDto {
  dbHost: string;
  dbPort?: number;
  dbName: string;
  dbUser: string;
  dbPassword: string;
  adminUsername: string;
  adminPassword: string;
  merchantName?: string;
  merchantSlug?: string;
}

@Injectable()
export class InstallService {
  constructor(private readonly database: DatabaseService) {}

  /** 已安装 = 数据库已配置 且 users 表可查且有数据 */
  async getStatus(): Promise<{ installed: boolean }> {
    if (!this.database.configured) return { installed: false };
    try {
      const hasUsers = await this.database.hasUsers();
      return { installed: hasUsers };
    } catch {
      return { installed: false };
    }
  }

  async install(dto: InstallDto) {
    const status = await this.getStatus();
    if (status.installed) throw new ForbiddenException('系统已安装，如需重新安装请先清空数据库');

    // 1) 校验输入
    const dbHost = String(dto.dbHost || '').trim();
    const dbPort = Number(dto.dbPort || 3306);
    const dbName = String(dto.dbName || '').trim().replace(/[^w]/g, '');
    const dbUser = String(dto.dbUser || '').trim();
    const dbPassword = String(dto.dbPassword || '');
    const adminUsername = String(dto.adminUsername || '').trim();
    const adminPassword = String(dto.adminPassword || '');
    const merchantName = String(dto.merchantName || '示例商户').trim();
    const merchantSlug = String(dto.merchantSlug || 'default').trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');

    if (!dbHost || !dbName || !dbUser) throw new BadRequestException('数据库连接信息不完整');
    if (!adminUsername) throw new BadRequestException('管理员用户名不能为空');
    if (adminPassword.length < 8) throw new BadRequestException('管理员密码至少 8 位');
    if (!merchantSlug) throw new BadRequestException('商家标识不能为空');

    // 2) 测试连接（先连 mysql 系统库，建库）
    const sysConn = await createConnection({ host: dbHost, port: dbPort, user: dbUser, password: dbPassword }).catch((err) => {
      throw new BadRequestException('数据库连接失败：' + (err.code || err.message));
    });
    await sysConn.query('CREATE DATABASE IF NOT EXISTS \`' + dbName + '\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
    await sysConn.end();

    // 3) 连接目标库，执行建表
    const conn = await createConnection({ host: dbHost, port: dbPort, user: dbUser, password: dbPassword, database: dbName, multipleStatements: true });
    const migrationSql = await readFile(join(process.cwd(), 'database', 'migrations', '001_initial.sql'), 'utf8');
    await conn.query(migrationSql);
    try {
      const sql2 = await readFile(join(process.cwd(), 'database', 'migrations', '002_soft_delete_merchants.sql'), 'utf8');
      await conn.query(sql2);
    } catch (e: any) {
      if (!String(e?.message || '').includes('Duplicate column')) throw e;
    }
    await conn.end();

    // 4) 写 .env（保留其他变量）
    await this.writeEnv({ dbHost, dbPort: String(dbPort), dbName, dbUser, dbPassword, adminUsername, adminPassword, merchantSlug });

    // 5) 更新 process.env + 重连数据库
    process.env.DB_HOST = dbHost;
    process.env.DB_PORT = String(dbPort);
    process.env.DB_NAME = dbName;
    process.env.DB_USER = dbUser;
    process.env.DB_PASSWORD = dbPassword;
    await this.database.reconnect();

    // 6) seed 管理员 + 商家 + 默认配置
    await this.seedAdmin(adminUsername, adminPassword);
    await this.seedMerchant(merchantName, merchantSlug);

    return { ok: true, adminUsername, merchantSlug };
  }

  private async writeEnv(vars: Record<string, string>) {
    const envPath = join(process.cwd(), '.env');
    let existing = '';
    try { existing = await readFile(envPath, 'utf8'); } catch { /* 不存在则新建 */ }
    const updates: Record<string, string> = {
      DB_HOST: vars.dbHost,
      DB_PORT: String(vars.dbPort),
      DB_NAME: vars.dbName,
      DB_USER: vars.dbUser,
      DB_PASSWORD: vars.dbPassword,
      SUPER_ADMIN_USERNAME: vars.adminUsername,
      SUPER_ADMIN_PASSWORD: vars.adminPassword,
      MERCHANT_SLUG: vars.merchantSlug,
    };
    const lines = existing.split('\n').filter(l => l.trim() && !l.startsWith('#'));
    const seen = new Set<string>();
    const result = lines.map(l => {
      const key = l.split('=')[0].trim();
      seen.add(key);
      return updates[key] !== undefined ? key + '=' + updates[key] : l;
    });
    for (const [k, v] of Object.entries(updates)) {
      if (!seen.has(k)) result.push(k + '=' + v);
    }
    await writeFile(envPath, result.join('\n') + '\n', 'utf8');
  }

  private async seedAdmin(username: string, password: string) {
    const salt = randomBytes(16).toString('hex');
    const hash = await scryptAsync(password, salt, 64);
    const passwordHash = salt + '$' + hash.toString('hex');
    const conn = this.database.getPool();
    if (!conn) return;
    await conn.query(
      "INSERT INTO users (id, username, password_hash, role, merchant_id, status) VALUES (REPLACE(UUID(),'-',''), ?, ?, 'super_admin', NULL, 'active') ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), status = 'active'",
      [username, passwordHash],
    );
  }

  private async seedMerchant(name: string, slug: string) {
    const conn = this.database.getPool();
    if (!conn) return;
    const merchantId = randomBytes(13).toString('hex');
    await conn.query(
      "INSERT INTO merchants (id, name, slug, status, storefront_name, storefront_slogan) VALUES (?, ?, ?, 'active', ?, ?) ON DUPLICATE KEY UPDATE status = 'active'",
      [merchantId, name, slug, name, '专业包装 · 智能报价'],
    );
    const [rows] = await conn.query<import('mysql2/promise').RowDataPacket[]>('SELECT id FROM merchants WHERE slug = ? LIMIT 1', [slug]);
    const mid = (rows as any[])[0]?.id;
    if (!mid) return;
    await conn.query(
      "INSERT INTO merchant_configs (id, merchant_id, version, status, payload) SELECT REPLACE(UUID(),'-',''), ?, 1, 'published', ? FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM merchant_configs WHERE merchant_id = ? AND status = 'published')",
      [mid, JSON.stringify({ merchant: { name, slug, slogan: '专业包装 · 智能报价' }, product: { name: '卡纸盒 · 双插盒', boxType: '双插盒' }, shipping: { freeThreshold: 1000, fee: 18 }, contact: {}, contactEntries: [], topbarLinks: [], contentBlocks: [], storefrontLayout: 'b', storefrontTheme: 'green' }), mid],
    );
    // 商家账号（如与管理员同名则跳过）
    const merchantUsername = slug;
    const salt = randomBytes(16).toString('hex');
    const hash = await scryptAsync('change-me', salt, 64);
    const passwordHash = salt + '$' + hash.toString('hex');
    await conn.query(
      "INSERT INTO users (id, username, password_hash, role, merchant_id, status) VALUES (REPLACE(UUID(),'-',''), ?, ?, 'merchant', ?, 'active') ON DUPLICATE KEY UPDATE status = 'active'",
      [merchantUsername, passwordHash, mid],
    );
  }
}

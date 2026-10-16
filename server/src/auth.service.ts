import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

/**
 * 密码哈希格式（必须与历史账号一致，不得更改）：
 * password_hash = salt + '$' + hex(scrypt(password, salt, 64))，salt = randomBytes(16).toString('hex')
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  return salt + '$' + (await scryptAsync(password, salt, 64)).toString('hex');
}

/** 生成便于抄写的随机密码：去掉 0/O/1/l/I/o 等易混字符 */
export function generatePassword(length = 12): string {
  const alphabet = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}
import { DatabaseService } from './database.service';

type Role = 'super_admin' | 'merchant';
type User = { id?: string; username: string; role: Role; merchantId?: string; merchantSlug?: string; password?: string; passwordHash?: string };
type Session = { token: string; id?: string; username: string; role: Role; merchantId?: string; merchantSlug?: string };
/** 对外身份信息（GET /auth/me 返回；id 供审计记录 actor 使用） */
export type MeResult = { id?: string; username: string; role: Role; merchantId?: string; merchantSlug?: string };

/** 异步 scrypt：避免阻塞事件循环（scryptSync 是 CPU 密集同步调用） */
const scryptAsync = (password: string, salt: string, keylen: number) =>
  new Promise<Buffer>((resolve, reject) => scrypt(password, salt, keylen, (err, key) => (err ? reject(err) : resolve(key))));

@Injectable()
export class AuthService {
  private readonly sessions = new Map<string, Session>();
  private readonly users: User[] = [
    { username: process.env.SUPER_ADMIN_USERNAME ?? 'admin', password: process.env.SUPER_ADMIN_PASSWORD ?? 'admin', role: 'super_admin' },
    { username: process.env.MERCHANT_USERNAME ?? 'merchant', password: process.env.MERCHANT_PASSWORD ?? 'merchant', role: 'merchant', merchantSlug: process.env.MERCHANT_SLUG ?? 'default' },
  ];

  constructor(private readonly database: DatabaseService) {}

  async login(username: string, password: string) {
    const persisted = await this.database.findUser(username);
    const fallback = !this.database.configured ? this.users.find((item) => item.username === username && item.password === password) : undefined;
    const valid = persisted ? await this.verify(password, persisted.passwordHash) : Boolean(fallback);
    if (!valid) throw new UnauthorizedException('账号或密码错误');
    const user: User = persisted ? { id: persisted.id, username: persisted.username, role: persisted.role, merchantId: persisted.merchantId, merchantSlug: persisted.merchantSlug, passwordHash: persisted.passwordHash } : fallback!;
    const token = randomBytes(32).toString('hex');
    const session: Session = { token, ...(user.id ? { id: user.id } : {}), username: user.username, role: user.role, ...(user.merchantId ? { merchantId: user.merchantId } : {}), ...(user.merchantSlug ? { merchantSlug: user.merchantSlug } : {}) };
    this.sessions.set(token, session);
    await this.database.saveSession(token, session.username);
    return { accessToken: token, tokenType: 'Bearer', user: { username: session.username, role: session.role, merchantSlug: session.merchantSlug } };
  }

  async logout(token?: string) {
    if (!token) return { revoked: false };
    this.sessions.delete(token);
    await this.database.revokeSession(token);
    return { revoked: true };
  }

  async me(token?: string): Promise<MeResult> {
    const session = token ? this.sessions.get(token) : undefined;
    if (session) return { id: session.id, username: session.username, role: session.role, merchantId: session.merchantId, merchantSlug: session.merchantSlug };
    if (token) {
      const persisted = await this.database.findSession(token);
      if (persisted) return { id: persisted.id, username: persisted.username, role: persisted.role, merchantId: persisted.merchantId, merchantSlug: persisted.merchantSlug };
    }
    throw new UnauthorizedException('登录已失效');
  }

  /** 清理内存会话（改密后强制重新登录）；用户 id 优先，username 在 users 表唯一可兜底 */
  revokeSessions(identity: { username?: string; id?: string }) {
    let removed = 0;
    if (!identity.username && !identity.id) return removed;
    for (const [token, session] of this.sessions) {
      const match = (identity.id && session.id === identity.id) || (identity.username && session.username === identity.username);
      if (match) { this.sessions.delete(token); removed++; }
    }
    return removed;
  }

  /** 用户自助改密：校验原密码 → 更新哈希 → 撤销全部会话（含当前 token），明文不落库 */
  async changePassword(username: string | undefined, currentPassword: string, newPassword: string) {
    if (!username) throw new UnauthorizedException('登录已失效');
    if (!this.database.configured) throw new BadRequestException('当前账号由环境变量管理，请在服务器上修改');
    const record = await this.database.findUserRecord(username);
    if (!record) throw new BadRequestException('原密码不正确');
    if (!(await this.verify(currentPassword, record.passwordHash))) throw new BadRequestException('原密码不正确');
    if (!newPassword || newPassword.length < 6) throw new BadRequestException('新密码至少 6 位');
    await this.database.updatePassword(record.id, await hashPassword(newPassword));
    this.revokeSessions({ id: record.id, username: record.username });
    await this.database.revokeUserSessions(record.id);
    await this.database.audit({ actorUserId: record.id, merchantId: record.merchantId ?? null, action: 'user.password.change', resourceType: 'user', resourceId: record.id, payload: { username: record.username } });
    return { ok: true, reLogin: true };
  }

  private async verify(password: string, encoded: string) {
    const [salt, digest] = encoded.split('$');
    if (!salt || !digest) return false;
    const actual = await scryptAsync(password, salt, 64);
    const expected = Buffer.from(digest, 'hex');
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  }
}
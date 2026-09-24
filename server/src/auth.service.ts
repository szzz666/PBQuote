import { Injectable, UnauthorizedException } from '@nestjs/common';
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { DatabaseService } from './database.service';

type Role = 'super_admin' | 'merchant';
type User = { username: string; role: Role; merchantSlug?: string; password?: string; passwordHash?: string };
type Session = { token: string; username: string; role: Role; merchantSlug?: string };

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
    const user: User = persisted ? { username: persisted.username, role: persisted.role, merchantSlug: persisted.merchantSlug, passwordHash: persisted.passwordHash } : fallback!;
    const token = randomBytes(32).toString('hex');
    const session: Session = { token, username: user.username, role: user.role, ...(user.merchantSlug ? { merchantSlug: user.merchantSlug } : {}) };
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

  async me(token?: string) {
    const session = token ? this.sessions.get(token) : undefined;
    if (session) return { username: session.username, role: session.role, merchantSlug: session.merchantSlug };
    if (token) {
      const persisted = await this.database.findSession(token);
      if (persisted) return { username: persisted.username, role: persisted.role, merchantSlug: persisted.merchantSlug };
    }
    throw new UnauthorizedException('登录已失效');
  }

  private async verify(password: string, encoded: string) {
    const [salt, digest] = encoded.split('$');
    if (!salt || !digest) return false;
    const actual = await scryptAsync(password, salt, 64);
    const expected = Buffer.from(digest, 'hex');
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  }
}
#!/usr/bin/env node
/**
 * PBQuote 服务器端密码重置 / 账号查看（独立脚本，使用 server/node_modules 里已有的 mysql2）。
 *
 * 用法（在服务器上）：
 *   cd /www/wwwroot/PBQuote/server && node scripts/reset-password.js <username> [newPassword]
 *   cd /www/wwwroot/PBQuote/server && node scripts/reset-password.js --list
 *
 * 数据库配置与应用一致：读取 server/.env（不覆盖已有环境变量），
 * 再回落到 DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASSWORD 环境变量或内置默认值。
 * 明文密码只打印到终端，不写入数据库（库里仍是 salt$scrypt 哈希）。
 */
'use strict';

const { readFileSync } = require('node:fs');
const { randomBytes, scryptSync } = require('node:crypto');
const { resolve } = require('node:path');
const mysql = require('mysql2/promise');

const DEFAULTS = { DB_HOST: '127.0.0.1', DB_PORT: '3306', DB_NAME: 'pbquote', DB_USER: 'pbquote', DB_PASSWORD: 'pB6C5h8f4mfHFYHW' };

/** 与应用 env.ts 一致的极简 .env 加载：已存在的环境变量优先，不覆盖 */
function loadEnvFile() {
  const file = resolve(process.cwd(), '.env');
  let content;
  try {
    content = readFileSync(file, 'utf8');
  } catch {
    return; // 没有 .env（例如容器里只给环境变量）就跳过
  }
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

/** 生成便于抄写的随机密码：去掉 0/O/1/l/I/o 等易混字符 */
function generatePassword(length = 12) {
  const alphabet = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

/** 与应用完全一致的密码哈希格式：salt + '$' + hex(scrypt(password, salt, 64)) */
function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  return salt + '$' + scryptSync(password, salt, 64).toString('hex');
}

function usage() {
  console.log('用法:');
  console.log('  node scripts/reset-password.js <username> [newPassword]   重置密码（不传新密码则随机生成 12 位）');
  console.log('  node scripts/reset-password.js --list                     列出全部账号');
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('-h') || args.includes('--help')) return usage();
  loadEnvFile();
  const config = {
    host: process.env.DB_HOST || DEFAULTS.DB_HOST,
    port: Number(process.env.DB_PORT || DEFAULTS.DB_PORT),
    database: process.env.DB_NAME || DEFAULTS.DB_NAME,
    user: process.env.DB_USER || DEFAULTS.DB_USER,
    password: process.env.DB_PASSWORD ?? DEFAULTS.DB_PASSWORD,
  };
  let connection;
  try {
    connection = await mysql.createConnection(config);
  } catch (error) {
    console.error('[错误] 无法连接 MySQL ' + config.host + ':' + config.port + '/' + config.database + '：' + (error && error.message ? error.message : error));
    process.exitCode = 1;
    return;
  }
  try {
    if (args[0] === '--list' || args[0] === '-l' || args[0] === 'list') {
      const [rows] = await connection.query(
        'SELECT username, role, status, merchant_id AS merchantId, (SELECT slug FROM merchants m WHERE m.id = u.merchant_id) AS merchantSlug FROM users u ORDER BY role, username',
      );
      console.log('共 ' + rows.length + ' 个账号：');
      console.log('USERNAME	ROLE	MERCHANT_SLUG	STATUS');
      for (const row of rows) {
        console.log([row.username, row.role, row.merchantSlug || '-', row.status].join('	'));
      }
      return;
    }
    const username = args[0];
    if (!username) {
      usage();
      process.exitCode = 1;
      return;
    }
    const password = args[1] || generatePassword(12);
    const [rows] = await connection.query('SELECT id, username, role, status FROM users WHERE username = ? LIMIT 1', [username]);
    const user = rows[0];
    if (!user) {
      console.error('[错误] 未找到账号：' + username + '（可用 --list 查看全部账号）');
      process.exitCode = 1;
      return;
    }
    await connection.query('UPDATE users SET password_hash = ? WHERE id = ?', [hashPassword(password), user.id]);
    // 改密后撤销该账号全部未撤销会话，强制重新登录
    const [revoked] = await connection.query('UPDATE sessions SET revoked_at = CURRENT_TIMESTAMP(3) WHERE user_id = ? AND revoked_at IS NULL', [user.id]);
    console.log('用户名: ' + user.username);
    console.log('新密码: ' + password);
    console.log('已撤销会话: ' + Number(revoked.affectedRows || 0) + ' 个');
    console.log('（明文密码仅本次显示，请立即抄写并妥善保存）');
  } catch (error) {
    console.error('[错误] 执行失败：' + (error && error.message ? error.message : error));
    process.exitCode = 1;
  } finally {
    await connection.end().catch(() => {});
  }
}

main();

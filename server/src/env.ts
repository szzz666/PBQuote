import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

/**
 * 极简 .env 加载器：服务启动时自动读取 server/.env 并注入 process.env。
 * 已存在的同名环境变量优先（不覆盖），方便部署时用环境变量覆盖 .env。
 */
export async function loadEnvFile(): Promise<void> {
  const file = resolve(process.cwd(), '.env');
  let content: string;
  try {
    content = await readFile(file, 'utf8');
  } catch {
    return; // 没有 .env 就跳过，全部依赖真实环境变量
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

# PBQuote 部署指南（单台 Linux 服务器 + PM2）

适用场景：一台 Linux 服务器，Node 直跑服务端（PM2 守护），MySQL 本机或远程。
前端构建为静态文件，由服务端同域托管或任意静态服务器/Nginx 托管。

## 1. 服务器准备

```bash
# Node.js 20 LTS（示例使用 NodeSource）
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# pnpm（前端构建用）
sudo npm i -g pnpm

# PM2（进程守护）
sudo npm i -g pm2

# MySQL 8（本机安装示例，或使用远程实例）
sudo apt-get install -y mysql-server
```

## 2. 获取代码

```bash
cd /opt
# 将项目目录放到 /opt/pbquote（git clone 或上传）
cd /opt/pbquote
```

## 3. 安装依赖

```bash
pnpm --dir client install
npm --prefix server install
```

## 4. 配置环境变量

```bash
cp server/.env.example server/.env
vi server/.env
```

必填项：

| 变量 | 说明 | 示例 |
| --- | --- | --- |
| DB_HOST / DB_PORT | MySQL 地址 | 127.0.0.1 / 3306 |
| DB_NAME / DB_USER / DB_PASSWORD | 数据库与账号 | pbquote / pbquote / 强密码 |
| DB_AUTO_MIGRATE | 首次启动自动建表 | true |
| PORT | 服务端口 | 3000 |
| SUPER_ADMIN_USERNAME / PASSWORD | 管理员账号 | admin / 强密码 |
| MERCHANT_USERNAME / PASSWORD | 商家账号 | merchant / 强密码 |
| MERCHANT_SLUG | 商家前台路径 | jinfuying |

> ⚠️ 生产环境必须修改默认密码（change-me），并确认 .env 权限为 600：
> `chmod 600 server/.env`

## 5. 数据库初始化

```sql
CREATE DATABASE pbquote DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'pbquote'@'%' IDENTIFIED BY '数据库密码';
GRANT ALL PRIVILEGES ON pbquote.* TO 'pbquote'@'%';
FLUSH PRIVILEGES;
```

建表（二选一）：
- `DB_AUTO_MIGRATE=true` 时服务端首次启动自动执行；
- 或手动执行 `server/database/migrations/001_initial.sql` 与 `002_soft_delete_merchants.sql`。

写入默认商家与账号（幂等）：

```bash
cd /opt/pbquote
node tools/seed-default-merchant.mjs
node tools/verify-pbquote-mysql.mjs   # 校验
```

## 6. 构建

```bash
pnpm --dir client run build          # 产物：client/dist
npm --prefix server run build        # 产物：server/dist
```

## 7. 启动（PM2）

```bash
cd /opt/pbquote/server
pm2 start dist/main.js --name pbquote-api
pm2 save
pm2 startup    # 按提示执行输出的命令，实现开机自启
pm2 logs pbquote-api   # 查看日志
```

服务端监听 `PORT`（默认 3000），接口前缀 `/api/v1`。
健康检查：`curl http://127.0.0.1:3000/api/v1/health`

## 8. 前端托管（二选一）

**A. 由 Node 服务端同域托管（推荐，免去跨域）**：把 `client/dist`
交给 Nginx 反代到 Node，或直接在 NestJS 中启用 ServeStaticModule。

**B. Nginx 静态托管 + 反代 API**：

```nginx
server {
  listen 80;
  server_name your-domain.com;
  root /opt/pbquote/client/dist;
  index index.html;
  location / { try_files $uri $uri/ /index.html; }   # SPA 路由
  location /api/ { proxy_pass http://127.0.0.1:3000; proxy_set_header Host $host; }
  location /uploads/ { proxy_pass http://127.0.0.1:3000; }
}
```

## 9. 升级流程

```bash
cd /opt/pbquote
# 更新代码后：
pnpm --dir client install && npm --prefix server install
pnpm --dir client run build && npm --prefix server run build
pm2 restart pbquote-api
node tools/verify-pbquote-mysql.mjs   # 校验数据库
```

## 常见问题

- **启动报“无法连接 MySQL”**：检查 .env 的 DB_* 与 MySQL 是否允许远程连接（bind-address、用户 host）。
- **登录提示“账号或密码错误”**：确认已执行 seed，且 .env 的 SUPER_ADMIN_*/MERCHANT_* 与 seed 时一致。
- **前台 404**：确认商家 slug 与访问路径 /shop/{slug} 一致（seed 默认 jinfuying）。
- **上传图片 404**：确认服务端从 server/ 目录启动（uploads 目录相对于 server/）。
- **端口占用**：`lsof -nP -iTCP:3000 -sTCP:LISTEN` 查找并停止占用进程。

## 生产检查清单

- [ ] 修改默认账号密码（admin/change-me、merchant/change-me）
- [ ] .env 权限 600，不进入版本库
- [ ] 配置 HTTPS（Nginx + certbot）
- [ ] MySQL 定期备份（mysqldump 定时任务）
- [ ] PM2 开机自启已执行（pm2 startup + pm2 save）
- [ ] 防火墙仅放行 80/443（3000 仅本机访问）

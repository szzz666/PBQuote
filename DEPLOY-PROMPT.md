# PBQuote 自动同步部署提示词

> 用法：把「任务模板」那一段复制给 AI（连接信息已内联），再描述你要改的功能即可。
> 文件内含服务器密码，请勿外传或提交到公开仓库。

---

## 零、SSH 连接信息（部署必备，已内联进模板）

```
主机：111.230.227.159      端口：22      用户：root      密码：Zdbjxtfwq111
认证方式：密码登录（无密钥 / 无 sshpass）
指纹：SHA256:pkhdfzt/5rR+Op2NY/OMjOBlP+ugJdeakMOvZb8R3B0
本机连接方式：/usr/bin/expect（macOS 自带），禁用 WebSSH
```

本机执行任一条远程命令的标准姿势（远程命令先落成 .sh，再 scp + ssh 执行）：

```bash
# 1) 写远程脚本
cat > /tmp/remote.sh <<'EOF'
#!/bin/bash
set -e
hostname && date
EOF

# 2) 写 expect 驱动脚本（连接信息就在这里）
cat > /tmp/run.exp <<'EOF'
#!/usr/bin/expect -f
set timeout 180
spawn bash -c "scp -o StrictHostKeyChecking=no /tmp/remote.sh root@111.230.227.159:/tmp/remote.sh && ssh -o StrictHostKeyChecking=no root@111.230.227.159 'bash /tmp/remote.sh'"
expect {
  "*assword:" { send "Zdbjxtfwq111\r"; exp_continue }
  eof
}
EOF

# 3) 执行（过滤登录横幅）
expect /tmp/run.exp 2>&1 | grep -vE "Warning|assword|Last login|release|System info|Usage of|Memory|ubuntu|updates|Learn more|ESM|security|spawn bash|ETA$"
```

---

## 任务模板（日常直接复制这段）

```
请修改 <你要改的功能>，改完后自动同步到服务器并验证。

【SSH 连接】主机 111.230.227.159，端口 22，用户 root，密码 Zdbjxtfwq111（密码登录，无密钥）。
本机用 /usr/bin/expect 驱动 scp/ssh（不要用 WebSSH，会话会假死）：
  spawn bash -c "scp -o StrictHostKeyChecking=no 本地文件 root@111.230.227.159:/远端路径 && ssh -o StrictHostKeyChecking=no root@111.230.227.159 'bash /tmp/remote.sh'"
  expect { "*assword:" { send "Zdbjxtfwq111\r"; exp_continue } eof }
远程命令一律先写成 .sh 再 scp 执行，不要在 expect 里内联复杂引号。

【部署目标】前端 /www/wwwroot/PBQuote/client/dist；后端 /www/wwwroot/PBQuote/server（pm2 进程名 main，端口 8080）。

【流程】
1. 改本地源码：/Users/mac/IdeaProjects/PBQuote 下的 client/ 或 server/
2. 前端：cd client && npm run build → tar -czf /tmp/dist.tgz -C dist . → 上传解包替换 client/dist
   （备份旧目录，chown -R www:www，并把新 js 复制到历史 hash 文件名做别名，兼容旧缓存页面）
3. 后端：cd server && npm run build → tar -czf /tmp/server.tgz dist database package.json → 上传替换
   server/dist（备份为 dist.old）→ pm2 restart main --update-env
4. 上传前后都要校验 md5 一致（本地用 node crypto，服务器用 md5sum）
5. 外网验证：首页 200 且 js hash 是最新的、/api/v1/health 200、/uploads/ 图片 200、
   /api/v1/storefront/default/config 200、admin/Admin@123456 登录返回 token
6. 汇报：改了哪些文件、验证结果、是否还需要我操作

【nginx】配置 /www/server/panel/vhost/nginx/html_111.230.227.159.conf，改前备份，改后 nginx -t && nginx -s reload。
必须保留 location ^~ /uploads/ 的 ^~（否则图片被静态正则规则抢走 → 404）。

详细脚本、pm2 环境变量、避坑清单见 DEPLOY-PROMPT.md。
```

---

## 一、服务器与项目信息

| 项 | 值 |
|---|---|
| 服务器 IP | `111.230.227.159` |
| SSH | 端口 `22`，用户 `root`，密码 `Zdbjxtfwq111`（密码登录，无密钥） |
| 系统 | Ubuntu + 宝塔面板（面板端口 18488，nginx 80/888） |
| 后端目录 | `/www/wwwroot/PBQuote/server`，入口 `dist/main.js` |
| 后端进程 | pm2 名称 `main`，端口 `8080`，全局前缀 `api/v1` |
| 前端目录 | `/www/wwwroot/PBQuote/client/dist`（nginx root） |
| 上传目录 | `/www/wwwroot/PBQuote/server/uploads`（后端静态服务，前缀 `/uploads/`） |
| nginx 配置 | `/www/server/panel/vhost/nginx/html_111.230.227.159.conf` |
| 数据库 | MySQL 127.0.0.1:3306，库 `pbquote`，用户 `pbquote`，密码 `pB6C5h8f4mfHFYHW` |
| 管理员 | `admin` / `Admin@123456`（super_admin） |
| 商户 | `default` / `Merchant@123456`（merchant，slug=default） |
| 访问地址 | http://111.230.227.159 （前端 hash 路由 `/#/`） |

本地开发机：macOS，项目 `/Users/mac/IdeaProjects/PBQuote`，node 在 `/usr/local/bin`（执行 npm 时需带 `PATH=/usr/local/bin:$PATH`）。

---

## 二、传输方式：expect + scp/ssh（唯一可靠方式）

本机**没有 sshpass**，但**有 `/usr/bin/expect`**。WebSSH（127.0.0.1:8080）会话经常假死、输出丢失，**不要用它做部署**。

### 1. 通用传输模板

先把要跑的远程命令写成脚本文件（避免 expect 引号转义地狱），再上传执行：

```bash
#!/usr/bin/expect -f
set timeout 180
spawn bash -c "scp -o StrictHostKeyChecking=no /tmp/dist.tgz root@111.230.227.159:/tmp/dist.tgz && scp -o StrictHostKeyChecking=no /tmp/deploy.sh root@111.230.227.159:/tmp/deploy.sh && ssh -o StrictHostKeyChecking=no root@111.230.227.159 'bash /tmp/deploy.sh'"
expect {
  "*assword:" { send "Zdbjxtfwq111\r"; exp_continue }
  eof
}
```

执行：`expect /tmp/deploy.exp 2>&1 | grep -vE "Warning|assword|Last login|release|System info|Usage of|Memory|ubuntu|updates|Learn more|ESM|security|spawn bash|ETA$"`

**要点**
- 远程命令一定写进 `.sh` 文件再 `scp`，**不要**在 expect 里内联复杂引号（会出现 `invalid command name "^\""`）
- 需要动态内容时用 `bash -s < script.sh` 或 python heredoc
- 登录横幅会污染输出，用上面的 `grep -vE` 过滤

### 2. 前端部署脚本模板 `/tmp/deploy-client.sh`

```bash
#!/bin/bash
set -e
cd /www/wwwroot/PBQuote/client
rm -rf dist.new && mkdir dist.new
tar -xzf /tmp/dist.tgz -C dist.new
rm -rf dist.old && mv dist dist.old && mv dist.new dist
cd dist/assets
NEW=$(ls index-*.js | head -1)
# 兼容旧缓存页面：把新包内容复制到历史文件名
for old in index-CRR2r_GD.js index-FxF-ds-S.js index-CO17Zp9Y.js; do cp -f "$NEW" "$old"; done
chown -R www:www /www/wwwroot/PBQuote/client/dist
chmod -R 755 /www/wwwroot/PBQuote/client/dist
grep -oE 'assets/index-[a-zA-Z0-9_-]+\.js' /www/wwwroot/PBQuote/client/dist/index.html
```

前端打包命令（本地）：
```bash
cd /Users/mac/IdeaProjects/PBQuote/client && npm run build
rm -f /tmp/dist.tgz && tar -czf /tmp/dist.tgz -C dist .
```

### 3. 后端部署脚本模板 `/tmp/deploy-server.sh`

```bash
#!/bin/bash
set -e
cd /www/wwwroot/PBQuote/server
rm -rf dist.new && mkdir dist.new
tar -xzf /tmp/server.tgz -C dist.new
rm -rf dist.old && mv dist dist.old && mv dist.new/dist dist
[ -d dist.new/database ] && rm -rf database && mv dist.new/database database
rm -rf dist.new
chown -R root:root dist
pm2 restart main --update-env
sleep 5
curl -s -m 5 http://127.0.0.1:8080/api/v1/health
```

后端打包命令（本地）：
```bash
cd /Users/mac/IdeaProjects/PBQuote/server && npm run build
rm -f /tmp/server.tgz && tar -czf /tmp/server.tgz dist database package.json
```

---

## 三、pm2 环境变量（重启时必须保留）

后端 dist 里**没有 dotenv**，环境变量靠 pm2 命令行注入。若 `pm2 restart` 后配置丢失，用这条重新拉起：

```bash
PORT=8080 DB_HOST=127.0.0.1 DB_PORT=3306 DB_NAME=pbquote DB_USER=pbquote \
DB_PASSWORD=pB6C5h8f4mfHFYHW DB_AUTO_MIGRATE=true DB_POOL_SIZE=10 \
SUPER_ADMIN_USERNAME=admin SUPER_ADMIN_PASSWORD=Admin@123456 \
MERCHANT_SLUG=default MERCHANT_NAME="示例商户" MERCHANT_USERNAME=default MERCHANT_PASSWORD=Merchant@123456 \
pm2 start dist/main.js --name main
```

---

## 四、nginx 关键配置（改动后必须 `nginx -t && nginx -s reload`）

```nginx
location /api/          { proxy_pass http://127.0.0.1:8080; proxy_http_version 1.1; }
location ^~ /uploads/   { proxy_pass http://127.0.0.1:8080; }   # ^~ 必须保留！
location = /index.html  { add_header Cache-Control "no-cache, no-store, must-revalidate"; }
location /              { try_files $uri $uri/ /index.html; add_header Cache-Control "no-cache"; }
```

改配置前先备份：`cp $CONF $CONF.bak.$(date +%s)`；用 `python3 heredoc` 在最后一个 `}` 前插入，**不要用 sed**（曾把配置改坏）。

---

## 五、避坑清单（都是踩过的）

1. **`location ^~ /uploads/` 的 `^~` 不能去掉**。宝塔有 `location ~ .*\.(png|jpg|...)$` 正则规则，优先级高于普通前缀，去掉后上传的图片全部 404。
2. **前端 API 地址必须走同源相对路径**。`client/.env.production` 里 `VITE_API_BASE_URL=/api/v1`；`client/src/api/client.js` 的生产兜底也必须是 `/api/v1`，否则打包进 `localhost:3000` → 用户浏览器请求自己电脑 → `ERR_CONNECTION_REFUSED`。
3. **不要在浏览器端写 `new URL(u, '/api/v1')`** —— base 是相对路径会抛 `Invalid URL`，导致 Vue 渲染中断。统一用 `resolveAssetUrl()`（`client/src/utils/url.js`），相对 base 时以 `window.location.origin` 兜底。
4. **前端文件名带 hash**，每次构建都变。部署后把新包复制到几个历史文件名做别名，避免旧缓存页面 404 白屏；同时 `index.html` 已配 no-cache。
5. **上传后必须校验 md5**（本地用 node crypto，服务器用 `md5sum`；macOS 没有 `md5`/`openssl md5 -q`）。
6. **数据库迁移文件必须一起上传**：`server/database/migrations/*.sql`，缺了安装/升级会失败。
7. **安装接口的历史坑**（已在本地源码修好，勿回退）：`dbName` 清洗正则必须 `/[^\w]/g`；用户/配置表 id 是 `CHAR(26)`，必须用 `randomBytes(13).toString('hex')`，**不能用 `REPLACE(UUID(),'-','')`**（32 位会报 `Data too long`）。
8. **macOS 没有 `md5` 命令**；本地算 md5 用 `node -e "console.log(require('crypto').createHash('md5').update(require('fs').readFileSync('文件')).digest('hex'))"`。
9. **不要用 WebSSH 做部署**（会话假死、输出丢失、任务体限制 ~900KB）；用 expect+scp/ssh。
10. **改完一定要外网验证**，不要只看服务器本机 curl。

---

## 六、部署后验证清单（外网）

```
http://111.230.227.159/                                    → 200，且 index.html 引用的 js 是最新 hash
http://111.230.227.159/api/v1/health                       → {"status":"ok","database":"mysql"}
http://111.230.227.159/api/v1/install/status               → {"installed":true}
http://111.230.227.159/api/v1/storefront/default/config    → 200
POST http://111.230.227.159/api/v1/auth/login              → 201，返回 accessToken
http://111.230.227.159/uploads/...                         → 200（图片经 nginx 可达）
```

登录测试：
```bash
curl -s -X POST http://111.230.227.159/api/v1/auth/login -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Admin@123456"}'
```


## 七、账号管理相关自检（商户管理 / 改密码）

```bash
# 1) 商户列表必须带出登录账号（username / userId 两个字段）
TOKEN=$(curl -s -X POST http://111.230.227.159/api/v1/auth/login -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Admin@123456"}' | node -pe 'JSON.parse(require("fs").readFileSync(0)).accessToken')
curl -s http://111.230.227.159/api/v1/admin/merchants -H "Authorization: Bearer $TOKEN"

# 2) 三个新接口未登录一律 401
curl -s -o /dev/null -w '%{http_code}\n' -X PATCH http://111.230.227.159/api/v1/admin/merchants/x/account  -H 'Content-Type: application/json' -d '{}'
curl -s -o /dev/null -w '%{http_code}\n' -X POST  http://111.230.227.159/api/v1/admin/merchants/x/password -H 'Content-Type: application/json' -d '{}'
curl -s -o /dev/null -w '%{http_code}\n' -X POST  http://111.230.227.159/api/v1/auth/password                 -H 'Content-Type: application/json' -d '{}'

# 3) 原密码错误 400 / 新密码不足 6 位 400
curl -s -X POST http://111.230.227.159/api/v1/auth/password -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"currentPassword":"wrong","newPassword":"Abcdef1"}'
```

- `PATCH /api/v1/admin/merchants/:id/account`  body `{slug?,username?}` → 200；改 slug 会**迁移图片目录 + 重写配置里的图片路径**，旧网址/旧图片直链立刻 404（无跳转），并强制该商户下线。
- `POST /api/v1/admin/merchants/:id/password` body `{password?}` → 201，空则生成 12 位随机密码；**明文只在响应里出现一次**，库里只存 scrypt 哈希，同时撤销该账号全部会话。
- `POST /api/v1/auth/password` body `{currentPassword,newPassword}` → 201 `{ok:true,reLogin:true}`，改完当前 token 立即失效，要用新密码重新登录。
- 审计：`audit_logs` 表里 `merchant.account.update` / `user.password.reset` / `user.password.change` 三种动作，没有界面，只能查库：
  ```bash
  mysql -upbquote -p'pB6C5h8f4mfHFYHW' pbquote -e "SELECT action,actor_user_id,merchant_id,created_at FROM audit_logs ORDER BY created_at DESC LIMIT 10;"
  ```
- 删除商户后**店面必须立刻 404**（本次修的就是这个）：`merchants.deleted_at` 过滤 + 内存里 slug 缓存（`merchantIds` / `configs`）都要清。自检：新建→访问 200→删除→再访问必须 404（不用重启）。

## 八、超管/商户忘记密码：服务器 CLI

```bash
cd /www/wwwroot/PBQuote/server
node scripts/reset-password.js --list                  # 列出全部账号（用户名/角色/状态/归属商户）
node scripts/reset-password.js admin                   # 随机 12 位新密码，只打印一次
node scripts/reset-password.js zckzck 'Xxx@123456'     # 指定新密码
```

- 直连本机 MySQL（默认 127.0.0.1:3306 / pbquote / pbquote），哈希算法与后端完全一致（scrypt，`salt$digest`）。
- 重置后**撤销该账号全部会话**，旧 token 立即失效。
- 也可在网页操作：超管 →「商户管理」→ 编辑 → 重置密码；商户本人 → 右上角头像 →「修改密码」。

## 九、部署脚本的四个致命坑（2026-10-14 全踩了一遍）

1. **tarball 名字必须和脚本里读的一致。** `dep-client.exp` 上传的是 `/tmp/client.tgz`，而 `dep-client.sh` 里解包的是 `/tmp/dist.tgz` —— 于是每次都部署服务器上残留的旧包，脚本还"成功"退出。部署前对一遍：`grep -n 'tar -xzf' 脚本` vs `grep -n scp *.exp`。
2. **宝塔的 `.user.ini` 带 immutable 属性。** `rm -rf dist.old` 会报 `cannot remove ... Operation not permitted`；脚本里有 `set -e` 时会在**切换之前静默中止**，表现就是"部署成功但页面没变"，而 `dist.new` 还留在旁边。修法：`rm -rf dist.old 2>/dev/null || true`，或先 `chattr -i dist.old/.user.ini`。
3. **`mv dist dist.old` 在 `dist.old` 已存在时会把 dist 塞进去**（变成 `dist.old/dist`），旧包别名就找不到了。先删干净再 mv，或改用带时间戳的备份名 `dist.old.$(date +%s)`。
4. **保留旧 bundle 别名。** 新 dist 里顺手把上一版的 `index-*.js`/`index-*.css` 拷过去：`cp -n ../dist.old/dist/assets/index-* assets/` —— 否则缓存了旧 index.html 的用户会白屏 404。

5. **后端包必须带 `database/` 目录。** 服务启动时按文件名顺序执行 `database/migrations/*.sql`，缺目录会报 `ENOENT ... 001_initial.sql` 并**直接启动失败（外网 502）**。打包：`tar -czf /tmp/server.tgz -C server dist scripts database package.json`。
6. **macOS 打包会混入 `._*` 鬼文件，能把服务搞挂（2026-10-16 实际发生）。** `tar` 会打进 AppleDouble 元数据文件 `._003_xxx.sql`，迁移遍历把它当 SQL 执行 → 语法错误 → 启动崩溃 → 502。两处都要防：打包用 `COPYFILE_DISABLE=1 tar --exclude="._*" --exclude=".DS_Store"`；代码里迁移只匹配 `/^\\d+.*\\.sql$/i`（已内置）。
7. **改 `node:fs/promises` 的 import 后要验证真的改到了。** 曾出现 `import { readFile, readdir }` 没改成功、**TS 编译照样通过**，但运行时 `ReferenceError: readdir is not defined` → 启动崩溃 502。验证：`grep -c readdir dist/xxx.service.js`，或直接看启动日志。

**部署后端后必须校验的**：`dist/*.service.js` 里的新逻辑真的进去了（`grep -c '新特征串' /www/wwwroot/PBQuote/server/dist/xxx.service.js`）。只看 `dist/main.js` 的 md5 没用 —— 那只是入口文件，永远不变。**且必须确认外网 200**，本地 pm2 显示 online 不代表没崩（pm2 会反复重启）。

## 十、数据库中文注释（migration 003）

10 张表、75 个字段全部有中文注释，由 `database/migrations/003_table_comments.sql` 建立，`migrate()` 会自动执行。

- MySQL 5.7 **不支持**单独给列加注释，只能 `MODIFY COLUMN` 重写整列定义。
- 生成这类 SQL 时，类型/默认值**必须取自 `information_schema`**。手写极易把 `ENUM('active')` 写成 `ENUM('ACTIVE')`、`DEFAULT 'active'` 写成 `DEFAULT active` —— **会改坏数据**。
- 执行前先备份，执行后必须比对两个指纹，全等才算成功：
  ```bash
  mysqldump -upbquote -p'pB6C5h8f4mfHFYHW' --single-transaction pbquote > /root/pbquote-backup-$(date +%Y%m%d-%H%M%S).sql
  # 列定义指纹（执行前后应完全一致）
  mysql -upbquote -p'pB6C5h8f4mfHFYHW' pbquote -N -e "SELECT MD5(GROUP_CONCAT(CONCAT(TABLE_NAME,COLUMN_NAME,COLUMN_TYPE,IS_NULLABLE,IFNULL(COLUMN_DEFAULT,'-'),EXTRA) ORDER BY TABLE_NAME,ORDINAL_POSITION)) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='pbquote';"
  # 注释覆盖率（应为 10/10 与 75/75）
  mysql -upbquote -p'pB6C5h8f4mfHFYHW' pbquote -N -e "SELECT CONCAT('表注释=',COUNT(*)) FROM information_schema.TABLES WHERE TABLE_SCHEMA='pbquote' AND TABLE_COMMENT<>''; SELECT CONCAT('列注释=',SUM(COLUMN_COMMENT<>''),'/',COUNT(*)) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='pbquote';"
  ```

# PBQuote 包装盒在线报价系统

面向包装印刷行业的多租户在线报价平台：每个商家拥有独立的前台报价页（独立域名路径 /shop/{slug}），客户选择盒型、填写尺寸、材质与工艺后实时获得报价；商家通过后台管理报价规则与前台内容。

## 技术栈

| 端 | 技术 |
| --- | --- |
| 前台 + 后台 | Vue 3 + Element Plus + Pinia + Vue Router（Vite 构建） |
| 服务端 | NestJS + TypeScript（mysql2/promise） |
| 数据库 | MySQL 8（配置环境变量后持久化；未配置时可降级为内存演示模式） |

## 功能一览

**客户前台 /shop/{slug}**
- 盒型选择（双插盒/锁底盒/自动锁底盒/平粘盒/天地盒/抽屉盒/一体成型盒/自定义）+ **卡盒/坑盒**切换（两套展开公式）
- 成品尺寸 → 展开尺寸自动换算，或手动填写展开尺寸
- 材质（数量阶梯价 + 最低消费）、表面处理、印刷面数、印刷要求（系数）、专色、粘盒、工艺（按面积/次数/按个，含开机费）
- 报价明细实时预览，服务端复算为准
- 四区**页面内容块**（顶部/左侧/右侧/底部，画布坐标 x/y/w/h，前台可视化拖拽编辑——登录商家/管理员可用）
- 顶栏自定义链接（最多 6 个）、**8 套前台配色**、前台排版 A/B/C
- 下单后联系商家弹窗（多条目联系入口：文本/图片/链接）

**商家后台 /admin**
- 超级管理员：商户管理（新增/启停/删除）、跨商家配置
- 商家/超管：品牌设置、价格规则（材质阶梯/表面处理/工艺/印刷附加）、盒形公式查看、前台定制（排版/配色/顶栏链接/内容块坐标）

**角色**：super_admin（跨商家）、merchant（仅绑定商家）。所有业务查询从认证身份推导 merchantId。

## 环境要求

- Node.js ≥ 20（建议 LTS）
- pnpm（前端）或 npm；服务端使用 npm
- MySQL 8（本机或远程；未配置时可内存演示，但报价/订单不落库）

## 安装

```bash
# 前端依赖
pnpm --dir client install
# 或 npm --prefix client install

# 服务端依赖
npm --prefix server install
```

## 配置

服务端配置文件为 `server/.env`（可从 `server/.env.example` 复制修改）：

```ini
# 数据库（未配置 DB_* 时进入内存演示模式）
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=pbquote
DB_USER=pbquote
DB_PASSWORD=change-me
DB_POOL_SIZE=5
DB_AUTO_MIGRATE=true        # 首次启动自动建表

# 服务端口
PORT=3000

# 原型登录账号（seed 使用；生产务必修改）
SUPER_ADMIN_USERNAME=admin
SUPER_ADMIN_PASSWORD=change-me
MERCHANT_USERNAME=merchant
MERCHANT_PASSWORD=change-me
MERCHANT_SLUG=jinfuying
```

| 变量 | 说明 |
| --- | --- |
| DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASSWORD | MySQL 连接信息 |
| DB_POOL_SIZE | 连接池大小（默认 5） |
| DB_AUTO_MIGRATE | true 时启动自动执行 migrations（建表，幂等） |
| PORT | 服务端监听端口（默认 3000） |
| SUPER_ADMIN_USERNAME/PASSWORD | 超级管理员账号（seed + 无数据库时登录） |
| MERCHANT_USERNAME/PASSWORD | 商家账号（seed） |
| MERCHANT_SLUG | 商家前台路径 /shop/{slug} |

## 数据库初始化

1. 创建数据库（utf8mb4）：
```sql
CREATE DATABASE pbquote DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```
2. 建表：设置 `DB_AUTO_MIGRATE=true` 后首次启动自动执行；或手动执行
   `server/database/migrations/001_initial.sql` 与 `002_soft_delete_merchants.sql`。
3. 写入默认商家与账号（幂等，可重复执行）：
```bash
node tools/seed-default-merchant.mjs
```
4. 校验：
```bash
node tools/verify-pbquote-mysql.mjs
```

## 开发运行

```bash
# 服务端（端口 3000）
npm --prefix server run start:dev
# 前端（端口 5173，API 代理见 client/src/api/client.js 的 VITE_API_BASE_URL）
pnpm --dir client run dev
```

前台地址：http://localhost:5173/shop/jinfuying
后台地址：http://localhost:5173/admin

## 测试

```bash
# 服务端单元测试（15 个）
npm --prefix server test
# 服务端 e2e
npm --prefix server run test:e2e
```

生产部署见 **SETUP.md**。

## 目录结构（节选）

```
client/src/
  views/demo/PlanA|B|CView.vue   前台三套排版（单列/分栏/分步）
  components/StorefrontRegion.vue 区域内容块画布（拖拽/吸附/等比缩放）
  components/StorefrontEditor.vue 前台页面编辑（登录后可用）
  components/AdminWorkspace.vue   商家后台工作台
  composables/useStorefrontQuote.js    前台报价逻辑
  composables/useStorefrontEditor.js   前台页面编辑逻辑
  lib/box-shapes.js               盒型展开公式（前端镜像）
  stores/config.js                商家配置（Pinia）
server/src/
  app.controller.ts / app.service.ts   路由与业务
  database.service.ts             MySQL 持久化
  box-shapes.ts                   盒型展开公式（权威）
  auth.service.ts                 认证（scrypt + 会话）
tools/
  seed-default-merchant.mjs       默认商家/账号/选项 seed
  verify-pbquote-mysql.mjs        数据库校验
```

## 已知限制（生产前建议）

- 未加接口限流与安全响应头；CORS 当前全放开
- 默认账号密码为原型值，上线前必须修改（重新执行 seed 或直接改 users 表）
- 报价快照 15 分钟过期；过期快照仍保留在库中（可定期清理）
- 审计日志表已建未写入

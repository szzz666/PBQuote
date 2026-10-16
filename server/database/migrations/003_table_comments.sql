-- PBQuote MySQL migration 003：为全部表与字段补充中文注释
-- 说明：MySQL 5.7 不支持单独给列加注释，只能 MODIFY 重写列定义；
--       类型/默认值取自生产库 information_schema，可重复执行（幂等）。

-- 商户表：每个商户是一个独立的报价站点（专属标识即前台地址）
ALTER TABLE `merchants` COMMENT = '商户表：每个商户是一个独立的报价站点（专属标识即前台地址）';
ALTER TABLE `merchants` MODIFY COLUMN `id` CHAR(26) NOT NULL COMMENT '主键，26 位随机 ID';
ALTER TABLE `merchants` MODIFY COLUMN `name` VARCHAR(120) NOT NULL COMMENT '商户名称';
ALTER TABLE `merchants` MODIFY COLUMN `slug` VARCHAR(80) NOT NULL COMMENT '专属标识，前台地址为 /shop/<标识>，全局唯一';
ALTER TABLE `merchants` MODIFY COLUMN `status` ENUM('active','disabled') NOT NULL DEFAULT 'active' COMMENT '状态：active 启用 / disabled 停用';
ALTER TABLE `merchants` MODIFY COLUMN `deleted_at` DATETIME(3) NULL COMMENT '删除时间（历史软删除字段；当前删除为物理删除）';
ALTER TABLE `merchants` MODIFY COLUMN `storefront_name` VARCHAR(120) NOT NULL COMMENT '前台展示名称';
ALTER TABLE `merchants` MODIFY COLUMN `storefront_slogan` VARCHAR(255) NULL COMMENT '前台标语';
ALTER TABLE `merchants` MODIFY COLUMN `config_version` INT NOT NULL DEFAULT 1 COMMENT '配置版本号，每次保存配置自增';
ALTER TABLE `merchants` MODIFY COLUMN `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间';
ALTER TABLE `merchants` MODIFY COLUMN `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间';

-- 登录账号表：超级管理员与商户账号，密码只存哈希
ALTER TABLE `users` COMMENT = '登录账号表：超级管理员与商户账号，密码只存哈希';
ALTER TABLE `users` MODIFY COLUMN `id` CHAR(26) NOT NULL COMMENT '主键，26 位随机 ID';
ALTER TABLE `users` MODIFY COLUMN `username` VARCHAR(120) NOT NULL COMMENT '登录账号，全局唯一';
ALTER TABLE `users` MODIFY COLUMN `password_hash` VARCHAR(255) NOT NULL COMMENT '密码哈希（scrypt，格式 salt$digest，不存明文）';
ALTER TABLE `users` MODIFY COLUMN `role` ENUM('super_admin','merchant') NOT NULL COMMENT '角色：super_admin 超级管理员 / merchant 商户';
ALTER TABLE `users` MODIFY COLUMN `merchant_id` CHAR(26) NULL COMMENT '所属商户 ID（超级管理员为空）';
ALTER TABLE `users` MODIFY COLUMN `status` ENUM('active','disabled') NOT NULL DEFAULT 'active' COMMENT '状态：active 启用 / disabled 停用';
ALTER TABLE `users` MODIFY COLUMN `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间';

-- 登录会话表：每个登录令牌一行，支持改密/下线后立即失效
ALTER TABLE `sessions` COMMENT = '登录会话表：每个登录令牌一行，支持改密/下线后立即失效';
ALTER TABLE `sessions` MODIFY COLUMN `id` CHAR(26) NOT NULL COMMENT '主键，26 位随机 ID';
ALTER TABLE `sessions` MODIFY COLUMN `token_hash` CHAR(64) NOT NULL COMMENT '登录令牌的 SHA-256 哈希，全局唯一';
ALTER TABLE `sessions` MODIFY COLUMN `user_id` CHAR(26) NOT NULL COMMENT '所属账号 ID';
ALTER TABLE `sessions` MODIFY COLUMN `expires_at` DATETIME(3) NOT NULL COMMENT '过期时间';
ALTER TABLE `sessions` MODIFY COLUMN `revoked_at` DATETIME(3) NULL COMMENT '失效时间（改密码或强制下线时写入，非空即失效）';
ALTER TABLE `sessions` MODIFY COLUMN `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间';

-- 商户配置表：品牌设置、价格规则、前台定制的 JSON 快照，按版本留存
ALTER TABLE `merchant_configs` COMMENT = '商户配置表：品牌设置、价格规则、前台定制的 JSON 快照，按版本留存';
ALTER TABLE `merchant_configs` MODIFY COLUMN `id` CHAR(26) NOT NULL COMMENT '主键，26 位随机 ID';
ALTER TABLE `merchant_configs` MODIFY COLUMN `merchant_id` CHAR(26) NOT NULL COMMENT '所属商户 ID';
ALTER TABLE `merchant_configs` MODIFY COLUMN `version` INT NOT NULL COMMENT '配置版本号，同一商户内递增';
ALTER TABLE `merchant_configs` MODIFY COLUMN `status` ENUM('draft','published') NOT NULL COMMENT '状态：draft 草稿 / published 已发布';
ALTER TABLE `merchant_configs` MODIFY COLUMN `payload` JSON NOT NULL COMMENT '配置内容 JSON：品牌设置、价格规则、前台定制等';
ALTER TABLE `merchant_configs` MODIFY COLUMN `published_by` CHAR(26) NULL COMMENT '发布人账号 ID';
ALTER TABLE `merchant_configs` MODIFY COLUMN `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间';

-- 产品表：商户的报价产品
ALTER TABLE `products` COMMENT = '产品表：商户的报价产品';
ALTER TABLE `products` MODIFY COLUMN `id` CHAR(26) NOT NULL COMMENT '主键，26 位随机 ID';
ALTER TABLE `products` MODIFY COLUMN `merchant_id` CHAR(26) NOT NULL COMMENT '所属商户 ID';
ALTER TABLE `products` MODIFY COLUMN `name` VARCHAR(160) NOT NULL COMMENT '产品名称';
ALTER TABLE `products` MODIFY COLUMN `status` ENUM('active','disabled') NOT NULL DEFAULT 'active' COMMENT '状态：active 启用 / disabled 停用';
ALTER TABLE `products` MODIFY COLUMN `payload` JSON NOT NULL COMMENT '产品详情 JSON';
ALTER TABLE `products` MODIFY COLUMN `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间';
ALTER TABLE `products` MODIFY COLUMN `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间';

-- 目录选项表：材质/表面处理/工艺等可选项的独立存储（历史结构）
ALTER TABLE `catalog_options` COMMENT = '目录选项表：材质/表面处理/工艺等可选项的独立存储（历史结构）';
ALTER TABLE `catalog_options` MODIFY COLUMN `id` CHAR(26) NOT NULL COMMENT '主键，26 位随机 ID';
ALTER TABLE `catalog_options` MODIFY COLUMN `merchant_id` CHAR(26) NOT NULL COMMENT '所属商户 ID';
ALTER TABLE `catalog_options` MODIFY COLUMN `category` ENUM('material','treatment','process','print_mode','print_requirement','glue') NOT NULL COMMENT '分类：material 材质 / treatment 表面处理 / process 工艺 / print_mode 印刷方式 / print_requirement 印刷要求 / glue 糊盒';
ALTER TABLE `catalog_options` MODIFY COLUMN `name` VARCHAR(160) NOT NULL COMMENT '选项名称';
ALTER TABLE `catalog_options` MODIFY COLUMN `payload` JSON NOT NULL COMMENT '选项详情 JSON（单价、阶梯等）';
ALTER TABLE `catalog_options` MODIFY COLUMN `status` ENUM('active','disabled') NOT NULL DEFAULT 'active' COMMENT '状态：active 启用 / disabled 停用';
ALTER TABLE `catalog_options` MODIFY COLUMN `sort_order` INT NOT NULL DEFAULT 0 COMMENT '排序值，越小越靠前';
ALTER TABLE `catalog_options` MODIFY COLUMN `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间';
ALTER TABLE `catalog_options` MODIFY COLUMN `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间';

-- 报价单表：每次算价的结果快照，含入参与价格明细
ALTER TABLE `quotes` COMMENT = '报价单表：每次算价的结果快照，含入参与价格明细';
ALTER TABLE `quotes` MODIFY COLUMN `id` CHAR(26) NOT NULL COMMENT '主键，26 位随机 ID';
ALTER TABLE `quotes` MODIFY COLUMN `merchant_id` CHAR(26) NOT NULL COMMENT '所属商户 ID';
ALTER TABLE `quotes` MODIFY COLUMN `config_version` INT NOT NULL COMMENT '算价时使用的配置版本号';
ALTER TABLE `quotes` MODIFY COLUMN `status` ENUM('active','expired','ordered') NOT NULL DEFAULT 'active' COMMENT '状态：active 有效 / expired 已过期 / ordered 已下单';
ALTER TABLE `quotes` MODIFY COLUMN `input_snapshot` JSON NOT NULL COMMENT '报价入参快照 JSON（尺寸、材质、数量、工艺等）';
ALTER TABLE `quotes` MODIFY COLUMN `price_snapshot` JSON NOT NULL COMMENT '价格明细快照 JSON（各项费用与总价）';
ALTER TABLE `quotes` MODIFY COLUMN `expires_at` DATETIME(3) NOT NULL COMMENT '报价有效期';
ALTER TABLE `quotes` MODIFY COLUMN `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间';

-- 购物车表：按商户 + 会话标识存放待下单条目
ALTER TABLE `carts` COMMENT = '购物车表：按商户 + 会话标识存放待下单条目';
ALTER TABLE `carts` MODIFY COLUMN `id` CHAR(26) NOT NULL COMMENT '主键，26 位随机 ID';
ALTER TABLE `carts` MODIFY COLUMN `merchant_id` CHAR(26) NOT NULL COMMENT '所属商户 ID';
ALTER TABLE `carts` MODIFY COLUMN `session_key` VARCHAR(128) NOT NULL COMMENT '会话标识（同一商户内唯一）';
ALTER TABLE `carts` MODIFY COLUMN `items` JSON NOT NULL COMMENT '购物车条目 JSON';
ALTER TABLE `carts` MODIFY COLUMN `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间';

-- 订单表：下单记录，关联报价单并留存当时的价格快照
ALTER TABLE `orders` COMMENT = '订单表：下单记录，关联报价单并留存当时的价格快照';
ALTER TABLE `orders` MODIFY COLUMN `id` CHAR(26) NOT NULL COMMENT '主键，26 位随机 ID';
ALTER TABLE `orders` MODIFY COLUMN `merchant_id` CHAR(26) NOT NULL COMMENT '所属商户 ID';
ALTER TABLE `orders` MODIFY COLUMN `quote_id` CHAR(26) NULL COMMENT '关联的报价单 ID';
ALTER TABLE `orders` MODIFY COLUMN `status` ENUM('pending','confirmed','production','completed','cancelled') NOT NULL DEFAULT 'pending' COMMENT '状态：pending 待确认 / confirmed 已确认 / production 生产中 / completed 已完成 / cancelled 已取消';
ALTER TABLE `orders` MODIFY COLUMN `input_snapshot` JSON NOT NULL COMMENT '下单入参快照 JSON';
ALTER TABLE `orders` MODIFY COLUMN `price_snapshot` JSON NOT NULL COMMENT '下单价格快照 JSON';
ALTER TABLE `orders` MODIFY COLUMN `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间';
ALTER TABLE `orders` MODIFY COLUMN `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间';

-- 操作审计日志表：记录改配置、改账号、改密码等关键操作
ALTER TABLE `audit_logs` COMMENT = '操作审计日志表：记录改配置、改账号、改密码等关键操作';
ALTER TABLE `audit_logs` MODIFY COLUMN `id` CHAR(26) NOT NULL COMMENT '主键，26 位随机 ID';
ALTER TABLE `audit_logs` MODIFY COLUMN `actor_user_id` CHAR(26) NULL COMMENT '操作人账号 ID';
ALTER TABLE `audit_logs` MODIFY COLUMN `merchant_id` CHAR(26) NULL COMMENT '相关商户 ID';
ALTER TABLE `audit_logs` MODIFY COLUMN `action` VARCHAR(80) NOT NULL COMMENT '操作动作，如 merchant.account.update、user.password.reset';
ALTER TABLE `audit_logs` MODIFY COLUMN `resource_type` VARCHAR(80) NOT NULL COMMENT '资源类型，如 user、merchant';
ALTER TABLE `audit_logs` MODIFY COLUMN `resource_id` CHAR(26) NULL COMMENT '资源 ID';
ALTER TABLE `audit_logs` MODIFY COLUMN `payload` JSON NULL COMMENT '操作详情 JSON';
ALTER TABLE `audit_logs` MODIFY COLUMN `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间';

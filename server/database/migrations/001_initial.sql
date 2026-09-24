-- PBQuote MySQL migration 001
-- Apply with: mysql -u <user> -p <database> < 001_initial.sql

CREATE TABLE IF NOT EXISTS merchants (
  id CHAR(26) PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  slug VARCHAR(80) NOT NULL UNIQUE,
  status ENUM('active','disabled') NOT NULL DEFAULT 'active',
  storefront_name VARCHAR(120) NOT NULL,
  storefront_slogan VARCHAR(255) NULL,
  config_version INT NOT NULL DEFAULT 1,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS users (
  id CHAR(26) PRIMARY KEY,
  username VARCHAR(120) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('super_admin','merchant') NOT NULL,
  merchant_id CHAR(26) NULL,
  status ENUM('active','disabled') NOT NULL DEFAULT 'active',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_users_merchant FOREIGN KEY (merchant_id) REFERENCES merchants(id),
  CONSTRAINT ck_user_tenant_role CHECK ((role = 'super_admin' AND merchant_id IS NULL) OR (role = 'merchant' AND merchant_id IS NOT NULL))
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS sessions (
  id CHAR(26) PRIMARY KEY,
  token_hash CHAR(64) NOT NULL UNIQUE,
  user_id CHAR(26) NOT NULL,
  expires_at DATETIME(3) NOT NULL,
  revoked_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX idx_sessions_expiry (expires_at),
  CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS merchant_configs (
  id CHAR(26) PRIMARY KEY,
  merchant_id CHAR(26) NOT NULL,
  version INT NOT NULL,
  status ENUM('draft','published') NOT NULL,
  payload JSON NOT NULL,
  published_by CHAR(26) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uk_merchant_config_version (merchant_id, version),
  INDEX idx_configs_published (merchant_id, status, version),
  CONSTRAINT fk_configs_merchant FOREIGN KEY (merchant_id) REFERENCES merchants(id),
  CONSTRAINT fk_configs_publisher FOREIGN KEY (published_by) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS products (
  id CHAR(26) PRIMARY KEY,
  merchant_id CHAR(26) NOT NULL,
  name VARCHAR(160) NOT NULL,
  status ENUM('active','disabled') NOT NULL DEFAULT 'active',
  payload JSON NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  INDEX idx_products_merchant_status (merchant_id, status),
  CONSTRAINT fk_products_merchant FOREIGN KEY (merchant_id) REFERENCES merchants(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS catalog_options (
  id CHAR(26) PRIMARY KEY,
  merchant_id CHAR(26) NOT NULL,
  category ENUM('material','treatment','process','print_mode','print_requirement','glue') NOT NULL,
  name VARCHAR(160) NOT NULL,
  payload JSON NOT NULL,
  status ENUM('active','disabled') NOT NULL DEFAULT 'active',
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  INDEX idx_catalog_options_merchant (merchant_id, category, status, sort_order),
  CONSTRAINT fk_catalog_options_merchant FOREIGN KEY (merchant_id) REFERENCES merchants(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS box_types (
  id CHAR(26) PRIMARY KEY,
  merchant_id CHAR(26) NOT NULL,
  product_id CHAR(26) NULL,
  name VARCHAR(120) NOT NULL,
  unfold_rule JSON NOT NULL,
  status ENUM('active','disabled') NOT NULL DEFAULT 'active',
  INDEX idx_box_types_merchant_status (merchant_id, status),
  CONSTRAINT fk_box_types_merchant FOREIGN KEY (merchant_id) REFERENCES merchants(id),
  CONSTRAINT fk_box_types_product FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS price_rules (
  id CHAR(26) PRIMARY KEY,
  merchant_id CHAR(26) NOT NULL,
  name VARCHAR(160) NOT NULL,
  priority INT NOT NULL DEFAULT 100,
  rule JSON NOT NULL,
  status ENUM('active','disabled') NOT NULL DEFAULT 'active',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX idx_price_rules_merchant_status (merchant_id, status, priority),
  CONSTRAINT fk_price_rules_merchant FOREIGN KEY (merchant_id) REFERENCES merchants(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS quotes (
  id CHAR(26) PRIMARY KEY,
  merchant_id CHAR(26) NOT NULL,
  config_version INT NOT NULL,
  status ENUM('active','expired','ordered') NOT NULL DEFAULT 'active',
  input_snapshot JSON NOT NULL,
  price_snapshot JSON NOT NULL,
  expires_at DATETIME(3) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX idx_quotes_merchant_created (merchant_id, created_at),
  CONSTRAINT fk_quotes_merchant FOREIGN KEY (merchant_id) REFERENCES merchants(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS carts (
  id CHAR(26) PRIMARY KEY,
  merchant_id CHAR(26) NOT NULL,
  session_key VARCHAR(128) NOT NULL,
  items JSON NOT NULL,
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uk_carts_merchant_session (merchant_id, session_key),
  CONSTRAINT fk_carts_merchant FOREIGN KEY (merchant_id) REFERENCES merchants(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS orders (
  id CHAR(26) PRIMARY KEY,
  merchant_id CHAR(26) NOT NULL,
  quote_id CHAR(26) NULL,
  status ENUM('pending','confirmed','production','completed','cancelled') NOT NULL DEFAULT 'pending',
  input_snapshot JSON NOT NULL,
  price_snapshot JSON NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  INDEX idx_orders_merchant_created (merchant_id, created_at),
  CONSTRAINT fk_orders_merchant FOREIGN KEY (merchant_id) REFERENCES merchants(id),
  CONSTRAINT fk_orders_quote FOREIGN KEY (quote_id) REFERENCES quotes(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS audit_logs (
  id CHAR(26) PRIMARY KEY,
  actor_user_id CHAR(26) NULL,
  merchant_id CHAR(26) NULL,
  action VARCHAR(80) NOT NULL,
  resource_type VARCHAR(80) NOT NULL,
  resource_id CHAR(26) NULL,
  payload JSON NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX idx_audit_merchant_created (merchant_id, created_at),
  CONSTRAINT fk_audit_actor FOREIGN KEY (actor_user_id) REFERENCES users(id),
  CONSTRAINT fk_audit_merchant FOREIGN KEY (merchant_id) REFERENCES merchants(id)
) ENGINE=InnoDB;

-- 2025-09 重构：盒形改为系统内置公式（server/src/box-shapes.ts），价格规则统一存商户配置，废弃以下两张表
DROP TABLE IF EXISTS price_rules;
DROP TABLE IF EXISTS box_types;

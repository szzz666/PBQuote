import mysql from '../server/node_modules/mysql2/promise.js'
import { randomBytes, scryptSync, randomUUID } from 'node:crypto'

const env = process.env
const required = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD']
for (const key of required) if (!env[key]) throw new Error('Missing ' + key)
const id = () => randomUUID().replaceAll('-', '').slice(0, 26)
const hash = (password) => { const salt = randomBytes(16).toString('hex'); return salt + '$' + scryptSync(password, salt, 64).toString('hex') }
const config = { merchant: { name: env.MERCHANT_NAME || '示例商户', slug: env.MERCHANT_SLUG || 'default', slogan: '专业包装 · 智能报价' }, product: { name: '卡纸盒-双插盒', boxType: '双插盒', basePrice: 0.38 }, quantities: [500,1000,2000,3000,5000,10000], materials: ['350克白卡','300克白卡白E坑','300克白卡黄E坑'], treatments: ['哑胶','光胶','逆向 UV'], processes: ['烫金','烫银','击凸','丝印UV','贴窗口'], printModes: ['单面印刷','双面印刷'], printRequirements: ['正常','跟色','打样'], glueOptions: ['粘','不粘'], shipping: { freeThreshold: 1000, fee: 18 } }
const c = await mysql.createConnection({host: env.DB_HOST, port: Number(env.DB_PORT || 3306), database: env.DB_NAME, user: env.DB_USER, password: env.DB_PASSWORD})
try {
  await c.beginTransaction()
  const merchantId = id()
  await c.query("INSERT INTO merchants (id,name,slug,status,storefront_name,storefront_slogan) VALUES (?,?,?,'active',?,?) ON DUPLICATE KEY UPDATE name=VALUES(name),storefront_name=VALUES(storefront_name),storefront_slogan=VALUES(storefront_slogan),status='active'", [merchantId, config.merchant.name, config.merchant.slug, config.merchant.name, config.merchant.slogan])
  const [merchants] = await c.query('SELECT id FROM merchants WHERE slug=? LIMIT 1', [config.merchant.slug])
  const mid = merchants[0].id
  await c.query("INSERT INTO merchant_configs (id,merchant_id,version,status,payload) SELECT ?,?,1,'published',? FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM merchant_configs WHERE merchant_id=? AND status='published')", [id(), mid, JSON.stringify(config), mid])
  const productId = id()
  await c.query("INSERT INTO products (id,merchant_id,name,status,payload) SELECT ?,?,?,'active',? WHERE NOT EXISTS (SELECT 1 FROM products WHERE merchant_id=? AND name=? )", [productId,mid,config.product.name,JSON.stringify({image:'/merchant/' + (env.MERCHANT_SLUG || 'default') + '/folding-box.jpg',sourceProductId:1}),mid,config.product.name])
  for (const [category, names] of Object.entries({material:config.materials,treatment:config.treatments,process:config.processes,print_mode:config.printModes,print_requirement:config.printRequirements,glue:config.glueOptions})) for (const name of names) await c.query("INSERT INTO catalog_options (id,merchant_id,category,name,payload,status) SELECT ?,?,?,?,'{}','active' WHERE NOT EXISTS (SELECT 1 FROM catalog_options WHERE merchant_id=? AND category=? AND name=?)", [id(),mid,category,name,mid,category,name])
  await c.query("INSERT INTO users (id,username,password_hash,role,merchant_id,status) VALUES (?,?,?,'merchant',?,'active') ON DUPLICATE KEY UPDATE password_hash=VALUES(password_hash),merchant_id=VALUES(merchant_id),status='active'", [id(),env.MERCHANT_USERNAME || env.MERCHANT_SLUG || 'default',hash(env.MERCHANT_PASSWORD || 'change-me'),mid])
  if (!env.SUPER_ADMIN_USERNAME || !env.SUPER_ADMIN_PASSWORD) throw new Error('SUPER_ADMIN_USERNAME and SUPER_ADMIN_PASSWORD are required for admin seed')
  await c.query("INSERT INTO users (id,username,password_hash,role,merchant_id,status) VALUES (?,?,?,'super_admin',NULL,'active') ON DUPLICATE KEY UPDATE password_hash=VALUES(password_hash),merchant_id=NULL,status='active'", [id(),env.SUPER_ADMIN_USERNAME,hash(env.SUPER_ADMIN_PASSWORD)])
  await c.commit(); console.log(JSON.stringify({merchantSlug:config.merchant.slug,merchantId:mid,product:config.product.name,seeded:true}))
} catch (e) { await c.rollback(); throw e } finally { await c.end() }
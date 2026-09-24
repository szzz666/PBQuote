import mysql from '../server/node_modules/mysql2/promise.js'
const e = process.env
for (const k of ['DB_HOST','DB_NAME','DB_USER','DB_PASSWORD']) if (!e[k]) throw new Error('Missing '+k)
const c = await mysql.createConnection({host:e.DB_HOST,port:Number(e.DB_PORT||3306),database:e.DB_NAME,user:e.DB_USER,password:e.DB_PASSWORD})
try {
  const [tables] = await c.query('SHOW TABLES')
  const names = tables.map((row) => Object.values(row)[0])
  const required = ['merchants','users','sessions','merchant_configs','products','catalog_options','quotes','carts','orders','audit_logs']
  for (const name of required) if (!names.includes(name)) throw new Error('Missing table '+name)
  const counts = {}
  for (const name of required) { const [rows] = await c.query('SELECT COUNT(*) AS count FROM '+name); counts[name] = Number(rows[0].count) }
  if (counts.merchants < 1 || counts.users < 2 || counts.products < 1 || counts.catalog_options < 1) throw new Error('Seed data incomplete: '+JSON.stringify(counts))
  console.log(JSON.stringify({ok:true,tableCount:names.length,counts}))
} finally { await c.end() }

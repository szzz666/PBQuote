/** 前台定制链接安全校验（与 useStorefrontQuote 的 safeContactUrl 同源白名单） */
export function isSafeWebUrl(value) {
  const u = String(value || '').trim()
  if (!u) return false
  if (u.startsWith('/') && !u.startsWith('//') && !u.startsWith('/\\')) return true // 站内路径（含 /uploads/）
  return u.startsWith('http://') || u.startsWith('https://')
}

/**
 * 把 /uploads/ 相对路径转为可加载的绝对地址。
 * apiBase 可能是绝对地址（开发环境 http://localhost:3000/api/v1），
 * 也可能是相对路径（生产 VITE_API_BASE_URL=/api/v1）——相对时以当前站点 origin 为基准，
 * 因为 /uploads/ 由同源 nginx 提供。避免 new URL(u, '/api/v1') 抛 Invalid URL 导致渲染中断。
 */
export function resolveAssetUrl(value, apiBase) {
  const u = String(value || '').trim()
  if (!u) return ''
  if (!u.startsWith('/uploads/')) return u
  const base = /^https?:\/\//i.test(String(apiBase || ''))
    ? String(apiBase)
    : (typeof window !== 'undefined' ? window.location.origin : '')
  try { return base ? new URL(u, base).toString() : u } catch { return u }
}

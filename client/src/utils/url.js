/** 前台定制链接安全校验（与 useStorefrontQuote 的 safeContactUrl 同源白名单） */
export function isSafeWebUrl(value) {
  const u = String(value || '').trim()
  if (!u) return false
  if (u.startsWith('/') && !u.startsWith('//') && !u.startsWith('/\\')) return true // 站内路径（含 /uploads/）
  return u.startsWith('http://') || u.startsWith('https://')
}

/** 把 /uploads/ 相对路径转为可加载的绝对地址（基于 API API_BASE） */
export function resolveAssetUrl(value, apiBase) {
  const u = String(value || '').trim()
  if (!u) return ''
  if (u.startsWith('/uploads/')) return new URL(u, apiBase).toString()
  return u
}

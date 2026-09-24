/**
 * 前台主题配色（商家级配置 storefrontTheme 的取值表）。
 * 每套主题 5 个色阶：main 主色 / strong 深 / light 浅 / soft 淡底 / border 描边。
 * 通过 CSS 变量 --sf-main/--sf-strong/--sf-light/--sf-soft/--sf-border 应用到前台，
 * 并映射 Element Plus 的 --el-color-primary* 色阶。
 * 换色/加色只需改这个文件。
 */
export const THEMES = [
  { id: 'green', label: '绿色（默认）', main: '#587450', strong: '#465c40', light: '#7a9371', soft: '#e7f2dc', border: '#b7d49e' },
  { id: 'blue', label: '蓝色', main: '#3d6ea5', strong: '#2f5683', light: '#6a94c2', soft: '#e3edf7', border: '#a8c3e0' },
  { id: 'orange', label: '橙色', main: '#d97b2f', strong: '#b05f1e', light: '#e89a5c', soft: '#fdf0e3', border: '#f0c9a3' },
  { id: 'red', label: '酒红', main: '#a63d4e', strong: '#83303e', light: '#c06a78', soft: '#fbe9ec', border: '#e5b8c0' },
  { id: 'purple', label: '紫色', main: '#6d5aa8', strong: '#554286', light: '#9385c0', soft: '#efeaf9', border: '#c9bfe8' },
  { id: 'teal', label: '青色', main: '#2f8f84', strong: '#227069', light: '#63ada4', soft: '#e2f3f1', border: '#a9d8d3' },
  { id: 'brown', label: '咖啡', main: '#8a6a45', strong: '#6d5134', light: '#a98d6d', soft: '#f4ede4', border: '#dccbb3' },
  { id: 'graphite', label: '石墨', main: '#4a5568', strong: '#39424f', light: '#718096', soft: '#e9edf2', border: '#c3cdd9' },
]

export const THEME_IDS = THEMES.map((t) => t.id)

export function themeById(id) {
  return THEMES.find((t) => t.id === id) || THEMES[0]
}

/** 把主题映射为 Element Plus 的 --el-color-primary 全色阶（primary + light-3/5/7/8/9 + dark-2） */
export function themeEpVars(theme) {
  const hex = (v) => v.replace('#', '')
  const mix = (c1, c2, ratio) => {
    const p = (h) => parseInt(h, 16)
    const to = (n) => Math.round(n).toString(16).padStart(2, '0')
    const r = p(hex(c1).slice(0, 2)), g = p(hex(c1).slice(2, 4)), b = p(hex(c1).slice(4, 6))
    const w = p(hex(c2).slice(0, 2)), x = p(hex(c2).slice(2, 4)), y = p(hex(c2).slice(4, 6))
    return '#' + to(r + (w - r) * ratio) + to(g + (x - g) * ratio) + to(b + (y - b) * ratio)
  }
  const white = '#ffffff'
  return {
    '--el-color-primary': theme.main,
    '--el-color-primary-dark-2': theme.strong,
    '--el-color-primary-light-3': mix(theme.main, white, 0.3),
    '--el-color-primary-light-5': mix(theme.main, white, 0.5),
    '--el-color-primary-light-7': mix(theme.main, white, 0.7),
    '--el-color-primary-light-8': mix(theme.main, white, 0.8),
    '--el-color-primary-light-9': mix(theme.main, white, 0.9),
  }
}

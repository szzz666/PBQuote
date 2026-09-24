<script setup>
import { ref } from 'vue'
import { useStorefrontEditor } from '../composables/useStorefrontEditor'
import { THEMES } from '../config/themes'
import { http } from '../api/client'
import { ElMessage } from 'element-plus'

const e = useStorefrontEditor()
const showLinks = ref(false)
const winX = ref(typeof window !== 'undefined' ? Math.max(8, window.innerWidth - 660) : 24)
const winY = ref(84)
const winDrag = ref(null)
function dragWinStart(ev) {
  if (ev.target.closest('button')) return
  winDrag.value = { sx: ev.clientX, sy: ev.clientY, ox: winX.value, oy: winY.value }
  window.addEventListener('pointermove', dragWinMove)
  window.addEventListener('pointerup', dragWinEnd)
}
function dragWinMove(ev) {
  const d = winDrag.value; if (!d) return
  winX.value = Math.max(8, Math.min(window.innerWidth - 90, d.ox + ev.clientX - d.sx))
  winY.value = Math.max(8, Math.min(window.innerHeight - 60, d.oy + ev.clientY - d.sy))
}
function dragWinEnd() {
  winDrag.value = null
  window.removeEventListener('pointermove', dragWinMove)
  window.removeEventListener('pointerup', dragWinEnd)
}
const uploading = ref(false)

async function uploadImage(event) {
  const b = e.selected.value
  if (!b) return
  const file = event.target.files?.[0]
  if (!file) return
  if (file.size > 1024 * 1024 || !['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type)) { ElMessage.warning('请选择不超过 1MB 的 PNG/JPEG/WebP/GIF 图片'); event.target.value = ''; return }
  uploading.value = true
  try {
    const form = new FormData()
    form.append('image', file)
    const data = await http.post('/merchant/' + encodeURIComponent(e.routeSlug.value) + '/assets', form)
    e.updateBlock({ imageUrl: data.url })
    ElMessage.success('图片已上传')
  } catch (err) { ElMessage.error(err.message || '上传失败') }
  finally { uploading.value = false; event.target.value = '' }
}
</script>

<template>


  <div v-if="e.editing.value" class="se-bar" :style="{ left: winX + 'px', top: winY + 'px' }">
    <div class="se-bar-top" @pointerdown="dragWinStart" title="按住拖动窗口">
      <strong>页面编辑</strong>
      <span style="font-size:12px;color:#5b6570;white-space:nowrap">前台排版</span>
      <el-select v-model="e.draft.value.layout" size="small" style="width:130px"><el-option label="A 单列卡片" value="a" /><el-option label="B 左右分栏" value="b" /><el-option label="C 分步引导" value="c" /></el-select>
      <span style="font-size:12px;color:#5b6570;white-space:nowrap">配色</span>
      <el-select v-model="e.draft.value.theme" size="small" style="width:140px"><el-option v-for="t in THEMES" :key="t.id" :label="t.label" :value="t.id"><span style="display:inline-flex;align-items:center;gap:6px"><i :style="{ width: '12px', height: '12px', borderRadius: '50%', background: t.main, display: 'inline-block' }"></i>{{ t.label }}</span></el-option></el-select>
      <div class="se-ops">
        <el-button size="small" type="primary" :loading="e.saving.value" @click="e.save()">保存</el-button>
        <el-button size="small" @click="e.exitEdit()">退出</el-button>
      </div>
    </div>
    <div class="se-body">
      <div class="se-col">
        <div class="se-addpanel">
          <div class="se-panel-h"><b>新增内容块（按位置）</b></div>
          <div class="se-addrow">
            <el-button size="small" plain @click="e.addBlock('top', 'center')">添加到顶部区域</el-button>
            <el-button size="small" plain @click="e.addBlock('bottom', 'center')">添加到底部区域</el-button>
            <el-button size="small" plain @click="e.addBlock('left', 'center')">添加到左侧区域</el-button>
            <el-button size="small" plain @click="e.addBlock('right', 'center')">添加到右侧区域</el-button>
          </div>
        </div>
        <div v-if="e.selected.value" class="se-panel">
          <div class="se-panel-h"><b>选中块</b><el-button size="small" type="danger" plain @click="e.removeBlock(e.selected.value.id)">删除块</el-button></div>
          <div class="se-field"><span>区域</span><el-select v-model="e.selected.value.region" size="small" style="width:140px" @change="e.selected.value.x = Math.min(e.selected.value.x, e.REGION_W[e.selected.value.region] - e.selected.value.w)"><el-option v-for="rg in e.REGIONS" :key="rg.id" :label="rg.label" :value="rg.id" /></el-select></div>
          <div class="se-grid">
            <label>X<el-input-number v-model.number="e.selected.value.x" :min="0" :max="e.REGION_W[e.selected.value.region]" size="small" controls-position="right" /></label>
            <label>Y<el-input-number v-model.number="e.selected.value.y" :min="0" size="small" controls-position="right" /></label>
            <label>W<el-input-number v-model.number="e.selected.value.w" :min="40" :max="e.REGION_W[e.selected.value.region]" size="small" controls-position="right" /></label>
            <label>H<el-input-number v-model.number="e.selected.value.h" :min="20" size="small" controls-position="right" /></label>
          </div>
          <div class="se-field"><span>图片</span>
            <el-input v-model="e.selected.value.imageUrl" size="small" placeholder="/uploads/… 或 https://…" />
            <label class="el-button el-button--default el-button--small" style="margin:0"><input type="file" accept="image/png,image/jpeg,image/webp,image/gif" style="display:none" @change="uploadImage" :disabled="uploading" />上传</label>
          </div>
          <div class="se-field"><span>文本</span><el-input v-model="e.selected.value.text" size="small" maxlength="200" placeholder="文本（图/文至少其一）" /></div>
          <div class="se-field"><span>链接</span><el-input v-model="e.selected.value.link" size="small" placeholder="https://… 或 /shop/…（可选）" /></div>
        </div>
        <div v-else class="se-hint">点击画布中的块可选中编辑；拖动调整位置/大小</div>
      </div>
      <div class="se-col se-links">
        <div class="se-panel">
          <div class="se-panel-h"><b>顶栏链接</b><el-button size="small" :disabled="e.links.value.length >= 6" @click="e.addLink()">＋</el-button></div>
          <div v-for="(l, i) in e.links.value" :key="i" class="se-link-row">
            <el-input v-model="l.name" size="small" placeholder="名称" style="width:150px" />
            <el-input v-model="l.url" size="small" placeholder="https://… 或 /shop/…" style="flex:1" />
            <el-button size="small" text type="danger" @click="e.removeLink(i)">删</el-button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div v-if="e.confirmExit.value" class="se-mask" @click.self="e.confirmExit.value = false">
    <div class="se-dialog">
      <p>有未保存的改动，退出将放弃更改。确定退出？</p>
      <div>
        <el-button size="small" type="primary" @click="e.exitEdit(true)">放弃并退出</el-button>
        <el-button size="small" @click="e.confirmExit.value = false">继续编辑</el-button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.se-fab { position: fixed; right: 24px; bottom: 24px; z-index: 60; background: var(--sf-strong); color: #fff; border-radius: 999px; padding: 10px 18px; font-size: 14px; cursor: pointer; box-shadow: 0 4px 14px rgba(63,113,52,.35); }
.se-fab:hover { background: var(--sf-strong); }
.se-bar { position: fixed; z-index: 58; width: 620px; max-width: 92vw; max-height: 76vh; overflow: auto; background: #fff; border: 1px solid #dfe6db; border-radius: 12px; box-shadow: 0 10px 34px rgba(0,0,0,.18); padding: 10px 16px 14px; }
.se-bar-top { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; cursor: move; user-select: none; }
.se-bar-top strong { font-size: 15px; color: #2b333b; }
.se-hint { color: #8a94a0; font-size: 12px; flex: 1; }
.se-ops { white-space: nowrap; }
.se-body { display: flex; gap: 16px; }
.se-col { flex: 1; min-width: 0; }
.se-links { flex: 0 0 40%; }
.se-panel { border: 1px solid #ecefe9; border-radius: 10px; padding: 10px 12px; }
.se-panel-h { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.se-panel-h b { font-size: 13px; color: #3d4750; }
.se-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin-bottom: 8px; }
.se-grid label { display: flex; flex-direction: column; gap: 2px; font-size: 11px; color: #8a94a0; }
.se-field { display: flex; align-items: center; gap: 6px; margin-top: 6px; }
.se-field span { font-size: 12px; color: #5b6570; width: 30px; }
.se-field .el-input { flex: 1; }
.se-link-row { display: flex; align-items: center; gap: 6px; margin-top: 6px; }
.se-addpanel { border: 1px solid #ecefe9; border-radius: 10px; padding: 10px 12px; margin-bottom: 8px; }
.se-addrow { display: flex; flex-wrap: wrap; gap: 6px; }
.se-addrow .el-button { margin-left: 0; }
.se-hint { color: #8a94a0; font-size: 12px; margin-top: 6px; }
.se-mask { position: fixed; inset: 0; z-index: 70; background: rgba(0,0,0,.3); display: flex; align-items: center; justify-content: center; }
.se-dialog { background: #fff; border-radius: 12px; padding: 20px 22px; text-align: center; }
.se-dialog p { margin: 0 0 14px; color: #3d4750; }
</style>

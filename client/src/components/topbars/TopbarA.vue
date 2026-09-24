<script setup>
import { computed } from 'vue'
import { isSafeWebUrl } from '../../utils/url'
const props = defineProps({
  brandName: { type: String, default: '' },
  brandSubtitle: { type: String, default: '' },
  brandLogo: { type: String, default: '' },
  user: { type: Object, default: null },
  authenticated: { type: Boolean, default: false },
  isAdmin: { type: Boolean, default: false },
  storefrontPath: { type: String, default: '/shop/default' },
  contact: { type: Object, default: () => ({}) },
  topbarLinks: { type: Array, default: () => [] },
  showEdit: { type: Boolean, default: false },
})
const emit = defineEmits(['login', 'logout', 'goStorefront', 'goAdmin', 'goNav', 'goEdit'])

const activeIndex = computed(() => (props.authenticated && props.isAdmin) ? '/admin' : '/storefront')
const roleText = computed(() => props.user?.role === 'super_admin' ? '超级管理员' : '商家')
const roleTag = computed(() => props.user?.role === 'super_admin' ? 'warning' : 'success')
const initial = computed(() => (props.brandName || 'P').slice(0, 1))
const initialUser = computed(() => (props.user?.username || 'U').slice(0, 1).toUpperCase())

function onSelect(index) {
  if (index === '/admin') emit('goAdmin')
  else if (index === '/storefront') emit('goStorefront')
  else if (index.startsWith('/')) emit('goNav', index)
  else if (isSafeWebUrl(index)) window.open(index, '_blank', 'noopener,noreferrer')
}
function onCommand(cmd) {
  if (cmd === 'admin') emit('goAdmin')
  else if (cmd === 'edit') emit('goEdit')
  else if (cmd === 'logout') emit('logout')
}
</script>

<template>
  <header class="tb-a">
    <div class="tb-a-brand">
      <el-avatar :size="40" shape="square" :src="brandLogo || undefined" class="tb-a-logo">{{ initial }}</el-avatar>
      <div class="tb-a-titles">
        <el-text tag="strong" size="large" truncated>{{ brandName }}</el-text>
        <el-text size="small" type="info" truncated>{{ brandSubtitle }}</el-text>
      </div>
    </div>

    <el-menu :default-active="activeIndex" mode="horizontal" :ellipsis="false" class="tb-a-menu" @select="onSelect">
      <el-menu-item index="/storefront">客户报价前台</el-menu-item>
      <el-menu-item v-for="l in topbarLinks" :key="l.name" :index="l.url">{{ l.name }}</el-menu-item>
    </el-menu>

    <div class="tb-a-account">
      <template v-if="authenticated">
        <el-dropdown trigger="click" @command="onCommand">
          <span class="tb-a-user">
            <el-avatar :size="26">{{ initialUser }}</el-avatar>
            <span class="tb-a-username">{{ user?.username }}</span>
            <el-tag :type="roleTag" size="small" round>{{ roleText }}</el-tag>
            <el-icon class="tb-a-caret"><svg viewBox="0 0 1024 1024" width="12" height="12"><path fill="currentColor" d="M831.9 340.9 512 660.8 192.1 340.9a30.6 30.6 0 0 0-42.8 0 29.1 29.1 0 0 0 0 41.6l340.3 331.7a32 32 0 0 0 44.7 0l340.3-331.7a29.1 29.1 0 0 0 0-41.6 30.6 30.6 0 0 0-42.7 0z"/></svg></el-icon>
          </span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item disabled>{{ user?.username }} · {{ roleText }}</el-dropdown-item>
              <el-dropdown-item command="admin">商家后台</el-dropdown-item>
              <el-dropdown-item v-if="showEdit" command="edit">编辑页面</el-dropdown-item>
              <el-dropdown-item divided command="logout">退出登录</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </template>
      <el-button v-else class="pb-btn-primary tb-a-login" type="primary" round size="small" @click="emit('login')">登录</el-button>
    </div>
  </header>
</template>

<style scoped>
.tb-a { height: 64px; padding: 0 2vw; display: flex; align-items: center; gap: 22px; background: #fff; border-bottom: 1px solid var(--el-border-color-lighter, #e7ebe5); position: sticky; top: 0; z-index: 20; --el-menu-item-height: 64px; --el-menu-active-color: var(--el-color-primary, var(--sf-main)); --el-menu-hover-bg-color: transparent; }
.tb-a-brand { display: flex; align-items: center; gap: 12px; min-width: 0; }
.tb-a-logo { background: linear-gradient(135deg, var(--sf-main), var(--sf-strong)); color: #fff; font-weight: 800; font-size: 17px; flex: 0 0 auto; }
.tb-a-titles { display: flex; flex-direction: column; line-height: 1.3; min-width: 0; max-width: 240px; }
.tb-a-menu { flex: 1; border-bottom: none !important; }
.tb-a-menu :deep(.el-menu-item) { font-weight: 600; font-size: 13px; }
.tb-a-account { display: flex; align-items: center; }
.tb-a-user { display: flex; align-items: center; gap: 8px; cursor: pointer; outline: none; padding: 4px 6px; border-radius: 8px; }
.tb-a-user:hover { background: var(--el-fill-color-light, #f5f7fa); }
.tb-a-username { font-size: 13px; color: var(--el-text-color-primary, #303133); max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tb-a-caret { color: var(--el-text-color-secondary, #909399); }
.tb-a-login { min-width: 76px; }
@media (max-width: 760px) {
  .tb-a { padding: 0 12px; gap: 10px; }
  .tb-a-titles { display: none; }
  .tb-a-menu :deep(.el-menu-item) { font-size: 12px; padding: 0 12px; }
  .tb-a-username { display: none; }
}
</style>

<script setup>
const props = defineProps({
  brandName: { type: String, default: '' },
  brandSubtitle: { type: String, default: '' },
  brandLogo: { type: String, default: '' },
  user: { type: Object, default: null },
  authenticated: { type: Boolean, default: false },
  isAdmin: { type: Boolean, default: false },
  storefrontPath: { type: String, default: '/shop/default' },
  contact: { type: Object, default: () => ({}) },
})
const emit = defineEmits(['login', 'logout', 'goStorefront', 'goAdmin'])
</script>

<template>
  <header class="tb-c">
    <div class="tb-c-inner">
      <div class="tb-c-brand">
        <span class="tb-c-logo"><img v-if="brandLogo" :src="brandLogo" alt=""><template v-else>{{ (brandName || 'P').slice(0, 1) }}</template></span>
        <div><strong>{{ brandName }}</strong><small>{{ brandSubtitle }}</small></div>
      </div>
      <nav class="tb-c-nav">
        <button :class="{ active: !isAdmin }" @click="emit('goStorefront')">客户报价前台</button>
        <button :class="{ active: isAdmin }" @click="emit('goAdmin')">商家后台</button>
      </nav>
      <div class="tb-c-right">
        <template v-if="authenticated">
          <span class="tb-c-role">{{ user?.role === 'super_admin' ? '超级管理员' : '商家' }}</span>
          <button class="tb-c-logout" @click="emit('logout')">退出</button>
        </template>
        <button v-else class="tb-c-login" @click="emit('login')">登录</button>
        <button class="tb-c-cta" @click="emit('goStorefront')">立即报价 ↗</button>
      </div>
    </div>
  </header>
</template>

<style scoped>
.tb-c { position: sticky; top: 0; z-index: 20; background: linear-gradient(100deg, #1d3427, var(--sf-strong) 55%, #3f5f3a); color: #fff; box-shadow: 0 2px 14px rgba(26,44,32,.18); }
.tb-c-inner { display: flex; align-items: center; gap: 22px; padding: 12px 4vw; max-width: 1400px; margin: 0 auto; }
.tb-c-brand { display: flex; align-items: center; gap: 12px; }
.tb-c-logo { width: 42px; height: 42px; border-radius: 12px; background: rgba(255,255,255,.14); border: 1px solid rgba(255,255,255,.25); color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 17px; overflow: hidden; }
.tb-c-logo img { width: 100%; height: 100%; object-fit: cover; }
.tb-c-brand strong { display: block; font-size: 17px; }
.tb-c-brand small { font-size: 11px; color: #c7d7cc; }
.tb-c-nav { display: flex; gap: 24px; margin: 0 auto; }
.tb-c-nav button { border: 0; background: transparent; color: #d5e0d9; font-weight: 600; font-size: 13px; padding: 6px 2px; position: relative; cursor: pointer; }
.tb-c-nav button:hover { color: #fff; }
.tb-c-nav button.active { color: #fff; }
.tb-c-nav button.active::after { content: ''; position: absolute; left: 0; right: 0; bottom: -4px; height: 2px; background: #b8e07e; }
.tb-c-right { display: flex; align-items: center; gap: 12px; }
.tb-c-role { font-size: 12px; color: #d5e0d9; }
.tb-c-login { border: 1px solid rgba(255,255,255,.4); color: #fff; background: transparent; border-radius: 20px; padding: 7px 16px; font-size: 13px; cursor: pointer; }
.tb-c-logout { border: 0; background: transparent; color: #d5e0d9; font-size: 13px; cursor: pointer; }
.tb-c-cta { border: 0; background: #b8e07e; color: #1d3427; border-radius: 22px; padding: 9px 20px; font-size: 13px; font-weight: 700; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,.18); transition: transform .12s; }
.tb-c-cta:hover { transform: translateY(-1px); }
@media (max-width: 760px) { .tb-c-nav { display: none; } }
</style>

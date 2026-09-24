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
const contactText = (props.contact?.wechat || props.contact?.qq) ? (props.contact.wechat ? '微信 ' + props.contact.wechat : 'QQ ' + props.contact.qq) : ''
</script>

<template>
  <header class="tb-b">
    <div class="tb-b-top">
      <div class="tb-b-brand">
        <span class="tb-b-logo"><img v-if="brandLogo" :src="brandLogo" alt=""><template v-else>{{ (brandName || 'P').slice(0, 1) }}</template></span>
        <div><strong>{{ brandName }}</strong><small>{{ brandSubtitle }}</small></div>
      </div>
      <div class="tb-b-contact">
        <span v-if="contactText" class="tb-b-contact-item">☎ {{ contactText }}</span>
        <span class="tb-b-contact-item">前台地址 {{ storefrontPath.replace('/shop/', '') }}</span>
      </div>
      <div class="tb-b-account">
        <template v-if="authenticated">
          <span class="tb-b-role">{{ user?.role === 'super_admin' ? '超级管理员' : '商家' }}</span>
          <button class="tb-b-logout" @click="emit('logout')">退出</button>
        </template>
        <button v-else class="tb-b-login" @click="emit('login')">登录</button>
      </div>
    </div>
    <nav class="tb-b-nav">
      <button :class="{ active: !isAdmin }" @click="emit('goStorefront')">客户报价前台</button>
      <button :class="{ active: isAdmin }" @click="emit('goAdmin')">商家后台</button>
    </nav>
  </header>
</template>

<style scoped>
.tb-b { position: sticky; top: 0; z-index: 20; background: #fff; border-bottom: 1px solid #e7ebe5; }
.tb-b-top { display: flex; align-items: center; gap: 20px; padding: 12px 4vw; }
.tb-b-brand { display: flex; align-items: center; gap: 12px; }
.tb-b-logo { width: 44px; height: 44px; border-radius: 10px; background: linear-gradient(135deg, var(--sf-main), var(--sf-strong)); color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 18px; overflow: hidden; }
.tb-b-logo img { width: 100%; height: 100%; object-fit: cover; }
.tb-b-brand strong { display: block; font-size: 17px; color: #2b333b; }
.tb-b-brand small { font-size: 11px; color: #8a94a0; }
.tb-b-contact { display: flex; gap: 16px; margin-left: auto; }
.tb-b-contact-item { font-size: 12px; color: #6b786f; background: #f4f7f1; border: 1px solid #e7ebe5; border-radius: 16px; padding: 5px 12px; white-space: nowrap; }
.tb-b-account { display: flex; align-items: center; gap: 10px; }
.tb-b-role { font-size: 12px; color: var(--sf-main); font-weight: 600; }
.tb-b-login { border: 1px solid var(--sf-border); color: var(--sf-strong); background: #f5faef; border-radius: 20px; padding: 7px 18px; font-size: 13px; font-weight: 600; cursor: pointer; }
.tb-b-logout { border: 0; background: transparent; color: #8a94a0; font-size: 13px; cursor: pointer; }
.tb-b-nav { display: flex; gap: 30px; padding: 0 4vw; background: #2b333b; }
.tb-b-nav button { border: 0; background: transparent; color: #c7d2dd; font-weight: 600; font-size: 13px; padding: 12px 2px; position: relative; cursor: pointer; }
.tb-b-nav button:hover { color: #fff; }
.tb-b-nav button.active { color: #fff; }
.tb-b-nav button.active::after { content: ''; position: absolute; left: 0; right: 0; bottom: 0; height: 3px; background: #88bd45; }
@media (max-width: 760px) { .tb-b-contact { display: none; } }
</style>

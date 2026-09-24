<script setup>
import { computed, ref } from 'vue'
import { ArrowLeft } from '@element-plus/icons-vue'
import { useRoute } from 'vue-router'
import TopbarA from '../../components/topbars/TopbarA.vue'
import TopbarB from '../../components/topbars/TopbarB.vue'
import TopbarC from '../../components/topbars/TopbarC.vue'

const route = useRoute()
const variant = computed(() => String(route.params.variant || 'a').toLowerCase())
const Comp = computed(() => variant.value === 'b' ? TopbarB : variant.value === 'c' ? TopbarC : TopbarA)

const state = ref('guest') // guest | merchant | super
const user = computed(() => state.value === 'super' ? { role: 'super_admin', username: 'admin' } : state.value === 'merchant' ? { role: 'merchant', username: 'merchant' } : null)
const authenticated = computed(() => state.value !== 'guest')
const isAdmin = computed(() => route.query.view === 'admin')
const brand = {
  brandName: '金福赢包装',
  brandSubtitle: '在线报价 · 定制包装',
  brandLogo: '',
  contact: { wechat: 'jfy-pack', qq: '12345678' },
}
const planNames = { a: 'A · 简洁单行（毛玻璃）', b: 'B · 双栏商务风', c: 'C · 营销 CTA 风' }
</script>

<template>
  <div class="tb-demo">
    <component :is="Comp" v-bind="brand" :user="user" :authenticated="authenticated" :is-admin="isAdmin" storefront-path="/shop/jinfuying"
      @login="state = 'merchant'" @logout="state = 'guest'" @go-storefront="isAdmin = false" @go-admin="isAdmin = true" />

    <div class="tb-demo-toolbar">
      <a href="/demo" class="tb-demo-back"><el-icon style="vertical-align:-2px"><ArrowLeft /></el-icon> 返回方案总览</a>
      <span class="tb-demo-title">顶栏方案 {{ planNames[variant] }}</span>
      <div class="tb-demo-states">
        <button :class="{ on: state === 'guest' }" @click="state = 'guest'">未登录</button>
        <button :class="{ on: state === 'merchant' }" @click="state = 'merchant'">商家</button>
        <button :class="{ on: state === 'super' }" @click="state = 'super'">超管</button>
        <button :class="{ on: !isAdmin }" @click="isAdmin = false">前台视角</button>
        <button :class="{ on: isAdmin }" @click="isAdmin = true">后台视角</button>
      </div>
    </div>

    <main class="tb-demo-body">
      <section class="tb-demo-hero"><h1>{{ brand.brandName }}</h1><p>在线包装报价 · 盒型、尺寸、材质、工艺一站式。</p></section>
      <div class="tb-demo-cards"><div v-for="i in 6" :key="i" class="tb-demo-card"><b>盒型 {{ i }}</b><span>示例内容用于测试顶栏吸顶效果，滚动试试。</span></div></div>
      <p class="tb-demo-scroll">↓ 继续向下滚动，顶栏应保持吸顶</p>
    </main>
  </div>
</template>

<style scoped>
.tb-demo { min-height: 100vh; background: #f5f6f8; }
.tb-demo-toolbar { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; padding: 12px 4vw; background: #fff; border-bottom: 1px dashed #e7ebe5; }
.tb-demo-back { color: var(--sf-main); font-size: 13px; text-decoration: none; }
.tb-demo-title { font-size: 14px; font-weight: 700; color: #2b333b; }
.tb-demo-states { margin-left: auto; display: flex; gap: 8px; flex-wrap: wrap; }
.tb-demo-states button { border: 1px solid #dce6d9; background: #fff; border-radius: 16px; padding: 6px 13px; font-size: 12px; color: #6b786f; cursor: pointer; }
.tb-demo-states button.on { background: var(--sf-soft); border-color: var(--sf-light); color: var(--sf-strong); }
.tb-demo-body { max-width: 1080px; margin: 0 auto; padding: 26px 18px 60px; }
.tb-demo-hero { background: linear-gradient(135deg, #f1f7ec, #e2ecd9); border-radius: 18px; padding: 46px 34px; margin-bottom: 20px; }
.tb-demo-hero h1 { margin: 0 0 8px; font-size: 26px; color: #2b333b; }
.tb-demo-hero p { margin: 0; color: #6b786f; font-size: 14px; }
.tb-demo-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 14px; }
.tb-demo-card { background: #fff; border: 1px solid #e7ebe5; border-radius: 14px; padding: 20px; min-height: 150px; display: flex; flex-direction: column; gap: 8px; }
.tb-demo-card b { color: #2b333b; font-size: 15px; }
.tb-demo-card span { color: #8a94a0; font-size: 12px; line-height: 1.6; }
.tb-demo-scroll { text-align: center; color: #8a94a0; font-size: 13px; margin-top: 26px; }
</style>

<script setup>
import { Menu, Grid, Right } from '@element-plus/icons-vue'
const plans = [
  { id: 'plan-a', no: 'A', name: '单列卡片流', desc: '一路向下填写，底部悬浮总价下单。像点外卖一样顺手，手机电脑都自然。', tag: '移动友好', color: 'var(--sf-main)', icon: Menu },
  { id: 'plan-b', no: 'B', name: '左右分栏工作台', desc: '左边全部配置、右边固定报价明细，一屏看全，改什么立刻看价。', tag: '桌面高效', color: '#3f5f7a', icon: Grid },
  { id: 'plan-c', no: 'C', name: '分步向导', desc: '选盒型 → 填尺寸 → 材料与工艺 → 核对下单，四步引导，防错性最强。', tag: '引导式', color: '#3d67ad', icon: Right },
]
</script>

<template>
  <div class="d-wrap">
    <header class="d-head"><h1>前台排版方案演示</h1><p>三套方案都基于同一套报价逻辑，仅排版不同。点击进入体验，选好告诉我编号即可。</p></header>
    <main class="d-grid">
      <router-link v-for="p in plans" :key="p.id" :to="'/demo/' + p.id" class="d-card">
        <div class="d-icon" :style="{ background: p.color + '1a', color: p.color }"><el-icon :size="22"><component :is="p.icon" /></el-icon></div>
        <h2><em>{{ p.no }}</em>{{ p.name }}</h2>
        <p class="d-desc">{{ p.desc }}</p>
        <span class="d-tag" :style="{ color: p.color, borderColor: p.color + '55' }">{{ p.tag }}</span>
        <b class="d-go">进入演示<el-icon style="vertical-align:-2px"><Right /></el-icon></b>
      </router-link>
    </main>
    <router-link to="/shop/default" class="d-current">查看现有排版（下单页） →</router-link>
  </div>
</template>

<style scoped>
.d-wrap { min-height: 100vh; background: linear-gradient(160deg, #f8f9fb, #eef1f4); padding: 40px 20px 60px; }
.d-head { text-align: center; margin-bottom: 30px; }
.d-head h1 { font-size: 26px; color: #2b333b; margin: 0 0 8px; }
.d-head p { color: #839087; font-size: 14px; margin: 0; }
.d-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 18px; max-width: 1080px; margin: 0 auto; }
.d-card { background: #fff; border: 1px solid #e7ebe5; border-radius: 16px; padding: 22px; text-decoration: none; color: #253446; transition: all .18s; display: flex; flex-direction: column; }
.d-card:hover { transform: translateY(-3px); box-shadow: 0 10px 24px rgba(33,59,40,.10); }
.d-icon { width: 46px; height: 46px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 22px; }
.d-card h2 { margin: 14px 0 6px; font-size: 18px; display: flex; align-items: baseline; gap: 8px; }
.d-card h2 em { font-style: normal; font-size: 12px; color: #fff; background: #2b333b; border-radius: 6px; padding: 2px 7px; }
.d-desc { color: #6b786f; font-size: 13px; line-height: 1.7; margin: 0 0 14px; flex: 1; }
.d-tag { align-self: flex-start; font-size: 12px; border: 1px solid; border-radius: 20px; padding: 3px 10px; }
.d-go { margin-top: 16px; color: var(--sf-main); font-size: 14px; }
.d-current { display: inline-block; margin: 34px auto 0; text-align: center; color: #839087; font-size: 13px; }
</style>

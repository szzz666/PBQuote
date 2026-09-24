<script setup>
import { computed } from 'vue'
import { useConfigStore } from '../stores/config'
import PlanAView from './demo/PlanAView.vue'
import PlanBView from './demo/PlanBView.vue'
import PlanCView from './demo/PlanCView.vue'
import StorefrontRegion from '../components/StorefrontRegion.vue'
import StorefrontEditor from '../components/StorefrontEditor.vue'

const configStore = useConfigStore()
const config = computed(() => configStore.config)
const layout = computed(() => config.value.storefrontLayout || 'b')
const LayoutComp = computed(() => layout.value === 'a' ? PlanAView : layout.value === 'c' ? PlanCView : PlanBView)
</script>

<template>
  <div class="sv-shell">
    <div class="sv-top"><StorefrontRegion region="top" /></div>
    <div class="sv-row">
      <aside class="sv-side sv-left"><StorefrontRegion region="left" /></aside>
      <main class="sv-main"><component :is="LayoutComp" /></main>
      <aside class="sv-side sv-right"><StorefrontRegion region="right" /></aside>
    </div>
    <div class="sv-bottom"><StorefrontRegion region="bottom" /></div>
    <StorefrontEditor />
  </div>
</template>

<style scoped>
.sv-shell { max-width: 1560px; margin: 0 auto; padding: 0 18px 90px; }
.sv-top { margin: 16px 0 2px; }
.sv-row { display: flex; gap: 14px; align-items: flex-start; }
.sv-side { flex: 0 0 260px; min-width: 0; }
.sv-main { flex: 1; min-width: 0; }
.sv-bottom { margin-top: 16px; }
@media (max-width: 1180px) { .sv-side { display: none; } .sv-row { display: block; } }
</style>

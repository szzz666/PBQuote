import { createRouter, createWebHistory } from 'vue-router'
import StorefrontView from '../views/StorefrontView.vue'
import InstallView from '../views/InstallView.vue'
import AdminView from '../views/AdminView.vue'
import DemoIndexView from '../views/demo/DemoIndexView.vue'
import PlanAView from '../views/demo/PlanAView.vue'
import PlanBView from '../views/demo/PlanBView.vue'
import PlanCView from '../views/demo/PlanCView.vue'
import TopbarDemoView from '../views/demo/TopbarDemoView.vue'
import AdminDemoView from '../views/demo/AdminDemoView.vue'
import ConsoleDemoView from '../views/demo/ConsoleDemoView.vue'
import KeepNavDemoView from '../views/demo/KeepNavDemoView.vue'
import DashDemoView from '../views/demo/DashDemoView.vue'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/shop/default' },
    { path: '/install', name: 'install', component: InstallView },
    { path: '/shop', name: 'storefront-default', component: StorefrontView },
    { path: '/shop/:slug', name: 'storefront', component: StorefrontView },
    { path: '/admin', name: 'admin', component: AdminView },
    { path: '/demo', name: 'demo', component: DemoIndexView },
    { path: '/demo/plan-a', name: 'demo-a', component: PlanAView },
    { path: '/demo/plan-b', name: 'demo-b', component: PlanBView },
    { path: '/demo/plan-c', name: 'demo-c', component: PlanCView },
    { path: '/demo/topbar/:variant', name: 'topbar-demo', component: TopbarDemoView },
    { path: '/demo/admin/:variant', name: 'admin-demo', component: AdminDemoView },
    { path: '/demo/console/:variant', name: 'console-demo', component: ConsoleDemoView },
    { path: '/demo/keep/:variant', name: 'keep-nav-demo', component: KeepNavDemoView },
    { path: '/demo/dash/:variant', name: 'dash-demo', component: DashDemoView },
    { path: '/:pathMatch(.*)*', redirect: '/shop/default' },
  ],
})

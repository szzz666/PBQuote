<script setup>
import { computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import AdminWorkspace from '../components/AdminWorkspace.vue'
import { useAuthStore } from '../stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const { authenticated } = storeToRefs(auth)

const onAdminRoute = computed(() => route.path.startsWith('/admin'))
watch(onAdminRoute, (on) => { if (on && !authenticated.value) auth.requireLogin() }, { immediate: true })

function goLogin() { auth.requireLogin() }
function handleLogout() { auth.logout().then(() => router.push('/')) }
function handlePreview(slug) { router.push('/shop/' + slug) }
</script>

<template>
  <AdminWorkspace v-if="authenticated" @preview="handlePreview" @logout="handleLogout" />
  <main v-else class="empty-state"><h1>登录商户后台</h1><p>使用商家或超级管理员账号登录后管理工作台。</p><el-button class="primary-action" type="primary" @click="goLogin">登录后台</el-button></main>
</template>

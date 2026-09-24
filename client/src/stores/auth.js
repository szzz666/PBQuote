import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { StorageSerializers, useLocalStorage } from '@vueuse/core'
import { http } from '../api/client'

export const useAuthStore = defineStore('auth', () => {
  const token = useLocalStorage('pbquote-token', '')
  const user = useLocalStorage('pbquote-user', null, { serializer: StorageSerializers.object })
  const loginModalVisible = ref(false)

  const authenticated = computed(() => Boolean(token.value && user.value))
  const displayRole = computed(() => user.value?.role === 'super_admin' ? '超级管理员' : '商家')
  const merchantSlug = computed(() => user.value?.merchantSlug || '')

  async function login(username, password) {
    const data = await http.post('/auth/login', { username, password })
    token.value = data.accessToken
    user.value = data.user
    return data.user
  }

  async function logout() {
    try { await http.post('/auth/logout') } catch { /* 令牌失效也不阻塞登出 */ }
    reset()
  }

  function reset() {
    token.value = ''
    user.value = null
  }

  function requireLogin() { loginModalVisible.value = true }

  return { token, user, loginModalVisible, authenticated, displayRole, merchantSlug, login, logout, reset, requireLogin }
})

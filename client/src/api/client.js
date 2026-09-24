import axios from 'axios'
import { useAuthStore } from '../stores/auth'

export const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'

export const http = axios.create({ baseURL: API_BASE, timeout: 8000 })

function extractError(error) {
  const data = error?.response?.data
  if (data?.message) return Array.isArray(data.message) ? data.message.join('；') : data.message
  if (data?.error) return data.error
  return error.message || '请求失败'
}

http.interceptors.request.use((config) => {
  const auth = useAuthStore()
  if (auth.token) config.headers.Authorization = 'Bearer ' + auth.token
  return config
})

http.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error?.response?.status === 401) useAuthStore().reset()
    return Promise.reject(new Error(extractError(error)))
  }
)

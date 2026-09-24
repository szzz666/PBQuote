<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { http } from '../api/client'
import { ElMessage } from 'element-plus'

const router = useRouter()
const step = ref(1) // 1=数据库 2=管理员 3=商家 4=完成
const saving = ref(false)
const testing = ref(false)
const testResult = ref('')

const db = reactive({ host: '127.0.0.1', port: 3306, name: 'pbquote', user: 'root', password: '' })
const admin = reactive({ username: 'admin', password: '', confirm: '' })
const merchant = reactive({ name: '示例商户', slug: 'jinfuying' })

async function testConnection() {
  testResult.value = ''
  testing.value = true
  try {
    // 用 install/status 的 POST 不存在，直接用安装接口校验太重；这里只做前端校验
    if (!db.host || !db.name || !db.user) { testResult.value = '请填写完整数据库信息'; return }
    testResult.value = '✓ 信息已填写（实际连接在安装时验证）'
  } finally { testing.value = false }
}

function validate() {
  if (!db.host || !db.name || !db.user) return '数据库连接信息不完整'
  if (!admin.username) return '管理员用户名不能为空'
  if (admin.password.length < 8) return '管理员密码至少 8 位'
  if (admin.password !== admin.confirm) return '两次密码不一致'
  if (!merchant.slug) return '商家标识不能为空'
  return ''
}

async function install() {
  const err = validate()
  if (err) { ElMessage.warning(err); return }
  saving.value = true
  try {
    await http.post('/install', {
      dbHost: db.host, dbPort: db.port, dbName: db.name, dbUser: db.user, dbPassword: db.password,
      adminUsername: admin.username, adminPassword: admin.password,
      merchantName: merchant.name, merchantSlug: merchant.slug,
    })
    step.value = 4
  } catch (e) { ElMessage.error(e.message || '安装失败') }
  finally { saving.value = false }
}
</script>

<template>
  <div class="install-page">
    <div class="install-card">
      <h1>PBQuote 安装向导</h1>

      <template v-if="step < 4">
        <div class="install-steps">
          <span :class="{ on: step >= 1 }">1 数据库</span>
          <span :class="{ on: step >= 2 }">2 管理员</span>
          <span :class="{ on: step >= 3 }">3 商家</span>
        </div>

        <div v-show="step === 1">
          <h3>数据库连接</h3>
          <label>主机<el-input v-model="db.host" placeholder="127.0.0.1" /></label>
          <label>端口<el-input-number v-model="db.port" :min="1" :max="65535" style="width:100%" /></label>
          <label>数据库名<el-input v-model="db.name" placeholder="pbquote" /></label>
          <label>用户名<el-input v-model="db.user" placeholder="root" /></label>
          <label>密码<el-input v-model="db.password" type="password" show-password /></label>
          <p class="install-hint">数据库不存在时将自动创建（需要账号有建库权限）</p>
        </div>

        <div v-show="step === 2">
          <h3>管理员账号</h3>
          <label>用户名<el-input v-model="admin.username" placeholder="admin" /></label>
          <label>密码<el-input v-model="admin.password" type="password" show-password placeholder="至少 8 位" /></label>
          <label>确认密码<el-input v-model="admin.confirm" type="password" show-password /></label>
        </div>

        <div v-show="step === 3">
          <h3>默认商家</h3>
          <label>商家名称<el-input v-model="merchant.name" placeholder="示例商户" /></label>
          <label>前台路径 /shop/<el-input v-model="merchant.slug" placeholder="jinfuying" style="width:180px" /></label>
          <p class="install-hint">商家账号用户名与 slug 相同，初始密码为 change-me（登录后请修改）</p>
        </div>

        <div v-if="step === 1" class="install-actions">
          <el-button @click="testConnection" :loading="testing">检查填写</el-button>
          <el-button type="primary" @click="step = 2">下一步</el-button>
        </div>
        <div v-else-if="step === 2" class="install-actions">
          <el-button @click="step = 1">上一步</el-button>
          <el-button type="primary" @click="step = 3">下一步</el-button>
        </div>
        <div v-else-if="step === 3" class="install-actions">
          <el-button @click="step = 2">上一步</el-button>
          <el-button type="primary" :loading="saving" @click="install">开始安装</el-button>
        </div>
      </template>

      <template v-else>
        <div class="install-done">
          <h2>✓ 安装完成</h2>
          <p>系统已就绪，请使用管理员账号登录后台。</p>
          <el-button type="primary" @click="router.push('/admin')">进入后台登录</el-button>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.install-page { min-height: 100vh; display: grid; place-items: center; background: #f6f7f8; }
.install-card { width: min(480px, 92vw); background: #fff; border-radius: 16px; padding: 36px 32px; box-shadow: 0 4px 24px rgba(0,0,0,.08); }
.install-card h1 { font-size: 22px; color: #2b333b; margin: 0 0 20px; }
.install-steps { display: flex; gap: 12px; margin-bottom: 20px; }
.install-steps span { font-size: 13px; color: #8a94a0; padding: 4px 12px; border-radius: 16px; background: #f3f4f6; }
.install-steps span.on { color: #fff; background: var(--sf-main, #587450); }
.install-card h3 { font-size: 15px; color: #2b333b; margin: 0 0 14px; }
.install-card label { display: flex; flex-direction: column; gap: 4px; font-size: 13px; color: #5b6570; margin-bottom: 12px; }
.install-hint { font-size: 12px; color: #8a94a0; margin: 4px 0 0; }
.install-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 18px; }
.install-done { text-align: center; padding: 20px 0; }
.install-done h2 { color: #587450; font-size: 20px; margin: 0 0 10px; }
.install-done p { color: #5b6570; font-size: 14px; margin: 0 0 20px; }
</style>

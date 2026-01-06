<script setup>
import {ref, reactive, onMounted, onUnmounted} from 'vue'
import {toast} from 'vue-sonner'
import {loadConfig, saveConfig, checkConfig, resetConfig} from '@/services/config'
import {selectDownloadDir, getSystemDownloadDir} from '../services/download/tauriDownload.js'
import {
  generateQRCode,
  pollQRCodeStatus,
  getUserInfo,
  saveBilibiliAuth,
  loadBilibiliAuth,
  clearBilibiliAuth
} from '../services/auth/bilibiliAuth.js'
import { setWindowEffect, useWindowEffect } from '@/services/theme'
import CustomSelect from '../components/common/CustomSelect.vue'

// 窗口效果选项
const WINDOW_EFFECT_OPTIONS = [
  { value: 'none', label: '无效果' },
  { value: 'mica', label: 'Mica (云母)' }
]

// 窗口效果
const windowEffect = useWindowEffect()

// 切换窗口效果
const onWindowEffectChange = async (effect) => {
  await setWindowEffect(effect)
  toast.success(`窗口效果已切换为 ${WINDOW_EFFECT_OPTIONS.find(o => o.value === effect)?.label || effect}`)
}

// 表单数据
const form = reactive({
  download: {savePath: ''},
  tencentAsr: {secretId: '', secretKey: ''},
  doubao: {apiKey: '', model: 'doubao-seed-1-6-251015'},
  deepseek: {apiKey: '', model: 'deepseek-chat'},
  qianwen: {apiKey: '', model: 'qwen-turbo'},
  hunyuan: {secretId: '', secretKey: ''}
})

// 系统默认下载路径
const defaultDownloadPath = ref('')

// 配置状态
const configStatus = ref({
  tencentAsr: false,
  doubao: false,
  deepseek: false,
  qianwen: false,
  hunyuan: false
})

// B站登录状态
const bilibiliLoginState = reactive({
  isLoggedIn: false,
  qrcode: null,
  qrcodeKey: null,
  status: 'idle', // idle | loading | scanning | confirming | success | expired | error
  statusText: '',
  userInfo: null,
  pollTimer: null,
  loadingUserInfo: false  // 是否正在加载用户信息
})

// 加载配置
const loadForm = async () => {
  const config = loadConfig()
  Object.keys(form).forEach(key => {
    if (config[key]) {
      Object.assign(form[key], config[key])
    }
  })
  configStatus.value = checkConfig()

  // 加载系统默认下载路径
  try {
    defaultDownloadPath.value = await getSystemDownloadDir() || ''
  } catch (e) {
    console.warn('获取默认下载路径失败:', e)
  }

  // 加载B站登录状态
  await loadBilibiliLoginState()
}

// 选择下载目录
const selectDownloadPath = async () => {
  try {
    const selected = await selectDownloadDir()
    if (selected) {
      form.download.savePath = selected
    }
  } catch (e) {
    console.error('选择目录失败:', e)
  }
}

// 重置下载路径为默认
const resetDownloadPath = () => {
  form.download.savePath = ''
}

// 加载B站登录状态
const loadBilibiliLoginState = async () => {
  const auth = loadBilibiliAuth()
  if (auth && auth.cookies?.SESSDATA) {
    bilibiliLoginState.isLoggedIn = true
    bilibiliLoginState.status = 'success'
    bilibiliLoginState.statusText = '已登录'
    bilibiliLoginState.loadingUserInfo = true  // 开始加载用户信息
    try {
      const userInfo = await getUserInfo()
      if (userInfo) {
        bilibiliLoginState.userInfo = userInfo
      }
    } catch (e) {
      console.warn('获取B站用户信息失败:', e)
    } finally {
      bilibiliLoginState.loadingUserInfo = false  // 加载完成
    }
  } else {
    bilibiliLoginState.isLoggedIn = false
    bilibiliLoginState.status = 'idle'
    bilibiliLoginState.statusText = ''
    bilibiliLoginState.userInfo = null
    bilibiliLoginState.loadingUserInfo = false
  }
}

// 开始B站登录
const startBilibiliLogin = async () => {
  try {
    bilibiliLoginState.status = 'loading'
    bilibiliLoginState.statusText = '正在获取二维码...'

    const {url, qrcode_key} = await generateQRCode()
    bilibiliLoginState.qrcode = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(url)}`
    bilibiliLoginState.qrcodeKey = qrcode_key
    bilibiliLoginState.status = 'scanning'
    bilibiliLoginState.statusText = '请使用哔哩哔哩APP扫码'

    startPolling()
  } catch (error) {
    console.error('获取二维码失败:', error)
    bilibiliLoginState.status = 'error'
    bilibiliLoginState.statusText = '获取二维码失败'
  }
}

// 开始轮询登录状态
const startPolling = () => {
  stopPolling()

  bilibiliLoginState.pollTimer = setInterval(async () => {
    try {
      const result = await pollQRCodeStatus(bilibiliLoginState.qrcodeKey)

      switch (result.code) {
        case 0: // 登录成功
          stopPolling()
          bilibiliLoginState.status = 'success'
          bilibiliLoginState.statusText = '登录成功'
          bilibiliLoginState.isLoggedIn = true
          bilibiliLoginState.qrcode = null
          saveBilibiliAuth({cookies: result.cookies})
          try {
            const userInfo = await getUserInfo()
            bilibiliLoginState.userInfo = userInfo
          } catch (e) {
            console.warn('获取用户信息失败:', e)
          }
          toast.success('B站登录成功')
          break
        case 86090: // 已扫码待确认
          bilibiliLoginState.status = 'confirming'
          bilibiliLoginState.statusText = '已扫码，请在手机上确认'
          break
        case 86038: // 二维码已失效
          stopPolling()
          bilibiliLoginState.status = 'expired'
          bilibiliLoginState.statusText = '二维码已过期，请刷新'
          break
        case 86101: // 未扫码
          break
        default:
          break
      }
    } catch (error) {
      console.error('轮询登录状态失败:', error)
    }
  }, 2000)
}

// 停止轮询
const stopPolling = () => {
  if (bilibiliLoginState.pollTimer) {
    clearInterval(bilibiliLoginState.pollTimer)
    bilibiliLoginState.pollTimer = null
  }
}

// 退出b站登录
const logoutBilibili = () => {
  clearBilibiliAuth()
  bilibiliLoginState.isLoggedIn = false
  bilibiliLoginState.status = 'idle'
  bilibiliLoginState.statusText = ''
  bilibiliLoginState.userInfo = null
  bilibiliLoginState.qrcode = null
  toast.success('已退出登录')
}

// 刷新二维码
const refreshQRCode = () => {
  startBilibiliLogin()
}

// 保存配置
const saveForm = () => {
  const success = saveConfig({...form})
  if (success) {
    configStatus.value = checkConfig()
    toast.success('配置已保存')
  }
}

// 重置配置
const resetForm = () => {
  const config = resetConfig()
  Object.keys(form).forEach(key => {
    if (config[key]) {
      Object.assign(form[key], config[key])
    }
  })
  configStatus.value = checkConfig()
  toast.info('配置已重置')
}

// 组件加载时加载配置
onMounted(() => {
  loadForm()
})

// 组件卸载时清理定时器
onUnmounted(() => {
  stopPolling()
})
</script>

<template>
  <div class="settings-page">
    <div class="settings-container">
      <h1 class="page-title">设置</h1>

      <!-- 外观设置 -->
      <div class="settings-section appearance-section">
        <div class="section-header">
          <div class="section-title-row">
            <svg class="section-icon" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 2a10 10 0 0 1 0 20 10 10 0 0 1 0-20"/>
              <path d="M12 2v20"/>
            </svg>
            <h2>外观设置</h2>
          </div>
          <span class="section-desc">窗口效果和视觉风格</span>
        </div>
        <div class="setting-item">
          <div class="setting-info">
            <label class="setting-label">窗口效果</label>
            <p class="setting-desc">Windows 11 原生毛玻璃效果（需要 Win11 22H2+）</p>
          </div>
          <CustomSelect
              v-model="windowEffect"
              :options="WINDOW_EFFECT_OPTIONS"
              class="effect-select"
              @change="onWindowEffectChange"
          />
        </div>
      </div>

      <!-- 下载设置 -->
      <div class="settings-section download-section">
        <div class="section-header">
          <div class="section-title-row">
            <svg class="section-icon" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
            </svg>
            <h2>下载设置</h2>
          </div>
          <span class="section-desc">视频保存位置</span>
        </div>
        <div class="setting-item">
          <div class="setting-info">
            <label class="setting-label">下载目录</label>
            <p class="setting-desc">视频和文件的默认保存位置</p>
          </div>
          <div class="path-input-group">
            <input
                v-model="form.download.savePath"
                :placeholder="defaultDownloadPath || '系统默认下载目录'"
                class="setting-input"
                readonly
                type="text"
            />
            <button class="btn btn-secondary" @click="selectDownloadPath">
              <svg fill="none" height="16" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" width="16">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
              </svg>
              选择
            </button>
            <button
                v-if="form.download.savePath"
                class="btn btn-secondary"
                title="恢复默认"
                @click="resetDownloadPath"
            >
              <svg fill="none" height="16" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" width="16">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                <path d="M3 3v5h5"/>
              </svg>
            </button>
          </div>
        </div>
        <div v-if="!form.download.savePath" class="path-hint">
          当前使用系统默认下载目录
        </div>
      </div>

      <!-- B站登录 -->
      <div class="settings-section bilibili-section">
        <div class="section-header">
          <div class="section-title-row">
            <svg class="section-icon bilibili" fill="currentColor" viewBox="0 0 24 24">
              <path
                  d="M17.813 4.653h.854c1.51.054 2.769.578 3.773 1.574 1.004.995 1.524 2.249 1.56 3.76v7.36c-.036 1.51-.556 2.769-1.56 3.773s-2.262 1.524-3.773 1.56H5.333c-1.51-.036-2.769-.556-3.773-1.56S.036 18.858 0 17.347v-7.36c.036-1.511.556-2.765 1.56-3.76 1.004-.996 2.262-1.52 3.773-1.574h.774l-1.174-1.12a1.234 1.234 0 0 1-.373-.906c0-.356.124-.658.373-.907l.027-.027c.267-.249.573-.373.92-.373.347 0 .653.124.92.373L9.653 4.44c.071.071.134.142.187.213h4.267a.836.836 0 0 1 .16-.213l2.853-2.747c.267-.249.573-.373.92-.373.347 0 .662.151.929.4.267.249.391.551.391.907 0 .355-.124.657-.373.906L17.813 4.653zM5.333 7.24c-.746.018-1.373.276-1.88.773-.506.498-.769 1.13-.786 1.894v7.52c.017.764.28 1.395.786 1.893.507.498 1.134.756 1.88.773h13.334c.746-.017 1.373-.275 1.88-.773.506-.498.769-1.129.786-1.893v-7.52c-.017-.765-.28-1.396-.786-1.894-.507-.497-1.134-.755-1.88-.773H5.333zM8 11.107c.373 0 .684.124.933.373.25.249.383.569.4.96v1.173c-.017.391-.15.711-.4.96-.249.25-.56.374-.933.374s-.684-.125-.933-.374c-.25-.249-.383-.569-.4-.96V12.44c.017-.391.15-.711.4-.96.249-.249.56-.373.933-.373zm8 0c.373 0 .684.124.933.373.25.249.383.569.4.96v1.173c-.017.391-.15.711-.4.96-.249.25-.56.374-.933.374s-.684-.125-.933-.374c-.25-.249-.383-.569-.4-.96V12.44c.017-.391.15-.711.4-.96.249-.249.56-.373.933-.373z"/>
            </svg>
            <h2>哔哩哔哩登录</h2>
          </div>
          <span class="section-desc">登录后可下载高清视频</span>
          <span :class="{ active: bilibiliLoginState.isLoggedIn }" class="status-dot"></span>
        </div>

        <div class="bilibili-login-area">
          <!-- 已登录状态 -->
          <div v-if="bilibiliLoginState.isLoggedIn" class="login-success">
            <!-- 正在加载用户信息 -->
            <div v-if="bilibiliLoginState.loadingUserInfo" class="user-info-loading">
              <div class="loading-spinner"></div>
              <span>加载中...</span>
            </div>
            <!-- 已获取用户信息 -->
            <div v-else-if="bilibiliLoginState.userInfo" class="user-info">
              <img :src="bilibiliLoginState.userInfo.face" alt="avatar" class="user-avatar"/>
              <div class="user-detail">
                <div class="user-name">{{ bilibiliLoginState.userInfo.uname }}</div>
                <div class="user-meta">
                  <span class="user-level">LV{{ bilibiliLoginState.userInfo.level }}</span>
                  <span v-if="bilibiliLoginState.userInfo.vipStatus" class="user-vip">大会员</span>
                </div>
              </div>
            </div>
            <!-- 获取用户信息失败，仅显示已登录 -->
            <div v-else class="login-status-text">✅ 已登录</div>
            <button class="btn btn-danger" @click="logoutBilibili">退出登录</button>
          </div>

          <!-- 未登录状态 -->
          <div v-else class="login-pending">
            <!-- 二维码区域 -->
            <div v-if="bilibiliLoginState.qrcode" class="qrcode-area">
              <img :src="bilibiliLoginState.qrcode" alt="登录二维码" class="qrcode-img"/>
              <div :class="bilibiliLoginState.status" class="qrcode-status">
                {{ bilibiliLoginState.statusText }}
              </div>
              <button v-if="bilibiliLoginState.status === 'expired'"
                      class="btn btn-secondary"
                      @click="refreshQRCode">
                刷新二维码
              </button>
            </div>

            <!-- 未开始登录 -->
            <div v-else class="login-start">
              <div class="login-hint">登录后可解锁 1080P/4K 等高清画质</div>
              <button :disabled="bilibiliLoginState.status === 'loading'" class="btn btn-bilibili"
                      @click="startBilibiliLogin">
                <svg v-if="bilibiliLoginState.status === 'loading'" class="spinner" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" fill="none" opacity="0.3" r="10" stroke="currentColor" stroke-width="3"/>
                  <path d="M12 2a10 10 0 0 1 10 10" fill="none" stroke="currentColor" stroke-width="3"/>
                </svg>
                <span v-else>扫码登录</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 腾讯云 ASR -->
      <div class="settings-section">
        <div class="section-header">
          <div class="section-title-row">
            <svg class="section-icon" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
              <line x1="12" x2="12" y1="19" y2="23"/>
              <line x1="8" x2="16" y1="23" y2="23"/>
            </svg>
            <h2>腾讯云 ASR</h2>
          </div>
          <span class="section-desc">语音识别服务</span>
          <span :class="{ active: configStatus.tencentAsr }" class="status-dot"></span>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>SecretId</label>
            <input v-model="form.tencentAsr.secretId" placeholder="SecretId" type="text"/>
          </div>
          <div class="form-group">
            <label>SecretKey</label>
            <input v-model="form.tencentAsr.secretKey" placeholder="SecretKey" type="text"/>
          </div>
        </div>
      </div>

      <!-- 豆包 -->
      <div class="settings-section">
        <div class="section-header">
          <div class="section-title-row">
            <svg class="section-icon" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <h2>豆包</h2>
          </div>
          <span class="section-desc">AI文案改写</span>
          <span :class="{ active: configStatus.doubao }" class="status-dot"></span>
        </div>
        <div class="form-row">
          <div class="form-group flex-2">
            <label>API Key</label>
            <input v-model="form.doubao.apiKey" placeholder="API Key" type="text"/>
          </div>
          <div class="form-group flex-1">
            <label>模型</label>
            <input v-model="form.doubao.model" placeholder="模型ID" type="text"/>
          </div>
        </div>
      </div>

      <!-- DeepSeek -->
      <div class="settings-section">
        <div class="section-header">
          <div class="section-title-row">
            <svg class="section-icon" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 16v-4"/>
              <path d="M12 8h.01"/>
            </svg>
            <h2>DeepSeek</h2>
          </div>
          <span class="section-desc">AI文案改写</span>
          <span :class="{ active: configStatus.deepseek }" class="status-dot"></span>
        </div>
        <div class="form-row">
          <div class="form-group flex-2">
            <label>API Key</label>
            <input v-model="form.deepseek.apiKey" placeholder="API Key" type="text"/>
          </div>
          <div class="form-group flex-1">
            <label>模型</label>
            <input v-model="form.deepseek.model" placeholder="模型ID" type="text"/>
          </div>
        </div>
      </div>

      <!-- 通义千问 -->
      <div class="settings-section">
        <div class="section-header">
          <div class="section-title-row">
            <svg class="section-icon" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/>
              <path d="M2 17l10 5 10-5"/>
              <path d="M2 12l10 5 10-5"/>
            </svg>
            <h2>通义千问</h2>
          </div>
          <span class="section-desc">AI文案改写</span>
          <span :class="{ active: configStatus.qianwen }" class="status-dot"></span>
        </div>
        <div class="form-row">
          <div class="form-group flex-2">
            <label>API Key</label>
            <input v-model="form.qianwen.apiKey" placeholder="API Key" type="text"/>
          </div>
          <div class="form-group flex-1">
            <label>模型</label>
            <input v-model="form.qianwen.model" placeholder="模型ID" type="text"/>
          </div>
        </div>
      </div>

      <!-- 腾讯元宝 -->
      <div class="settings-section">
        <div class="section-header">
          <div class="section-title-row">
            <svg class="section-icon" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z"/>
              <path d="M12 6v6l4 2"/>
            </svg>
            <h2>腾讯元宝</h2>
          </div>
          <span class="section-desc">AI文案改写</span>
          <span :class="{ active: configStatus.hunyuan }" class="status-dot"></span>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>SecretId</label>
            <input v-model="form.hunyuan.secretId" placeholder="SecretId" type="text"/>
          </div>
          <div class="form-group">
            <label>SecretKey</label>
            <input v-model="form.hunyuan.secretKey" placeholder="SecretKey" type="text"/>
          </div>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="settings-actions">
        <button class="btn btn-secondary" @click="resetForm">重置配置</button>
        <button class="btn btn-primary" @click="saveForm">保存配置</button>
      </div>

      <!-- 关于 -->
      <div class="about-section">
        <p class="about-text">文案助手 v0.1.0</p>
        <p class="about-text">支持多平台视频解析与下载</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.settings-page {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  background: var(--bg-primary, #1e1f22);
}

.settings-container {
  max-width: 800px;
  margin: 0 auto;
}

.page-title {
  font-size: 24px;
  font-weight: 600;
  color: var(--text-primary, #ffffff);
  margin-bottom: 24px;
}

/* 通用区块样式 */
.settings-section {
  margin-bottom: 20px;
  padding: 20px;
  background: var(--bg-secondary, #2b2d30);
  border-radius: 8px;
  border: 1px solid var(--border-primary, #3d3f43);
}

.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.section-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-title-row h2 {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary, #ffffff);
  margin: 0;
}

.section-icon {
  width: 20px;
  height: 20px;
  color: var(--accent-color, #4a9eff);
}

.section-icon.bilibili {
  color: #fb7299;
}

.section-desc {
  font-size: 12px;
  color: var(--text-tertiary, #6c6e73);
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--bg-tertiary, #3d3f43);
  margin-left: auto;
}

.status-dot.active {
  background: #10b981;
  box-shadow: 0 0 8px rgba(16, 185, 129, 0.5);
}

/* 设置项 */
.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  gap: 16px;
}

.setting-info {
  flex: 1;
}

.setting-label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary, #ffffff);
  margin-bottom: 4px;
}

.setting-desc {
  font-size: 12px;
  color: var(--text-tertiary, #6c6e73);
  margin: 0;
}

/* 表单 */
.form-row {
  display: flex;
  gap: 12px;
}

.form-group {
  flex: 1;
  margin-bottom: 8px;
}

.form-group.flex-2 {
  flex: 2;
}

.form-group.flex-1 {
  flex: 1;
}

.form-group label {
  display: block;
  font-size: 12px;
  color: var(--text-tertiary, #6c6e73);
  margin-bottom: 6px;
}

.form-group input {
  width: 100%;
  padding: 10px 12px;
  background: var(--bg-primary, #1e1f22);
  border: 1px solid var(--border-primary, #3d3f43);
  border-radius: 6px;
  color: var(--text-primary, #ffffff);
  font-size: 14px;
  outline: none;
  transition: all 0.2s;
}

.form-group input:focus {
  border-color: var(--accent-color, #4a9eff);
  box-shadow: 0 0 0 2px var(--accent-light, rgba(74, 158, 255, 0.1));
}

.form-group input::placeholder {
  color: var(--text-tertiary, #6c6e73);
}

/* 路径输入 */
.path-input-group {
  display: flex;
  gap: 8px;
  min-width: 300px;
}

.path-input-group .setting-input {
  flex: 1;
  min-width: 0;
  padding: 10px 12px;
  background: var(--bg-primary, #1e1f22);
  border: 1px solid var(--border-primary, #3d3f43);
  border-radius: 6px;
  color: var(--text-primary, #ffffff);
  font-size: 14px;
  cursor: default;
}

.path-hint {
  font-size: 12px;
  color: var(--text-tertiary, #6c6e73);
  margin-top: 8px;
}

/* 按钮 */
.btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.btn-secondary {
  background: var(--bg-tertiary, #3d3f43);
  color: var(--text-primary, #ffffff);
}

.btn-secondary:hover {
  background: var(--bg-hover, #4a4c50);
}

.btn-primary {
  background: var(--accent-color, #4a9eff);
  color: #ffffff;
}

.btn-primary:hover {
  background: var(--accent-hover, #3d8fe8);
  box-shadow: 0 2px 8px rgba(74, 158, 255, 0.3);
}

.btn-danger {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
  border: 1px solid rgba(239, 68, 68, 0.3);
}

.btn-danger:hover {
  background: rgba(239, 68, 68, 0.25);
}

.btn-bilibili {
  background: linear-gradient(135deg, #fb7299 0%, #f45a8d 100%);
  color: white;
  padding: 10px 24px;
}

.btn-bilibili:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(251, 114, 153, 0.4);
}

.btn-bilibili:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

/* 下载设置特殊样式 */
.download-section {
  background: linear-gradient(135deg, rgba(74, 158, 255, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%);
  border-color: rgba(74, 158, 255, 0.2);
}

/* 外观设置特殊样式 */
.appearance-section {
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.05) 0%, rgba(6, 182, 212, 0.05) 100%);
  border-color: rgba(139, 92, 246, 0.2);
}

.effect-select {
  width: 180px;
}

/* B站登录特殊样式 */
.bilibili-section {
  background: linear-gradient(135deg, rgba(251, 114, 153, 0.05) 0%, rgba(0, 161, 214, 0.05) 100%);
  border-color: rgba(251, 114, 153, 0.2);
}

.bilibili-login-area {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.login-success {
  display: flex;
  align-items: center;
  gap: 16px;
  width: 100%;
  min-height: 48px;  /* 固定最小高度，防止状态切换时抖动 */
}

.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.user-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: 2px solid rgba(251, 114, 153, 0.3);
}

.user-detail {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.user-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary, #ffffff);
}

.user-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.user-level {
  font-size: 11px;
  padding: 2px 6px;
  background: rgba(251, 114, 153, 0.2);
  border-radius: 4px;
  color: #fb7299;
}

.user-vip {
  font-size: 11px;
  padding: 2px 6px;
  background: linear-gradient(135deg, #fb7299 0%, #f45a8d 100%);
  border-radius: 4px;
  color: white;
}

.login-status-text {
  flex: 1;
  font-size: 14px;
  color: #10b981;
}

.user-info-loading {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  font-size: 14px;
  color: var(--text-tertiary, #6c6e73);
  height: 48px;  /* 与用户头像高度一致 */
}

.loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid var(--border-primary, #3d3f43);
  border-top-color: #fb7299;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.login-pending {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
}

.qrcode-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.qrcode-img {
  width: 160px;
  height: 160px;
  border-radius: 8px;
  background: white;
  padding: 8px;
}

.qrcode-status {
  font-size: 13px;
  color: var(--text-secondary, #afb1b3);
}

.qrcode-status.scanning {
  color: #00a1d6;
}

.qrcode-status.confirming {
  color: #fb7299;
}

.qrcode-status.expired {
  color: #ef4444;
}

.qrcode-status.error {
  color: #ef4444;
}

.login-start {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.login-hint {
  font-size: 13px;
  color: var(--text-tertiary, #6c6e73);
}

.spinner {
  width: 20px;
  height: 20px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* 操作按钮区 */
.settings-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid var(--border-primary, #3d3f43);
}

/* 关于 */
.about-section {
  margin-top: 32px;
  padding-top: 20px;
  border-top: 1px solid var(--border-primary, #3d3f43);
  text-align: center;
}

.about-text {
  font-size: 12px;
  color: var(--text-tertiary, #6c6e73);
  margin: 4px 0;
}

/* 滚动条 */
.settings-page::-webkit-scrollbar {
  width: 6px;
}

.settings-page::-webkit-scrollbar-track {
  background: transparent;
}

.settings-page::-webkit-scrollbar-thumb {
  background: var(--bg-tertiary, #3d3f43);
  border-radius: 3px;
}

.settings-page::-webkit-scrollbar-thumb:hover {
  background: var(--bg-hover, #4a4c50);
}
</style>

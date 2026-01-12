<script setup>
import {reactive, onMounted, onUnmounted} from 'vue'
import {toast} from 'vue-sonner'
import {
  generateQRCode,
  pollQRCodeStatus,
  getUserInfo,
  saveBilibiliAuth,
  loadBilibiliAuth,
  loadBilibiliAuthSync,
  clearBilibiliAuth
} from '@/services/auth/bilibiliAuth.js'
import {
  loadXhsAuth,
  loadXhsAuthSync,
  clearXhsAuth,
  performLogin as performXhsLogin
} from '@/services/auth/xiaohongshuAuth.js'

// 同步初始化 B 站登录状态（避免闪烁）
const initBilibiliState = () => {
  const auth = loadBilibiliAuthSync()
  if (auth && auth.cookies?.SESSDATA) {
    return {
      isLoggedIn: true,
      status: 'success',
      statusText: '已登录',
      userInfo: auth.userInfo || null,
      loadingUserInfo: false
    }
  }
  return {
    isLoggedIn: false,
    status: 'idle',
    statusText: '',
    userInfo: null,
    loadingUserInfo: false
  }
}

// 同步初始化小红书登录状态（避免闪烁）
const initXhsState = () => {
  const auth = loadXhsAuthSync()
  if (auth && auth.cookie) {
    return {
      isLoggedIn: true,
      status: 'success',
      statusText: '已登录',
      cookiePreview: auth.cookie.length > 30 ? auth.cookie.substring(0, 30) + '...' : auth.cookie
    }
  }
  return {
    isLoggedIn: false,
    status: 'idle',
    statusText: '',
    cookiePreview: ''
  }
}

// B站登录状态（同步初始化）
const bilibiliInitState = initBilibiliState()
const bilibiliLoginState = reactive({
  ...bilibiliInitState,
  qrcode: null,
  qrcodeKey: null,
  pollTimer: null
})

// 小红书登录状态（同步初始化）
const xhsInitState = initXhsState()
const xhsLoginState = reactive({
  ...xhsInitState
})

// 加载B站登录状态
const loadBilibiliLoginState = async () => {
  const auth = await loadBilibiliAuth()
  if (auth && auth.cookies?.SESSDATA) {
    bilibiliLoginState.isLoggedIn = true
    bilibiliLoginState.status = 'success'
    bilibiliLoginState.statusText = '已登录'
    
    // 1. 先显示缓存的用户信息（立即显示，无加载延迟）
    if (auth.userInfo) {
      bilibiliLoginState.userInfo = auth.userInfo
      bilibiliLoginState.loadingUserInfo = false
    } else {
      bilibiliLoginState.loadingUserInfo = true
    }
    
    // 2. 后台静默刷新用户信息
    getUserInfo().then(userInfo => {
      if (userInfo) {
        bilibiliLoginState.userInfo = userInfo
        // 更新缓存（包含用户信息）
        saveBilibiliAuth({ cookies: auth.cookies, userInfo })
      }
    }).catch(e => {
      console.warn('获取B站用户信息失败:', e)
    }).finally(() => {
      bilibiliLoginState.loadingUserInfo = false
    })
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
          // 先保存 cookies，然后获取用户信息并一起更新
          try {
            const userInfo = await getUserInfo()
            bilibiliLoginState.userInfo = userInfo
            // 保存登录信息（包含用户信息）
            await saveBilibiliAuth({ cookies: result.cookies, userInfo })
          } catch (e) {
            console.warn('获取用户信息失败:', e)
            // 仍然保存 cookies
            await saveBilibiliAuth({ cookies: result.cookies })
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
const logoutBilibili = async () => {
  await clearBilibiliAuth()
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

// 加载小红书登录状态
const loadXhsLoginState = async () => {
  const auth = await loadXhsAuth()
  if (auth && auth.cookie) {
    xhsLoginState.isLoggedIn = true
    xhsLoginState.status = 'success'
    xhsLoginState.statusText = '已登录'
    // 显示 Cookie 预览（截取前30字符）
    xhsLoginState.cookiePreview = auth.cookie.length > 30 
      ? auth.cookie.substring(0, 30) + '...' 
      : auth.cookie
  } else {
    xhsLoginState.isLoggedIn = false
    xhsLoginState.status = 'idle'
    xhsLoginState.statusText = ''
    xhsLoginState.cookiePreview = ''
  }
}

// 开始小红书登录
const startXhsLogin = async () => {
  try {
    xhsLoginState.status = 'loading'
    xhsLoginState.statusText = '正在打开登录窗口...'
    
    const result = await performXhsLogin()
    
    if (result.success) {
      xhsLoginState.isLoggedIn = true
      xhsLoginState.status = 'success'
      xhsLoginState.statusText = '登录成功'
      toast.success('小红书登录成功')
      // 重新加载状态以获取 Cookie 预览
      await loadXhsLoginState()
    } else {
      xhsLoginState.status = 'error'
      xhsLoginState.statusText = result.message
      toast.error(result.message || '登录失败')
    }
  } catch (error) {
    console.error('小红书登录失败:', error)
    xhsLoginState.status = 'error'
    xhsLoginState.statusText = '登录失败'
    toast.error('登录失败: ' + error.toString())
  }
}

// 退出小红书登录
const logoutXhs = async () => {
  await clearXhsAuth()
  xhsLoginState.isLoggedIn = false
  xhsLoginState.status = 'idle'
  xhsLoginState.statusText = ''
  xhsLoginState.cookiePreview = ''
  toast.success('已退出小红书登录')
}

onMounted(() => {
  loadBilibiliLoginState()
  loadXhsLoginState()
})

onUnmounted(() => {
  stopPolling()
})
</script>

<template>
  <div class="settings-panel">
    <div class="account-card bilibili">
      <div class="account-header">
        <svg class="account-icon" fill="currentColor" viewBox="0 0 24 24">
          <path
              d="M17.813 4.653h.854c1.51.054 2.769.578 3.773 1.574 1.004.995 1.524 2.249 1.56 3.76v7.36c-.036 1.51-.556 2.769-1.56 3.773s-2.262 1.524-3.773 1.56H5.333c-1.51-.036-2.769-.556-3.773-1.56S.036 18.858 0 17.347v-7.36c.036-1.511.556-2.765 1.56-3.76 1.004-.996 2.262-1.52 3.773-1.574h.774l-1.174-1.12a1.234 1.234 0 0 1-.373-.906c0-.356.124-.658.373-.907l.027-.027c.267-.249.573-.373.92-.373.347 0 .653.124.92.373L9.653 4.44c.071.071.134.142.187.213h4.267a.836.836 0 0 1 .16-.213l2.853-2.747c.267-.249.573-.373.92-.373.347 0 .662.151.929.4.267.249.391.551.391.907 0 .355-.124.657-.373.906L17.813 4.653zM5.333 7.24c-.746.018-1.373.276-1.88.773-.506.498-.769 1.13-.786 1.894v7.52c.017.764.28 1.395.786 1.893.507.498 1.134.756 1.88.773h13.334c.746-.017 1.373-.275 1.88-.773.506-.498.769-1.129.786-1.893v-7.52c-.017-.765-.28-1.396-.786-1.894-.507-.497-1.134-.755-1.88-.773H5.333zM8 11.107c.373 0 .684.124.933.373.25.249.383.569.4.96v1.173c-.017.391-.15.711-.4.96-.249.25-.56.374-.933.374s-.684-.125-.933-.374c-.25-.249-.383-.569-.4-.96V12.44c.017-.391.15-.711.4-.96.249-.249.56-.373.933-.373zm8 0c.373 0 .684.124.933.373.25.249.383.569.4.96v1.173c-.017.391-.15.711-.4.96-.249.25-.56.374-.933.374s-.684-.125-.933-.374c-.25-.249-.383-.569-.4-.96V12.44c.017-.391.15-.711.4-.96.249-.249.56-.373.933-.373z"/>
        </svg>
        <span class="account-name">哔哩哔哩</span>
        <span :class="['status-badge', { active: bilibiliLoginState.isLoggedIn }]">
          {{ bilibiliLoginState.isLoggedIn ? '已登录' : '未登录' }}
        </span>
      </div>
      <p class="account-desc">登录后可下载 1080P/4K 等高清视频</p>
      <div class="account-content">
        <template v-if="bilibiliLoginState.isLoggedIn">
          <div v-if="bilibiliLoginState.loadingUserInfo" class="user-loading">
            <div class="loading-spinner"></div>
            <span>加载中...</span>
          </div>
          <div v-else-if="bilibiliLoginState.userInfo" class="user-info">
            <img :src="bilibiliLoginState.userInfo.face" alt="avatar" class="user-avatar"/>
            <div class="user-detail">
              <div class="user-name">{{ bilibiliLoginState.userInfo.uname }}</div>
              <div class="user-tags">
                <span class="tag level">LV{{ bilibiliLoginState.userInfo.level }}</span>
                <span v-if="bilibiliLoginState.userInfo.vipStatus" class="tag vip">大会员</span>
              </div>
            </div>
          </div>
          <button class="btn btn-outline-danger" @click="logoutBilibili">退出登录</button>
        </template>
        <template v-else>
          <div v-if="bilibiliLoginState.qrcode" class="qrcode-box">
            <img :src="bilibiliLoginState.qrcode" alt="二维码" class="qrcode-img"/>
            <p :class="['qrcode-tip', bilibiliLoginState.status]">{{ bilibiliLoginState.statusText }}</p>
            <button v-if="bilibiliLoginState.status === 'expired'" class="btn btn-text" @click="refreshQRCode">
              刷新二维码
            </button>
          </div>
          <button v-else :disabled="bilibiliLoginState.status === 'loading'" class="btn btn-bilibili"
                  @click="startBilibiliLogin">
            <svg v-if="bilibiliLoginState.status === 'loading'" class="spin" height="18" viewBox="0 0 24 24" width="18">
              <circle cx="12" cy="12" fill="none" opacity="0.3" r="10" stroke="currentColor" stroke-width="3"/>
              <path d="M12 2a10 10 0 0 1 10 10" fill="none" stroke="currentColor" stroke-width="3"/>
            </svg>
            <span v-else>扫码登录</span>
          </button>
        </template>
      </div>
    </div>

    <!-- 小红书登录卡片 -->
    <div class="account-card xiaohongshu">
      <div class="account-header">
        <svg class="account-icon xhs" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h-2v-2h2v2zm0-4h-2V7h2v6zm4 4h-2v-2h2v2zm0-4h-2V7h2v6z"/>
        </svg>
        <span class="account-name">小红书</span>
        <span :class="['status-badge', { active: xhsLoginState.isLoggedIn }]">
          {{ xhsLoginState.isLoggedIn ? '已登录' : '未登录' }}
        </span>
      </div>
      <p class="account-desc">登录后可解析小红书视频/图文笔记</p>
      <div class="account-content">
        <template v-if="xhsLoginState.isLoggedIn">
          <div class="user-info">
            <div class="xhs-cookie-info">
              <span class="cookie-label">Cookie 已配置</span>
              <span class="cookie-preview">{{ xhsLoginState.cookiePreview }}</span>
            </div>
          </div>
          <button class="btn btn-outline-danger" @click="logoutXhs">退出登录</button>
        </template>
        <template v-else>
          <div v-if="xhsLoginState.status === 'loading'" class="login-loading">
            <div class="loading-spinner xhs"></div>
            <span>{{ xhsLoginState.statusText }}</span>
          </div>
          <button v-else :disabled="xhsLoginState.status === 'loading'" class="btn btn-xhs"
                  @click="startXhsLogin">
            <span>打开登录窗口</span>
          </button>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>

/* 账号卡片 */
.account-card {
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 20px;
  border: 1px solid var(--border-primary);
}

.account-card.bilibili {
  background: linear-gradient(135deg, rgba(251, 114, 153, 0.08) 0%, rgba(0, 161, 214, 0.08) 100%);
  border-color: rgba(251, 114, 153, 0.2);
}

.account-card.xiaohongshu {
  background: linear-gradient(135deg, rgba(255, 45, 85, 0.08) 0%, rgba(255, 100, 100, 0.08) 100%);
  border-color: rgba(255, 45, 85, 0.2);
  margin-top: 16px;
}

.account-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.account-icon {
  width: 24px;
  height: 24px;
  color: #fb7299;
}

.account-icon.xhs {
  color: #ff2d55;
}

.account-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.status-badge {
  margin-left: auto;
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 12px;
  background: var(--bg-tertiary);
  color: var(--text-tertiary);
}

.status-badge.active {
  background: rgba(16, 185, 129, 0.15);
  color: #10b981;
}

.account-desc {
  font-size: 13px;
  color: var(--text-tertiary);
  margin: 0 0 16px 0;
}

.account-content {
  display: flex;
  align-items: center;
  gap: 16px;
  min-height: 48px;
}

/* 用户信息 */
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
  color: var(--text-primary);
}

.user-tags {
  display: flex;
  gap: 6px;
}

.tag {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
}

.tag.level {
  background: rgba(251, 114, 153, 0.2);
  color: #fb7299;
}

.tag.vip {
  background: linear-gradient(135deg, #fb7299 0%, #f45a8d 100%);
  color: white;
}

.user-loading {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  color: var(--text-tertiary);
  font-size: 13px;
}

.loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid var(--border-primary);
  border-top-color: #fb7299;
  border-radius: 50%;
  animation: spin var(--animation-draw-circle, 800ms) linear infinite;
}

/* 二维码 */
.qrcode-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.qrcode-img {
  width: 140px;
  height: 140px;
  border-radius: 8px;
  background: white;
  padding: 8px;
}

.qrcode-tip {
  font-size: 13px;
  color: var(--text-tertiary);
  margin: 0;
}

.qrcode-tip.scanning {
  color: #00a1d6;
}

.qrcode-tip.confirming {
  color: #fb7299;
}

.qrcode-tip.expired {
  color: #ef4444;
}

/* 按钮 */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast, 200ms) var(--easing-ease, ease);
}

.btn-outline-danger {
  background: transparent;
  color: #ef4444;
  border: 1px solid rgba(239, 68, 68, 0.3);
}

.btn-outline-danger:hover {
  background: rgba(239, 68, 68, 0.1);
}

.btn-bilibili {
  background: linear-gradient(135deg, #fb7299 0%, #f45a8d 100%);
  color: white;
  padding: 10px 24px;
}

.btn-bilibili:hover:not(:disabled) {
  box-shadow: 0 4px 12px rgba(251, 114, 153, 0.4);
}

.btn-bilibili:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-text {
  background: transparent;
  color: var(--accent-color);
  padding: 4px 8px;
}

.btn-text:hover {
  text-decoration: underline;
}

.btn-xhs {
  background: linear-gradient(135deg, #ff2d55 0%, #ff6464 100%);
  color: white;
  padding: 10px 24px;
}

.btn-xhs:hover:not(:disabled) {
  box-shadow: 0 4px 12px rgba(255, 45, 85, 0.4);
}

.btn-xhs:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 小红书 Cookie 信息 */
.xhs-cookie-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.cookie-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.cookie-preview {
  font-size: 12px;
  color: var(--text-tertiary);
  font-family: monospace;
}

.login-loading {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  color: var(--text-tertiary);
  font-size: 13px;
}

.loading-spinner.xhs {
  border-top-color: #ff2d55;
}

/* 动画 */
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.spin {
  animation: spin var(--animation-spin, 1000ms) linear infinite;
}
</style>

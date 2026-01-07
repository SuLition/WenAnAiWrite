<script setup>
import { reactive, onMounted, onUnmounted } from 'vue'
import { toast } from 'vue-sonner'
import {
  generateQRCode,
  pollQRCodeStatus,
  getUserInfo,
  saveBilibiliAuth,
  loadBilibiliAuth,
  clearBilibiliAuth
} from '@/services/auth/bilibiliAuth.js'

// B站登录状态
const bilibiliLoginState = reactive({
  isLoggedIn: false,
  qrcode: null,
  qrcodeKey: null,
  status: 'idle', // idle | loading | scanning | confirming | success | expired | error
  statusText: '',
  userInfo: null,
  pollTimer: null,
  loadingUserInfo: false
})

// 加载B站登录状态
const loadBilibiliLoginState = async () => {
  const auth = await loadBilibiliAuth()
  if (auth && auth.cookies?.SESSDATA) {
    bilibiliLoginState.isLoggedIn = true
    bilibiliLoginState.status = 'success'
    bilibiliLoginState.statusText = '已登录'
    bilibiliLoginState.loadingUserInfo = true
    try {
      const userInfo = await getUserInfo()
      if (userInfo) {
        bilibiliLoginState.userInfo = userInfo
      }
    } catch (e) {
      console.warn('获取B站用户信息失败:', e)
    } finally {
      bilibiliLoginState.loadingUserInfo = false
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

    const { url, qrcode_key } = await generateQRCode()
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
          saveBilibiliAuth({ cookies: result.cookies }).then(() => {
            // 保存完成后获取用户信息
          })
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

onMounted(() => {
  loadBilibiliLoginState()
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
  </div>
</template>

<style scoped>
.settings-panel {
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 账号卡片 */
.account-card {
  background: var(--bg-secondary, #2b2d30);
  border-radius: 12px;
  padding: 20px;
  border: 1px solid var(--border-primary, #3d3f43);
}

.account-card.bilibili {
  background: linear-gradient(135deg, rgba(251, 114, 153, 0.08) 0%, rgba(0, 161, 214, 0.08) 100%);
  border-color: rgba(251, 114, 153, 0.2);
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

.account-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary, #ffffff);
}

.status-badge {
  margin-left: auto;
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 12px;
  background: var(--bg-tertiary, #3d3f43);
  color: var(--text-tertiary, #6c6e73);
}

.status-badge.active {
  background: rgba(16, 185, 129, 0.15);
  color: #10b981;
}

.account-desc {
  font-size: 13px;
  color: var(--text-tertiary, #6c6e73);
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
  color: var(--text-primary, #ffffff);
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
  color: var(--text-tertiary, #6c6e73);
  font-size: 13px;
}

.loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid var(--border-primary, #3d3f43);
  border-top-color: #fb7299;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
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
  color: var(--text-tertiary, #6c6e73);
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
  transition: all 0.2s;
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
  color: var(--accent-color, #4a9eff);
  padding: 4px 8px;
}

.btn-text:hover {
  text-decoration: underline;
}

/* 动画 */
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.spin {
  animation: spin 1s linear infinite;
}
</style>

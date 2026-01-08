<script setup>
import { ref, reactive, onMounted } from 'vue'
import { toast } from 'vue-sonner'
import { useConfigStore } from '@/stores'
import { selectDownloadDir, getSystemDownloadDir } from '@/services/download/tauriDownload.js'
import { clearHistory } from '@/services/storage'
import { clearParseHistory as clearParseHistoryStorage } from '@/services/storage/parseHistoryStorage'
import { clearBilibiliAuth } from '@/services/auth/bilibiliAuth'
import { removeFile, FILE_NAMES } from '@/services/storage/fileStorage'
import { stat } from '@tauri-apps/plugin-fs'
import { appDataDir } from '@tauri-apps/api/path'
import { invoke } from '@tauri-apps/api/core'

// Stores
const configStore = useConfigStore()

// 系统默认下载路径
const defaultDownloadPath = ref('')

// 表单数据
const form = reactive({
  download: { savePath: '' },
  history: { maxRecords: 100 }
})

// 缓存大小
const cacheSize = reactive({
  downloadHistory: '0 B',
  bilibiliAuth: '0 B',
  appConfig: '0 B',
  parseHistory: '0 B'
})

// 格式化字节大小
const formatBytes = (bytes) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 获取文件大小
const getFileSize = async (filename) => {
  try {
    const dir = await appDataDir()
    // 确保路径分隔符正确
    const separator = dir.endsWith('\\') || dir.endsWith('/') ? '' : '\\'
    const fullPath = `${dir}${separator}${filename}`
    const fileStat = await stat(fullPath)
    return fileStat.size
  } catch (e) {
    console.error(`获取文件大小失败 ${filename}:`, e)
    return 0
  }
}

// 加载缓存大小
const loadCacheSize = async () => {
  const [downloadSize, bilibiliSize, configSize, parseSize] = await Promise.all([
    getFileSize(FILE_NAMES.DOWNLOAD_HISTORY),
    getFileSize(FILE_NAMES.BILIBILI_AUTH),
    getFileSize(FILE_NAMES.CONFIG),
    getFileSize(FILE_NAMES.PARSE_HISTORY)
  ])
  
  cacheSize.downloadHistory = formatBytes(downloadSize)
  cacheSize.bilibiliAuth = formatBytes(bilibiliSize)
  cacheSize.appConfig = formatBytes(configSize)
  cacheSize.parseHistory = formatBytes(parseSize)
}

// 清除下载历史
const clearDownloadHistory = async () => {
  await clearHistory()
  await loadCacheSize()
  toast.success('下载历史已清除')
}

// 清除B站登录信息
const clearBiliAuth = async () => {
  await clearBilibiliAuth()
  await loadCacheSize()
  toast.success('B站登录信息已清除')
}

// 重置应用配置
const resetAppConfig = async () => {
  await configStore.reset()
  await loadCacheSize()
  toast.success('应用配置已重置')
}

// 清除解析历史
const clearParseHistory = async () => {
  await clearParseHistoryStorage()
  await loadCacheSize()
  toast.success('解析历史已清除')
}

// 打开缓存目录
const openCacheDir = async () => {
  try {
    const dir = await appDataDir()
    await invoke('open_folder', { path: dir })
  } catch (e) {
    console.error('打开目录失败:', e)
    toast.error('打开目录失败')
  }
}

// 选择下载目录
const selectDownloadPath = async () => {
  try {
    const selected = await selectDownloadDir()
    if (selected) {
      form.download.savePath = selected
      // 通过 store 保存
      configStore.update('download.savePath', selected)
    }
  } catch (e) {
    console.error('选择目录失败:', e)
  }
}

// 重置下载路径为默认
const resetDownloadPath = () => {
  form.download.savePath = ''
  // 通过 store 保存
  configStore.update('download.savePath', '')
}

// 修改历史记录最大数量
const onMaxRecordsChange = () => {
  configStore.update('history.maxRecords', form.history.maxRecords)
  toast.success('已保存')
}

// 加载配置
const loadForm = async () => {
  // 从 store 获取配置
  if (configStore.download) {
    Object.assign(form.download, configStore.download)
  }
  if (configStore.history) {
    Object.assign(form.history, configStore.history)
  }

  // 加载系统默认下载路径
  try {
    defaultDownloadPath.value = await getSystemDownloadDir() || ''
  } catch (e) {
    console.warn('获取默认下载路径失败:', e)
  }

  // 加载缓存大小
  await loadCacheSize()
}

onMounted(() => {
  loadForm()
})
</script>

<template>
  <div class="settings-panel">
    <!-- 下载目录 -->
    <div class="setting-group">
      <div class="setting-item">
        <div class="setting-row">
          <svg class="setting-icon" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
          </svg>
          <span class="setting-label">下载目录</span>
        </div>
        <div class="path-group">
          <input v-model="form.download.savePath" :placeholder="defaultDownloadPath || '系统默认下载目录'"
                 class="path-input" readonly type="text"/>
          <button class="btn-icon" title="选择目录" @click="selectDownloadPath">
            <svg fill="none" height="18" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" width="18">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
            </svg>
          </button>
          <button v-if="form.download.savePath" class="btn-icon" title="恢复默认" @click="resetDownloadPath">
            <svg fill="none" height="18" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" width="18">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
              <path d="M3 3v5h5"/>
            </svg>
          </button>
        </div>
      </div>
      <p class="setting-hint">{{ form.download.savePath || '当前使用系统默认下载目录' }}</p>
    </div>

    <!-- 历史记录最大数量 -->
    <div class="setting-group">
      <div class="setting-item">
        <div class="setting-row">
          <svg class="setting-icon" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <span class="setting-label">历史记录数量</span>
        </div>
        <div class="number-input-group">
          <input v-model.number="form.history.maxRecords" 
                 type="number" 
                 min="10" 
                 max="500" 
                 class="number-input"
                 @change="onMaxRecordsChange" />
          <span class="number-unit">条</span>
        </div>
      </div>
      <p class="setting-hint">最多保存的解析历史记录数量（10-500）</p>
    </div>

    <!-- 缓存清理 -->
    <div class="cache-section">
      <div class="section-header">
        <div class="section-header-left">
          <svg class="section-icon" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7"/>
            <ellipse cx="12" cy="7" rx="8" ry="4"/>
            <path d="M4 12c0 2.21 3.582 4 8 4s8-1.79 8-4"/>
          </svg>
          <span class="section-title">缓存</span>
        </div>
        <button class="btn-open-dir" @click="openCacheDir">
          <svg fill="none" height="14" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" width="14">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
          </svg>
          打开目录
        </button>
      </div>
      <p class="section-desc">数据库存储配置、登录信息、下载记录等数据。</p>

      <div class="cache-list">
        <!-- 下载历史 -->
        <div class="cache-item">
          <span class="cache-name">下载历史</span>
          <div class="cache-control">
            <input class="cache-input" :value="cacheSize.downloadHistory" readonly />
            <button class="cache-clear-btn" title="清除" @click="clearDownloadHistory">
              <svg fill="none" height="16" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" width="16">
                <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- B站登录信息 -->
        <div class="cache-item">
          <span class="cache-name">B站登录</span>
          <div class="cache-control">
            <input class="cache-input" :value="cacheSize.bilibiliAuth" readonly />
            <button class="cache-clear-btn" title="清除" @click="clearBiliAuth">
              <svg fill="none" height="16" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" width="16">
                <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- 解析历史 -->
        <div class="cache-item">
          <span class="cache-name">解析历史</span>
          <div class="cache-control">
            <input class="cache-input" :value="cacheSize.parseHistory" readonly />
            <button class="cache-clear-btn" title="清除" @click="clearParseHistory">
              <svg fill="none" height="16" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" width="16">
                <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- 应用配置 -->
        <div class="cache-item">
          <span class="cache-name">应用配置</span>
          <div class="cache-control">
            <input class="cache-input" :value="cacheSize.appConfig" readonly />
            <button class="cache-clear-btn" title="重置" @click="resetAppConfig">
              <svg fill="none" height="16" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" width="16">
                <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
              </svg>
            </button>
          </div>
        </div>
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

.setting-group {
  padding-bottom: 16px;
  margin-bottom: 16px;
  border-bottom: 1px solid var(--border-primary);
}

.setting-group:last-child {
  border-bottom: none;
  margin-bottom: 0;
  padding-bottom: 0;
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.setting-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.setting-icon {
  width: 20px;
  height: 20px;
  color: var(--text-tertiary);
}

.setting-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.setting-hint {
  font-size: 12px;
  color: var(--text-tertiary);
  margin: 8px 0 0 32px;
}

/* 路径输入 */
.path-group {
  display: flex;
  gap: 8px;
  align-items: center;
}

.path-input {
  width: 280px;
  padding: 8px 12px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: 6px;
  color: var(--text-primary);
  font-size: 13px;
}

.btn-icon {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-tertiary);
  border: none;
  border-radius: 6px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}

.btn-icon:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

/* 数字输入框 */
.number-input-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.number-input {
  width: 80px;
  padding: 8px 12px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: 6px;
  color: var(--text-primary);
  font-size: 13px;
  text-align: center;
  -moz-appearance: textfield;
}

.number-input::-webkit-outer-spin-button,
.number-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.number-input:focus {
  outline: none;
  border-color: var(--accent-color);
}

.number-unit {
  font-size: 13px;
  color: var(--text-tertiary);
}

/* 缓存清理区域 */
.cache-section {
  margin-top: 8px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.section-header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.btn-open-dir {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: transparent;
  border: 1px solid var(--border-primary);
  border-radius: 6px;
  color: var(--text-secondary);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-open-dir:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border-color: var(--accent-color);
}

.section-icon {
  width: 20px;
  height: 20px;
  color: var(--text-tertiary);
}

.section-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.section-desc {
  font-size: 12px;
  color: var(--text-tertiary);
  margin: 0 0 16px 32px;
}

.cache-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-left: 32px;
}

.cache-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.cache-name {
  font-size: 13px;
  color: var(--text-secondary);
}

.cache-control {
  display: flex;
  align-items: center;
  gap: 0;
}

.cache-input {
  width: 100px;
  padding: 6px 12px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-right: none;
  border-radius: 6px 0 0 6px;
  color: var(--text-primary);
  font-size: 13px;
  text-align: right;
  font-family: monospace;
}

.cache-clear-btn {
  width: 36px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-primary);
  border-radius: 0 6px 6px 0;
  color: var(--accent-color);
  cursor: pointer;
  transition: all 0.2s;
}

.cache-clear-btn:hover {
  background: var(--accent-color);
  border-color: var(--accent-color);
  color: #ffffff;
}
</style>

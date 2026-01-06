<script setup>
import { ref, reactive, onMounted } from 'vue'
import { loadConfig, saveConfig } from '@/services/config'
import { selectDownloadDir, getSystemDownloadDir } from '@/services/download/tauriDownload.js'

// 系统默认下载路径
const defaultDownloadPath = ref('')

// 表单数据
const form = reactive({
  download: { savePath: '' }
})

// 选择下载目录
const selectDownloadPath = async () => {
  try {
    const selected = await selectDownloadDir()
    if (selected) {
      form.download.savePath = selected
      // 自动保存
      const config = loadConfig()
      saveConfig({ ...config, download: { ...config.download, savePath: selected } })
    }
  } catch (e) {
    console.error('选择目录失败:', e)
  }
}

// 重置下载路径为默认
const resetDownloadPath = () => {
  form.download.savePath = ''
  // 自动保存
  const config = loadConfig()
  saveConfig({ ...config, download: { ...config.download, savePath: '' } })
}

// 加载配置
const loadForm = async () => {
  const config = loadConfig()
  if (config.download) {
    Object.assign(form.download, config.download)
  }

  // 加载系统默认下载路径
  try {
    defaultDownloadPath.value = await getSystemDownloadDir() || ''
  } catch (e) {
    console.warn('获取默认下载路径失败:', e)
  }
}

onMounted(() => {
  loadForm()
})
</script>

<template>
  <div class="settings-panel">
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
  border-bottom: 1px solid var(--border-primary, #3d3f43);
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
  color: var(--text-tertiary, #6c6e73);
}

.setting-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary, #ffffff);
}

.setting-hint {
  font-size: 12px;
  color: var(--text-tertiary, #6c6e73);
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
  background: var(--bg-secondary, #2b2d30);
  border: 1px solid var(--border-primary, #3d3f43);
  border-radius: 6px;
  color: var(--text-primary, #ffffff);
  font-size: 13px;
}

.btn-icon {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-tertiary, #3d3f43);
  border: none;
  border-radius: 6px;
  color: var(--text-secondary, #afb1b3);
  cursor: pointer;
  transition: all 0.2s;
}

.btn-icon:hover {
  background: var(--bg-hover, #4a4c50);
  color: var(--text-primary, #ffffff);
}
</style>

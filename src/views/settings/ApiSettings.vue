<script setup>
import { ref, reactive, onMounted } from 'vue'
import { toast } from 'vue-sonner'
import { loadConfig, saveConfig, checkConfig, resetConfig } from '@/services/config'

// 表单数据
const form = reactive({
  tencentAsr: { secretId: '', secretKey: '' },
  doubao: { apiKey: '', model: 'doubao-seed-1-6-251015' },
  deepseek: { apiKey: '', model: 'deepseek-chat' },
  qianwen: { apiKey: '', model: 'qwen-turbo' },
  hunyuan: { secretId: '', secretKey: '' }
})

// 配置状态
const configStatus = ref({
  tencentAsr: false,
  doubao: false,
  deepseek: false,
  qianwen: false,
  hunyuan: false
})

// 加载配置
const loadForm = () => {
  const config = loadConfig()
  Object.keys(form).forEach(key => {
    if (config[key]) {
      Object.assign(form[key], config[key])
    }
  })
  configStatus.value = checkConfig()
}

// 保存配置
const saveForm = () => {
  const config = loadConfig()
  const success = saveConfig({ ...config, ...form })
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
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
            <line x1="12" x2="12" y1="19" y2="23"/>
            <line x1="8" x2="16" y1="23" y2="23"/>
          </svg>
          <span class="setting-label">腾讯云 ASR</span>
          <span class="setting-tag">语音识别</span>
        </div>
        <span :class="['status-dot', { active: configStatus.tencentAsr }]"></span>
      </div>
      <div class="api-form">
        <div class="form-field">
          <label>SecretId</label>
          <input v-model="form.tencentAsr.secretId" placeholder="SecretId" type="text"/>
        </div>
        <div class="form-field">
          <label>SecretKey</label>
          <input v-model="form.tencentAsr.secretKey" placeholder="SecretKey" type="text"/>
        </div>
      </div>
    </div>

    <div class="setting-group">
      <div class="setting-item">
        <div class="setting-row">
          <svg class="setting-icon" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          <span class="setting-label">豆包</span>
          <span class="setting-tag">AI 改写</span>
        </div>
        <span :class="['status-dot', { active: configStatus.doubao }]"></span>
      </div>
      <div class="api-form">
        <div class="form-field flex-2">
          <label>API Key</label>
          <input v-model="form.doubao.apiKey" placeholder="API Key" type="text"/>
        </div>
        <div class="form-field">
          <label>模型</label>
          <input v-model="form.doubao.model" placeholder="模型ID" type="text"/>
        </div>
      </div>
    </div>

    <div class="setting-group">
      <div class="setting-item">
        <div class="setting-row">
          <svg class="setting-icon" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 16v-4"/>
            <path d="M12 8h.01"/>
          </svg>
          <span class="setting-label">DeepSeek</span>
          <span class="setting-tag">AI 改写</span>
        </div>
        <span :class="['status-dot', { active: configStatus.deepseek }]"></span>
      </div>
      <div class="api-form">
        <div class="form-field flex-2">
          <label>API Key</label>
          <input v-model="form.deepseek.apiKey" placeholder="API Key" type="text"/>
        </div>
        <div class="form-field">
          <label>模型</label>
          <input v-model="form.deepseek.model" placeholder="模型ID" type="text"/>
        </div>
      </div>
    </div>

    <div class="setting-group">
      <div class="setting-item">
        <div class="setting-row">
          <svg class="setting-icon" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/>
            <path d="M2 17l10 5 10-5"/>
            <path d="M2 12l10 5 10-5"/>
          </svg>
          <span class="setting-label">通义千问</span>
          <span class="setting-tag">AI 改写</span>
        </div>
        <span :class="['status-dot', { active: configStatus.qianwen }]"></span>
      </div>
      <div class="api-form">
        <div class="form-field flex-2">
          <label>API Key</label>
          <input v-model="form.qianwen.apiKey" placeholder="API Key" type="text"/>
        </div>
        <div class="form-field">
          <label>模型</label>
          <input v-model="form.qianwen.model" placeholder="模型ID" type="text"/>
        </div>
      </div>
    </div>

    <div class="setting-group">
      <div class="setting-item">
        <div class="setting-row">
          <svg class="setting-icon" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 6v6l4 2"/>
          </svg>
          <span class="setting-label">腾讯元宝</span>
          <span class="setting-tag">AI 改写</span>
        </div>
        <span :class="['status-dot', { active: configStatus.hunyuan }]"></span>
      </div>
      <div class="api-form">
        <div class="form-field">
          <label>SecretId</label>
          <input v-model="form.hunyuan.secretId" placeholder="SecretId" type="text"/>
        </div>
        <div class="form-field">
          <label>SecretKey</label>
          <input v-model="form.hunyuan.secretKey" placeholder="SecretKey" type="text"/>
        </div>
      </div>
    </div>

    <div class="api-actions">
      <button class="btn btn-secondary" @click="resetForm">重置</button>
      <button class="btn btn-primary" @click="saveForm">保存配置</button>
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

.setting-tag {
  font-size: 12px;
  color: var(--text-tertiary, #6c6e73);
  margin-left: 8px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--bg-tertiary, #3d3f43);
}

.status-dot.active {
  background: #10b981;
  box-shadow: 0 0 8px rgba(16, 185, 129, 0.5);
}

.api-form {
  display: flex;
  gap: 12px;
  margin-top: 12px;
  margin-left: 32px;
}

.form-field {
  flex: 1;
}

.form-field.flex-2 {
  flex: 2;
}

.form-field label {
  display: block;
  font-size: 12px;
  color: var(--text-tertiary, #6c6e73);
  margin-bottom: 6px;
}

.form-field input {
  width: 100%;
  padding: 8px 12px;
  background: var(--bg-primary, #1e1f22);
  border: 1px solid var(--border-primary, #3d3f43);
  border-radius: 6px;
  color: var(--text-primary, #ffffff);
  font-size: 13px;
  outline: none;
  transition: border-color 0.2s;
}

.form-field input:focus {
  border-color: var(--accent-color, #4a9eff);
}

.form-field input::placeholder {
  color: var(--text-tertiary, #6c6e73);
}

.api-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--border-primary, #3d3f43);
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

.btn-primary {
  background: var(--accent-color, #4a9eff);
  color: #ffffff;
}

.btn-primary:hover {
  background: var(--accent-hover, #3d8fe8);
}

.btn-secondary {
  background: var(--bg-tertiary, #3d3f43);
  color: var(--text-primary, #ffffff);
}

.btn-secondary:hover {
  background: var(--bg-hover, #4a4c50);
}
</style>

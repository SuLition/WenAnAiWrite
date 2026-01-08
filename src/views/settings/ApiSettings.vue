<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useConfigStore } from '@/stores'

// Store
const configStore = useConfigStore()

// 表单数据
const form = reactive({
  tencentAsr: { secretId: '', secretKey: '' },
  doubao: { apiKey: '', model: 'doubao-seed-1-6-251015' },
  deepseek: { apiKey: '', model: 'deepseek-chat' },
  qianwen: { apiKey: '', model: 'qwen-turbo' },
  hunyuan: { secretId: '', secretKey: '' }
})

// 配置状态 - 直接从 configStore 计算
const configStatus = computed(() => ({
  tencentAsr: !!(configStore.config.tencentAsr?.secretId && configStore.config.tencentAsr?.secretKey),
  doubao: !!configStore.config.doubao?.apiKey,
  deepseek: !!configStore.config.deepseek?.apiKey,
  qianwen: !!configStore.config.qianwen?.apiKey,
  hunyuan: !!(configStore.config.hunyuan?.secretId && configStore.config.hunyuan?.secretKey)
}))

// 加载配置
const loadForm = () => {
  const config = configStore.config
  Object.keys(form).forEach(key => {
    if (config[key]) {
      Object.assign(form[key], config[key])
    }
  })
}

// 失去焦点时保存配置
const onBlurSave = () => {
  // 更新所有 API 配置
  Object.keys(form).forEach(key => {
    Object.keys(form[key]).forEach(subKey => {
      configStore.update(`${key}.${subKey}`, form[key][subKey])
    })
  })
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
          <input v-model="form.tencentAsr.secretId" placeholder="SecretId" type="text" @blur="onBlurSave"/>
        </div>
        <div class="form-field">
          <label>SecretKey</label>
          <input v-model="form.tencentAsr.secretKey" placeholder="SecretKey" type="text" @blur="onBlurSave"/>
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
          <input v-model="form.doubao.apiKey" placeholder="API Key" type="text" @blur="onBlurSave"/>
        </div>
        <div class="form-field">
          <label>模型</label>
          <input v-model="form.doubao.model" placeholder="模型ID" type="text" @blur="onBlurSave"/>
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
          <input v-model="form.deepseek.apiKey" placeholder="API Key" type="text" @blur="onBlurSave"/>
        </div>
        <div class="form-field">
          <label>模型</label>
          <input v-model="form.deepseek.model" placeholder="模型ID" type="text" @blur="onBlurSave"/>
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
          <input v-model="form.qianwen.apiKey" placeholder="API Key" type="text" @blur="onBlurSave"/>
        </div>
        <div class="form-field">
          <label>模型</label>
          <input v-model="form.qianwen.model" placeholder="模型ID" type="text" @blur="onBlurSave"/>
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
          <input v-model="form.hunyuan.secretId" placeholder="SecretId" type="text" @blur="onBlurSave"/>
        </div>
        <div class="form-field">
          <label>SecretKey</label>
          <input v-model="form.hunyuan.secretKey" placeholder="SecretKey" type="text" @blur="onBlurSave"/>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.settings-panel {
  animation: fadeIn var(--transition-fast, 200ms) var(--easing-ease, ease);
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

.setting-tag {
  font-size: 12px;
  color: var(--text-tertiary);
  margin-left: 8px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--bg-tertiary);
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
  color: var(--text-tertiary);
  margin-bottom: 6px;
}

.form-field input {
  width: 100%;
  padding: 8px 12px;
  background: var(--bg-primary);
  border: 1px solid var(--border-primary);
  border-radius: 6px;
  color: var(--text-primary);
  font-size: 13px;
  outline: none;
  transition: border-color 0.2s;
}

.form-field input:focus {
  border-color: var(--accent-color);
}

.form-field input::placeholder {
  color: var(--text-tertiary);
}
</style>

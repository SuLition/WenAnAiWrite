<script setup>
import { reactive, onMounted } from 'vue'
import { toast } from 'vue-sonner'
import { loadConfig, saveConfig, PAGE_TRANSITION_OPTIONS } from '@/services/config'
import { setWindowEffect, useWindowEffect } from '@/services/theme'
import CustomSelect from '@/components/common/CustomSelect.vue'

// 窗口效果选项
const WINDOW_EFFECT_OPTIONS = [
  { value: 'none', label: '无效果' },
  { value: 'mica', label: 'Mica (云母)' }
]

// 窗口效果
const windowEffect = useWindowEffect()

// 表单数据
const form = reactive({
  appearance: { pageTransition: 'fade' }
})

// 切换窗口效果
const onWindowEffectChange = async (effect) => {
  await setWindowEffect(effect)
  toast.success(`窗口效果已切换为 ${WINDOW_EFFECT_OPTIONS.find(o => o.value === effect)?.label || effect}`)
}

// 页面过渡效果变更
const onTransitionChange = (value) => {
  form.appearance.pageTransition = value
  // 立即保存
  const config = loadConfig()
  saveConfig({ ...config, appearance: { ...config.appearance, pageTransition: value } })
  // 通知 App.vue 刷新过渡效果
  if (window.__refreshTransition) {
    window.__refreshTransition()
  }
}

// 加载配置
const loadForm = () => {
  const config = loadConfig()
  if (config.appearance) {
    Object.assign(form.appearance, config.appearance)
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
            <rect height="18" rx="2" width="18" x="3" y="3"/>
          </svg>
          <span class="setting-label">窗口效果</span>
        </div>
        <CustomSelect v-model="windowEffect" :options="WINDOW_EFFECT_OPTIONS" class="setting-select"
                      @change="onWindowEffectChange"/>
      </div>
      <p class="setting-hint">Windows 11 原生毛玻璃效果（需要 Win11 22H2+）</p>
    </div>

    <div class="setting-group">
      <div class="setting-item">
        <div class="setting-row">
          <svg class="setting-icon" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
          <span class="setting-label">页面过渡</span>
        </div>
        <CustomSelect v-model="form.appearance.pageTransition" :options="PAGE_TRANSITION_OPTIONS"
                      class="setting-select" @change="onTransitionChange"/>
      </div>
      <p class="setting-hint">切换页面时的动画效果</p>
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

.setting-select {
  width: 160px;
}
</style>

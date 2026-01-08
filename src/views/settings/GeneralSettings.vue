<script setup>
import { ref, computed, onMounted } from 'vue'
import { toast } from 'vue-sonner'
import { useThemeStore, useConfigStore, useUpdateStore } from '@/stores'
import { PAGE_TRANSITION_OPTIONS } from '@/services/config'
import { ACCENT_COLOR_OPTIONS } from '@/constants/theme'
import { ANIMATION_SPEED_OPTIONS } from '@/constants/animation'
import CustomSelect from '@/components/common/CustomSelect.vue'

// Stores
const themeStore = useThemeStore()
const configStore = useConfigStore()
const updateStore = useUpdateStore()

// 窗口效果选项
const WINDOW_EFFECT_OPTIONS = [
  { value: 'none', label: '无效果' },
  { value: 'mica', label: 'Mica (云母)' }
]

// 检查中状态
const isChecking = ref(false)

// 计算属性
const windowEffect = computed({
  get: () => themeStore.windowEffect,
  set: (val) => themeStore.setWindowEffect(val)
})

const accentColor = computed(() => themeStore.accentColor)

const pageTransition = computed({
  get: () => configStore.appearance.pageTransition || 'fade',
  set: (val) => {
    configStore.update('appearance.pageTransition', val)
  }
})

// 任务队列并行数
const maxConcurrent = computed({
  get: () => configStore.config.taskQueue?.maxConcurrent ?? 3,
  set: (val) => {
    const num = parseInt(val, 10)
    if (num >= 1 && num <= 10) {
      configStore.update('taskQueue.maxConcurrent', num)
      toast.success(`并行任务数已设置为 ${num}`)
    }
  }
})

// 并行任务数选项
const CONCURRENT_OPTIONS = [
  { value: 1, label: '1 个' },
  { value: 2, label: '2 个' },
  { value: 3, label: '3 个' },
  { value: 5, label: '5 个' },
  { value: 10, label: '10 个' }
]

const autoCheckUpdate = computed({
  get: () => configStore.config.update?.autoCheck ?? true,
  set: (val) => {
    configStore.update('update.autoCheck', val)
    toast.success(val ? '已开启自动检查更新' : '已关闭自动检查更新')
  }
})

// 切换窗口效果
const onWindowEffectChange = async (effect) => {
  await themeStore.setWindowEffect(effect)
  toast.success(`窗口效果已切换为 ${WINDOW_EFFECT_OPTIONS.find(o => o.value === effect)?.label || effect}`)
}

// 切换主题色
const onAccentColorChange = (colorKey) => {
  themeStore.setAccentColor(colorKey)
  const color = ACCENT_COLOR_OPTIONS.find(o => o.value === colorKey)
  toast.success(`主题色已切换为 ${color?.label || colorKey}`)
}

// 页面过渡效果变更
const onTransitionChange = (value) => {
  configStore.update('appearance.pageTransition', value)
}

// 动画速率
const animationSpeed = computed({
  get: () => configStore.appearance.animationSpeed || 'normal',
  set: (val) => configStore.setAnimationSpeed(val)
})

// 动画速率变更
const onAnimationSpeedChange = (value) => {
  configStore.setAnimationSpeed(value)
  const option = ANIMATION_SPEED_OPTIONS.find(o => o.value === value)
  toast.success(`动画速率已设置为「${option?.label || value}」`)
}

// 手动检查更新
const checkUpdateNow = async () => {
  if (isChecking.value) return
  
  isChecking.value = true
  try {
    await updateStore.checkUpdate(true)
  } finally {
    isChecking.value = false
  }
}
</script>

<template>
  <div class="settings-panel">
    <!-- 窗口效果 -->
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

    <!-- 主题色 -->
    <div class="setting-group">
      <div class="setting-item">
        <div class="setting-row">
          <svg class="setting-icon" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10"/>
            <circle cx="12" cy="12" r="4"/>
          </svg>
          <span class="setting-label">主题色</span>
        </div>
        <div class="color-picker">
          <button
            v-for="color in ACCENT_COLOR_OPTIONS"
            :key="color.value"
            class="color-dot"
            :class="{ active: accentColor === color.value }"
            :style="{ '--color': color.color }"
            :title="color.label"
            @click="onAccentColorChange(color.value)"
          />
        </div>
      </div>
      <p class="setting-hint">应用的强调色，用于按钮、链接等元素</p>
    </div>

    <!-- 页面过渡 -->
    <div class="setting-group">
      <div class="setting-item">
        <div class="setting-row">
          <svg class="setting-icon" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
          <span class="setting-label">页面过渡</span>
        </div>
        <CustomSelect v-model="pageTransition" :options="PAGE_TRANSITION_OPTIONS"
                      class="setting-select" @change="onTransitionChange"/>
      </div>
      <p class="setting-hint">切换页面时的动画效果</p>
    </div>

    <!-- 动画速率 -->
    <div class="setting-group">
      <div class="setting-item">
        <div class="setting-row">
          <svg class="setting-icon" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
          </svg>
          <span class="setting-label">动画速率</span>
        </div>
        <div class="speed-picker">
          <button
            v-for="option in ANIMATION_SPEED_OPTIONS"
            :key="option.value"
            class="speed-btn"
            :class="{ active: animationSpeed === option.value }"
            :title="option.description"
            @click="onAnimationSpeedChange(option.value)"
          >
            {{ option.label }}
          </button>
        </div>
      </div>
      <p class="setting-hint">调整应用动画的播放速度</p>
    </div>

    <!-- 任务并行数 -->
    <div class="setting-group">
      <div class="setting-item">
        <div class="setting-row">
          <svg class="setting-icon" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <rect x="3" y="4" width="18" height="4" rx="1"/>
            <rect x="3" y="10" width="18" height="4" rx="1"/>
            <rect x="3" y="16" width="18" height="4" rx="1"/>
          </svg>
          <span class="setting-label">并行任务数</span>
        </div>
        <CustomSelect v-model="maxConcurrent" :options="CONCURRENT_OPTIONS" class="setting-select"/>
      </div>
      <p class="setting-hint">同时执行的最大任务数量，建议 3 个</p>
    </div>

    <!-- 自动检查更新 -->
    <div class="setting-group">
      <div class="setting-item">
        <div class="setting-row">
          <svg class="setting-icon" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          <span class="setting-label">自动检查更新</span>
        </div>
        <label class="switch">
          <input type="checkbox" v-model="autoCheckUpdate">
          <span class="slider"></span>
        </label>
      </div>
      <p class="setting-hint">启动应用时自动检查新版本</p>
    </div>

    <!-- 手动检查更新 -->
    <div class="setting-group">
      <div class="setting-item">
        <div class="setting-row">
          <svg class="setting-icon" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
          <span class="setting-label">检查更新</span>
        </div>
        <button class="check-update-btn" :class="{ 'btn-loading': isChecking }" @click="checkUpdateNow">立即检查</button>
      </div>
      <p class="setting-hint">手动检查是否有新版本可用</p>
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

.setting-hint {
  font-size: 12px;
  color: var(--text-tertiary);
  margin: 8px 0 0 32px;
}

.setting-select {
  width: 160px;
}

/* Switch 开关样式 */
.switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--bg-primary);
  border: 1px solid var(--border-primary);
  transition: var(--transition-fast, 200ms);
  border-radius: 24px;
}

.slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 2px;
  bottom: 2px;
  background-color: var(--text-tertiary);
  transition: var(--transition-fast, 200ms);
  border-radius: 50%;
}

input:checked + .slider {
  background-color: var(--accent-color);
  border-color: var(--accent-color);
}

input:checked + .slider:before {
  transform: translateX(20px);
  background-color: #fff;
}

/* 检查更新按钮 */
.check-update-btn {
  padding: 6px 16px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast, 200ms) var(--easing-ease, ease);
  border: 1px solid var(--border-primary);
  background: var(--bg-primary);
  color: var(--text-primary);
}

.check-update-btn:hover {
  background: var(--accent-color);
  border-color: var(--accent-color);
  color: #fff;
}

/* 主题色选择器 */
.color-picker {
  display: flex;
  gap: 8px;
}

.color-dot {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background-color: var(--color);
  border: 2px solid transparent;
  cursor: pointer;
  transition: all var(--transition-fast, 200ms) var(--easing-ease, ease);
  padding: 0;
}

.color-dot:hover {
  transform: scale(1.15);
}

.color-dot.active {
  border-color: var(--text-primary);
  box-shadow: 0 0 0 2px var(--color);
}

/* 动画速率选择器 */
.speed-picker {
  display: flex;
  gap: 6px;
}

.speed-btn {
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 500;
  border-radius: 6px;
  cursor: pointer;
  transition: all var(--transition-fast, 0.2s) ease;
  border: 1px solid var(--border-primary);
  background: var(--bg-primary);
  color: var(--text-secondary);
}

.speed-btn:hover {
  border-color: var(--accent-color);
  color: var(--accent-color);
}

.speed-btn.active {
  background: var(--accent-color);
  border-color: var(--accent-color);
  color: #fff;
}
</style>

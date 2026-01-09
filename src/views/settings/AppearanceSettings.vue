<script setup>
import {computed} from 'vue'
import {toast} from 'vue-sonner'
import {useThemeStore, useConfigStore} from '@/stores'
import {PAGE_TRANSITION_OPTIONS} from '@/services/config'
import {ACCENT_COLOR_OPTIONS} from '@/constants/theme'
import {ANIMATION_SPEED_OPTIONS} from '@/constants/animation'
import CustomSelect from '@/components/common/CustomSelect.vue'

// Stores
const themeStore = useThemeStore()
const configStore = useConfigStore()

// 窗口效果选项
const WINDOW_EFFECT_OPTIONS = [
  {value: 'mica', label: 'Mica (云母)'}
]

// 卡片动画选项（与页面过渡相同）
const CARD_ANIMATION_OPTIONS = PAGE_TRANSITION_OPTIONS

// 动画速率选项（转换为下拉格式）
const ANIMATION_SPEED_SELECT_OPTIONS = ANIMATION_SPEED_OPTIONS.map(opt => ({
  value: opt.value,
  label: opt.label
}))

// 计算属性
const windowEffect = computed({
  get: () => themeStore.windowEffect,
  set: (val) => themeStore.setWindowEffect(val)
})

const accentColor = computed(() => themeStore.accentColor)

const pageTransition = computed({
  get: () => configStore.appearance.pageTransition || 'fade',
  set: (val) => configStore.update('appearance.pageTransition', val)
})

const animationSpeed = computed({
  get: () => configStore.appearance.animationSpeed || 'normal',
  set: (val) => configStore.setAnimationSpeed(val)
})

const cardAnimation = computed({
  get: () => configStore.appearance.cardAnimation || 'fade',
  set: (val) => configStore.update('appearance.cardAnimation', val)
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
  const option = PAGE_TRANSITION_OPTIONS.find(o => o.value === value)
  toast.success(`页面过渡已设置为「${option?.label || value}」`)
}

// 动画速率变更
const onAnimationSpeedChange = (value) => {
  configStore.setAnimationSpeed(value)
  const option = ANIMATION_SPEED_OPTIONS.find(o => o.value === value)
  toast.success(`动画速率已设置为「${option?.label || value}」`)
}

// 卡片动画变更
const onCardAnimationChange = (value) => {
  configStore.update('appearance.cardAnimation', value)
  const option = CARD_ANIMATION_OPTIONS.find(o => o.value === value)
  toast.success(`卡片动画已设置为「${option?.label || value}」`)
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
              :class="{ active: accentColor === color.value }"
              :style="{ '--color': color.color }"
              :title="color.label"
              class="color-dot"
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
        <CustomSelect v-model="animationSpeed" :options="ANIMATION_SPEED_SELECT_OPTIONS"
                      class="setting-select" @change="onAnimationSpeedChange"/>
      </div>
      <p class="setting-hint">调整应用动画的播放速度</p>
    </div>

    <!-- 卡片动画 -->
    <div class="setting-group">
      <div class="setting-item">
        <div class="setting-row">
          <svg class="setting-icon" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <rect height="14" rx="2" width="18" x="3" y="3"/>
            <path d="M3 10h18"/>
          </svg>
          <span class="setting-label">卡片动画</span>
        </div>
        <CustomSelect v-model="cardAnimation" :options="CARD_ANIMATION_OPTIONS"
                      class="setting-select" @change="onCardAnimationChange"/>
      </div>
      <p class="setting-hint">删除历史记录或任务时的动画效果</p>
    </div>
  </div>
</template>

<style scoped>
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
</style>

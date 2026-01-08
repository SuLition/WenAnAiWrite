<script setup>
import {onMounted, ref, computed} from 'vue'
import {Toaster} from 'vue-sonner'
import {invoke} from '@tauri-apps/api/core'
import CloseMask from "./components/common/CloseMask.vue";
import {toasterOptions} from "./utils/index.js";
import TitleBar from "./components/common/TitleBar.vue";
import Sidebar from "./components/common/Sidebar.vue";
import {Updater} from "./components/common";
import {useThemeStore, useConfigStore, useUpdateStore} from './stores'
import {getCurrentWindow} from '@tauri-apps/api/window'

// Stores
const themeStore = useThemeStore()
const configStore = useConfigStore()
const updateStore = useUpdateStore()

// 初始化完成状态（用于防止主题闪烁）
const initialized = ref(false)

// 当前主题
const toasterTheme = computed(() => themeStore.appliedTheme === 'dark' ? 'dark' : 'light')

// 页面过渡效果
const pageTransition = computed(() => configStore.appearance.pageTransition || 'fade')

// 初始化并显示窗口
onMounted(async () => {
  try {
    // 加载配置（必须等待完成，否则主题等设置无法正确恢复）
    await configStore.load()
    // 初始化动画速率
    configStore.initAnimationSpeed()
    // 初始化主题
    await themeStore.init()
    // 同步关闭行为设置给 Rust
    const closeAction = configStore.config.general?.closeAction || 'exit'
    await invoke('set_close_action', { action: closeAction }).catch(e => {
      console.warn('同步关闭行为设置失败:', e)
    })
    // 标记初始化完成，显示内容并隐藏加载动画
    initialized.value = true
    document.documentElement.classList.add('app-initialized')
    // 自动检查更新
    updateStore.autoCheck()
  } catch (e) {
    console.error('初始化失败:', e)
    // 即使失败也要显示内容
    initialized.value = true
    document.documentElement.classList.add('app-initialized')
  }
  // 确保无论如何都显示窗口
  try {
    const appWindow = getCurrentWindow()
    await appWindow.show()
  } catch (e) {
    console.error('显示窗口失败:', e)
  }
})
</script>

<template>
  <div :class="{ 'app-ready': initialized }" class="app-container">
    <Sidebar/>
    <div class="main-content">
      <TitleBar/>
      <router-view v-slot="{ Component }">
        <transition :name="pageTransition" mode="out-in">
          <component :is="Component"/>
        </transition>
      </router-view>
      <!-- 消息通知 -->
      <Toaster :theme="toasterTheme" v-bind="toasterOptions"/>
      <!-- 关闭提示遮罩层 -->
      <CloseMask/>
      <!-- 更新组件 -->
      <Updater/>
    </div>
  </div>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body, #app {
  background: var(--bg-primary);
  min-height: 100vh;
  width: 100%;
  height: 100%;
  overflow: hidden;
  transition: background-color var(--transition-normal) var(--easing-ease);
}

/* 启用毛玻璃效果时背景透明 */
html.window-effect-enabled,
html.window-effect-enabled body,
html.window-effect-enabled #app {
  background: transparent;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

.app-container {
  display: flex;
  width: 100%;
  height: 100vh;
  opacity: 0;
  transition: opacity var(--transition-fastest, 150ms) var(--easing-ease, ease);
}

.app-container.app-ready {
  opacity: 1;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--bg-gradient);
  transition: background var(--transition-normal) var(--easing-ease);
}

/* 启用毛玻璃效果时主内容区背景透明 */
html.window-effect-enabled .main-content {
  background: transparent;
}

/* 启用毛玻璃效果时侧边栏背景透明 */
html.window-effect-enabled .sidebar {
  background: transparent !important;
}

/* 启用毛玻璃效果时设置页面透明 */
html.window-effect-enabled .settings-page {
  background: transparent !important;
}

html.window-effect-enabled .settings-section {
  background: rgba(43, 45, 48, 0.6) !important;
}

/* 亮色主题下的毛玻璃效果 */
html.light.window-effect-enabled .settings-section {
  background: rgba(255, 255, 255, 0.7) !important;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* 全局下拉框样式 */
select {
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  background-color: var(--bg-primary);
  color: var(--text-primary);
  border: 1px solid var(--border-primary);
  border-radius: 6px;
  padding: 8px 32px 8px 12px;
  font-size: 14px;
  cursor: pointer;
  outline: none;
  transition: all var(--transition-fast, 200ms) var(--easing-ease, ease);
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23afb1b3' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 10px center;
}

select:hover {
  border-color: var(--accent-color);
}

select:focus {
  border-color: var(--accent-color);
  box-shadow: 0 0 0 2px var(--accent-light);
}

/*noinspection CssUnresolvedCustomProperty*/
select option {
  background-color: var(--bg-secondary);
  color: var(--text-primary);
  padding: 10px 12px;
}

select option:hover,
select option:checked {
  background-color: var(--accent-color);
  color: #ffffff;
}

select:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 页面过渡效果 */
/* 淡入淡出 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity var(--transition-fast, 200ms) var(--easing-ease, ease);
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 左滑 */
.slide-left-enter-active,
.slide-left-leave-active {
  transition: all var(--transition-normal) var(--easing-ease-out);
}

.slide-left-enter-from {
  opacity: 0;
  transform: translateX(20px);
}

.slide-left-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}

/* 右滑 */
.slide-right-enter-active,
.slide-right-leave-active {
  transition: all var(--transition-normal) var(--easing-ease-out);
}

.slide-right-enter-from {
  opacity: 0;
  transform: translateX(-20px);
}

.slide-right-leave-to {
  opacity: 0;
  transform: translateX(20px);
}

/* 上滑 */
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all var(--transition-normal) var(--easing-ease-out);
}

.slide-up-enter-from {
  opacity: 0;
  transform: translateY(20px);
}

.slide-up-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}

/* 缩放 */
.zoom-enter-active,
.zoom-leave-active {
  transition: all var(--transition-fast, 200ms) var(--easing-ease, ease);
}

.zoom-enter-from {
  opacity: 0;
  transform: scale(0.95);
}

.zoom-leave-to {
  opacity: 0;
  transform: scale(1.05);
}

/* 无效果 */
.none-enter-active,
.none-leave-active {
  transition: none;
}

</style>

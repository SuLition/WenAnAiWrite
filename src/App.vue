<script setup>
import {onMounted} from 'vue'
import {Toaster} from 'vue-sonner'
import CloseMask from "./components/common/CloseMask.vue";
import {toasterOptions} from "./utils/index.js";
import TitleBar from "./components/common/TitleBar.vue";
import Sidebar from "./components/common/Sidebar.vue";
import {initTheme} from './services/theme'
import {getCurrentWindow} from '@tauri-apps/api/window'

// 初始化主题并显示窗口
onMounted(async () => {
  try {
    await initTheme()
  } catch (e) {
    console.error('初始化主题失败:', e)
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
  <div class="app-container">
    <Sidebar/>
    <div class="main-content">
      <TitleBar/>
      <router-view/>
      <!-- 消息通知 -->
      <Toaster v-bind="toasterOptions"/>
      <!-- 关闭提示遮罩层 -->
      <CloseMask/>
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
  background: var(--bg-primary, #1e1f22);
  min-height: 100vh;
  width: 100%;
  height: 100%;
  overflow: hidden;
  transition: background-color 0.3s ease;
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
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--bg-gradient);
  transition: background 0.3s ease;
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
  background-color: var(--bg-primary, #1e1f22);
  color: var(--text-primary, #ffffff);
  border: 1px solid var(--border-primary, #3d3f43);
  border-radius: 6px;
  padding: 8px 32px 8px 12px;
  font-size: 14px;
  cursor: pointer;
  outline: none;
  transition: all 0.2s ease;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23afb1b3' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 10px center;
}

select:hover {
  border-color: var(--accent-color, #4a9eff);
}

select:focus {
  border-color: var(--accent-color, #4a9eff);
  box-shadow: 0 0 0 2px var(--accent-light, rgba(74, 158, 255, 0.15));
}

/*noinspection CssUnresolvedCustomProperty*/
select option {
  background-color: var(--bg-secondary, #2b2d30);
  color: var(--text-primary, #ffffff);
  padding: 10px 12px;
}

select option:hover,
select option:checked {
  background-color: var(--accent-color, #4a9eff);
  color: #ffffff;
}

select:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}


</style>

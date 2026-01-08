<script setup>
import {computed, ref} from 'vue';
import {useRouter, useRoute} from 'vue-router';
import {useThemeStore, useTaskQueueStore} from '@/stores';

const router = useRouter();
const route = useRoute();

// Store
const themeStore = useThemeStore();
const taskQueueStore = useTaskQueueStore();
const isDark = computed(() => themeStore.isDark);

// 主题切换动画触发
const themeAnimating = ref(false);

// 待处理任务数（排队中 + 进行中）
const pendingTaskCount = computed(() => taskQueueStore.pendingTasks.length + taskQueueStore.runningTasks.length);

// 判断菜单是否激活（支持子路由匹配）
const isActive = (path) => {
  if (path === '/settings') {
    return route.path.startsWith('/settings');
  }
  return route.path === path;
};

const topMenuItems = [
  {id: '/parse', icon: 'search', title: '视频解析'},
  {id: '/task-queue', icon: 'queue', title: '任务队列'},
  {id: '/history', icon: 'history', title: '下载历史'}
];

const bottomMenuItems = [
  {id: '/settings', icon: 'settings', title: '设置'}
];

const handleMenuClick = (path) => {
  router.push(path);
  console.log('切换到:', path);
};

const handleToggleTheme = () => {
  themeAnimating.value = true;
  themeStore.toggleTheme();
  setTimeout(() => {
    themeAnimating.value = false;
  }, 1000);
};
</script>

<template>
  <div class="sidebar">
    <!-- Logo区域 -->
    <div class="sidebar-logo">
      <div class="logo-box">
        <span class="logo-text">姜</span>
      </div>
    </div>

    <!-- 上部菜单 -->
    <div class="sidebar-menu-top">
      <div
          v-for="item in topMenuItems"
          :key="item.id"
          :class="{ active: isActive(item.id) }"
          :title="item.title"
          class="sidebar-item"
          @click="handleMenuClick(item.id)"
      >
        <svg v-if="item.icon === 'search'"
             :class="{ 'icon-active': isActive(item.id) }"
             class="sidebar-icon search-icon"
             fill="none"
             viewBox="0 0 24 24"
             xmlns="http://www.w3.org/2000/svg">
          <circle class="search-circle" cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2"/>
          <path class="search-line" d="M16 16L21 21" stroke="currentColor" stroke-linecap="round" stroke-width="2"/>
        </svg>

        <svg v-else-if="item.icon === 'queue'"
             :class="{ 'icon-active': isActive(item.id) }"
             class="sidebar-icon queue-icon"
             fill="none"
             viewBox="0 0 24 24"
             xmlns="http://www.w3.org/2000/svg">
          <rect class="queue-rect-1" height="4" rx="1" stroke="currentColor" stroke-width="2" width="18" x="3" y="4"/>
          <rect class="queue-rect-2" height="4" rx="1" stroke="currentColor" stroke-width="2" width="18" x="3" y="10"/>
          <rect class="queue-rect-3" height="4" rx="1" stroke="currentColor" stroke-width="2" width="18" x="3" y="16"/>
        </svg>
        <!-- 任务数角标 -->
        <span v-if="item.icon === 'queue' && pendingTaskCount > 0" class="task-badge">
          {{ pendingTaskCount > 99 ? '99+' : pendingTaskCount }}
        </span>

        <svg v-else-if="item.icon === 'history'"
             :class="{ 'icon-active': isActive(item.id) }"
             class="sidebar-icon history-icon"
             fill="none"
             viewBox="0 0 24 24"
             xmlns="http://www.w3.org/2000/svg">
          <circle class="history-circle" cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"/>
          <path class="history-hand" d="M12 7V12L15 15" stroke="currentColor" stroke-linecap="round" stroke-width="2"/>
        </svg>

        <svg v-else-if="item.icon === 'settings'" class="sidebar-icon" fill="none" viewBox="0 0 24 24"
             xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/>
          <path
              d="M12 2L13 5L16 4L15 7L18 8L16 11L19 13L16 15L17 18L14 17L13 20L11 20L10 17L7 18L8 15L5 13L8 11L6 8L9 7L8 4L11 5L12 2Z"
              stroke="currentColor" stroke-linejoin="round" stroke-width="2"/>
        </svg>
      </div>
    </div>

    <!-- 占位空间 -->
    <div class="sidebar-spacer"></div>

    <!-- 底部菜单 -->
    <div class="sidebar-menu-bottom">
      <!-- 主题切换按钮 -->
      <div
          :title="isDark ? '切换亮色' : '切换暗色'"
          class="sidebar-item theme-toggle"
          @click="handleToggleTheme"
      >
        <!-- 月亮图标 (暗色模式) -->
        <svg v-if="isDark"
             :class="{ 'theme-animating': themeAnimating }"
             class="sidebar-icon moon-icon theme-icon"
             fill="none"
             viewBox="0 0 24 24"
             xmlns="http://www.w3.org/2000/svg">
          <path class="moon-path" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round" stroke-width="2"/>
        </svg>
        <!-- 太阳图标 (亮色模式) -->
        <svg v-else
             :class="{ 'theme-animating': themeAnimating }"
             class="sidebar-icon sun-icon theme-icon"
             fill="none"
             viewBox="0 0 24 24"
             xmlns="http://www.w3.org/2000/svg">
          <circle class="sun-circle" cx="12" cy="12" r="5" stroke="currentColor" stroke-width="2"/>
          <path
              class="sun-rays"
              d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"
              stroke="currentColor" stroke-linecap="round" stroke-width="2"/>
        </svg>
      </div>

      <div
          v-for="item in bottomMenuItems"
          :key="item.id"
          :class="{ active: isActive(item.id) }"
          :title="item.title"
          class="sidebar-item"
          @click="handleMenuClick(item.id)"
      >
        <svg v-if="item.icon === 'settings'"
             :class="{ 'icon-active': isActive(item.id) }"
             class="sidebar-icon settings-icon"
             fill="none"
             viewBox="0 0 24 24"
             xmlns="http://www.w3.org/2000/svg">
          <circle class="settings-circle" cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/>
          <path
              class="settings-gear"
              d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"
              stroke="currentColor" stroke-width="2"/>
        </svg>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sidebar {
  width: 60px;
  height: 100vh;
  background: var(--bg-secondary);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px 0;
  border-right: 1px solid var(--border-primary);
  transition: background-color var(--transition-normal) var(--easing-ease),
  border-color var(--transition-normal) var(--easing-ease);
}

.sidebar-logo {
  width: 40px;
  height: 40px;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.logo-box {
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, var(--accent-color) 0%, #a855f7 100%);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.logo-text {
  font-size: 16px;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: -1px;
}

.sidebar-menu-top {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  align-items: center;
}

.sidebar-spacer {
  flex: 1;
}

.sidebar-menu-bottom {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  align-items: center;
}

.sidebar-item {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  cursor: pointer;
  transition: all var(--transition-normal) var(--easing-ease);
  color: var(--text-secondary);
  position: relative;
}

.sidebar-item:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.sidebar-item.active {
  background: var(--accent-color);
  color: #ffffff;
  animation: click-bounce var(--animation-bounce, 300ms) var(--easing-ease-out, ease-out);
}

@keyframes click-bounce {
  0% {
    transform: scale(1);
  }
  40% {
    transform: scale(0.85);
  }
  100% {
    transform: scale(1);
  }
}

.sidebar-item.theme-toggle:hover {
  background: var(--accent-light);
  color: var(--accent-color);
}

.sidebar-icon {
  width: 24px;
  height: 24px;
}

.search-icon .search-circle {
  stroke-dasharray: 44;
  stroke-dashoffset: 0;
}

.search-icon .search-line {
  stroke-dasharray: 8;
  stroke-dashoffset: 0;
}

.search-icon.icon-active .search-circle {
  animation: draw-circle var(--animation-draw-long, 600ms) var(--easing-ease-out, ease-out);
}

.search-icon.icon-active .search-line {
  animation: draw-line var(--animation-draw, 400ms) var(--easing-ease-out, ease-out) var(--animation-delay-long, 300ms) both;
}

@keyframes draw-circle {
  0% {
    stroke-dashoffset: 44;
  }
  100% {
    stroke-dashoffset: 0;
  }
}

@keyframes draw-line {
  0% {
    stroke-dashoffset: 8;
  }
  100% {
    stroke-dashoffset: 0;
  }
}

.queue-icon .queue-rect-1,
.queue-icon .queue-rect-2,
.queue-icon .queue-rect-3 {
  stroke-dasharray: 48;
  stroke-dashoffset: 0;
}

.queue-icon.icon-active .queue-rect-1 {
  animation: draw-rect var(--animation-draw, 400ms) var(--easing-ease-out, ease-out);
}

.queue-icon.icon-active .queue-rect-2 {
  animation: draw-rect var(--animation-draw, 400ms) var(--easing-ease-out, ease-out) var(--animation-delay-medium, 150ms) both;
}

.queue-icon.icon-active .queue-rect-3 {
  animation: draw-rect var(--animation-draw, 400ms) var(--easing-ease-out, ease-out) var(--animation-delay-long, 300ms) both;
}

@keyframes draw-rect {
  0% {
    stroke-dashoffset: 48;
  }
  100% {
    stroke-dashoffset: 0;
  }
}

/* 历史记录图标动画 */
.history-icon .history-circle {
  stroke-dasharray: 57;
  stroke-dashoffset: 0;
}

.history-icon .history-hand {
  stroke-dasharray: 12;
  stroke-dashoffset: 0;
}

.history-icon.icon-active .history-circle {
  animation: draw-history-circle var(--animation-draw-circle, 800ms) var(--easing-ease-out, ease-out);
}

.history-icon.icon-active .history-hand {
  animation: draw-history-hand var(--animation-draw-medium, 500ms) var(--easing-ease-out, ease-out) var(--animation-delay-extra-long, 400ms) both;
}

@keyframes draw-history-circle {
  0% {
    stroke-dashoffset: 57;
  }
  100% {
    stroke-dashoffset: 0;
  }
}

@keyframes draw-history-hand {
  0% {
    stroke-dashoffset: 12;
  }
  100% {
    stroke-dashoffset: 0;
  }
}

/* 主题切换图标动画 */
.theme-icon {
  transition: opacity var(--transition-normal) var(--easing-ease);
}

.moon-icon .moon-path {
  stroke-dasharray: 60;
  stroke-dashoffset: 0;
}

.moon-icon.theme-animating .moon-path {
  animation: draw-moon var(--animation-draw-circle, 800ms) var(--easing-ease-out, ease-out);
}

@keyframes draw-moon {
  0% {
    stroke-dashoffset: 60;
  }
  100% {
    stroke-dashoffset: 0;
  }
}

.sun-icon .sun-circle {
  stroke-dasharray: 32;
  stroke-dashoffset: 0;
}

.sun-icon .sun-rays {
  stroke-dasharray: 40;
  stroke-dashoffset: 0;
}

.sun-icon.theme-animating .sun-circle {
  animation: draw-sun-circle var(--animation-draw-medium, 500ms) var(--easing-ease-out, ease-out);
}

.sun-icon.theme-animating .sun-rays {
  animation: draw-sun-rays var(--animation-draw-long, 600ms) var(--easing-ease-out, ease-out) var(--animation-delay-short, 100ms) both;
}

@keyframes draw-sun-circle {
  0% {
    stroke-dashoffset: 32;
  }
  100% {
    stroke-dashoffset: 0;
  }
}

@keyframes draw-sun-rays {
  0% {
    stroke-dashoffset: 40;
  }
  100% {
    stroke-dashoffset: 0;
  }
}

/* 设置图标动画 */
.settings-icon .settings-circle {
  stroke-dasharray: 19;
  stroke-dashoffset: 0;
}

.settings-icon .settings-gear {
  stroke-dasharray: 120;
  stroke-dashoffset: 0;
}

.settings-icon.icon-active .settings-circle {
  animation: draw-settings-circle var(--animation-draw, 400ms) var(--easing-ease-out, ease-out);
}

.settings-icon.icon-active .settings-gear {
  animation: draw-settings-gear var(--animation-draw-circle, 800ms) var(--easing-ease-out, ease-out) var(--animation-delay-short, 100ms) both;
}

@keyframes draw-settings-circle {
  0% {
    stroke-dashoffset: 19;
  }
  100% {
    stroke-dashoffset: 0;
  }
}

@keyframes draw-settings-gear {
  0% {
    stroke-dashoffset: 120;
  }
  100% {
    stroke-dashoffset: 0;
  }
}

.task-badge {
  position: absolute;
  top: -2px;
  right: -2px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  font-size: 10px;
  font-weight: 600;
  line-height: 16px;
  text-align: center;
  color: #fff;
  background: var(--accent-color);
  border-radius: 8px;
}

.sidebar-item.active .task-badge {
  background: #fff;
  color: var(--accent-color);
}
</style>

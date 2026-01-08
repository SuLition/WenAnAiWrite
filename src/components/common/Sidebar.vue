<script setup>
import {computed} from 'vue';
import {useRouter, useRoute} from 'vue-router';
import {useThemeStore} from '@/stores';

const router = useRouter();
const route = useRoute();

// Store
const themeStore = useThemeStore();
const isDark = computed(() => themeStore.isDark);

// 判断菜单是否激活（支持子路由匹配）
const isActive = (path) => {
  if (path === '/settings') {
    return route.path.startsWith('/settings');
  }
  return route.path === path;
};

const topMenuItems = [
  {id: '/parse', icon: 'search', title: '视频解析'},
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
  themeStore.toggleTheme();
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
        <svg v-if="item.icon === 'search'" class="sidebar-icon" fill="none" viewBox="0 0 24 24"
             xmlns="http://www.w3.org/2000/svg">
          <circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2"/>
          <path d="M16 16L21 21" stroke="currentColor" stroke-linecap="round" stroke-width="2"/>
        </svg>

        <svg v-else-if="item.icon === 'history'" class="sidebar-icon" fill="none" viewBox="0 0 24 24"
             xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"/>
          <path d="M12 7V12L15 15" stroke="currentColor" stroke-linecap="round" stroke-width="2"/>
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
        <svg v-if="isDark" class="sidebar-icon" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" stroke="currentColor" stroke-linecap="round"
                stroke-linejoin="round" stroke-width="2"/>
        </svg>
        <!-- 太阳图标 (亮色模式) -->
        <svg v-else class="sidebar-icon" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="5" stroke="currentColor" stroke-width="2"/>
          <path
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
        <svg v-if="item.icon === 'settings'" class="sidebar-icon" fill="none" viewBox="0 0 24 24"
             xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/>
          <path
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
  transition: background-color 0.3s ease, border-color 0.3s ease;
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
  transition: all 0.3s ease;
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
}

.sidebar-item.theme-toggle:hover {
  background: var(--accent-light);
  color: var(--accent-color);
}

.sidebar-icon {
  width: 24px;
  height: 24px;
}
</style>

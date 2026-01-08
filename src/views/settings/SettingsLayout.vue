<script setup>
import { useRoute } from 'vue-router'

const route = useRoute()

// 子导航配置
const navItems = [
  { id: 'general', label: '通用', icon: 'settings', path: '/settings/general' },
  { id: 'storage', label: '存储', icon: 'folder', path: '/settings/storage' },
  { id: 'account', label: '账号', icon: 'user', path: '/settings/account' },
  { id: 'api', label: 'API', icon: 'key', path: '/settings/api' },
  { id: 'about', label: '关于', icon: 'info', path: '/settings/about' }
]

// 判断导航是否激活
const isActive = (path) => route.path === path
</script>

<template>
  <div class="settings-page">
    <!-- 左侧内容区 -->
    <div class="settings-content">
      <div class="settings-header">
        <svg class="header-icon" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="3"/>
          <path
              d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
        </svg>
        <h1 class="page-title">设置</h1>
      </div>

      <!-- 子路由内容 -->
      <router-view />
    </div>

    <!-- 右侧子导航 -->
    <nav class="settings-nav">
      <router-link
          v-for="item in navItems"
          :key="item.id"
          :to="item.path"
          :class="['nav-item', { active: isActive(item.path) }]"
      >
        <span class="nav-label">{{ item.label }}</span>
        <svg v-if="item.icon === 'settings'" class="nav-icon" fill="none" stroke="currentColor" stroke-width="2"
             viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="3"/>
          <path
              d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.604.852.997 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
        </svg>
        <svg v-else-if="item.icon === 'folder'" class="nav-icon" fill="none" stroke="currentColor" stroke-width="2"
             viewBox="0 0 24 24">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
        </svg>
        <svg v-else-if="item.icon === 'user'" class="nav-icon" fill="none" stroke="currentColor" stroke-width="2"
             viewBox="0 0 24 24">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
        <svg v-else-if="item.icon === 'key'" class="nav-icon" fill="none" stroke="currentColor" stroke-width="2"
             viewBox="0 0 24 24">
          <path
              d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
        </svg>
        <svg v-else-if="item.icon === 'info'" class="nav-icon" fill="none" stroke="currentColor" stroke-width="2"
             viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="16" x2="12" y2="12"/>
          <line x1="12" y1="8" x2="12.01" y2="8"/>
        </svg>
      </router-link>
    </nav>
  </div>
</template>

<style scoped>
/* 主布局 - 左右结构 */
.settings-page {
  flex: 1;
  display: flex;
  background: var(--bg-primary);
  overflow: hidden;
}

/* 左侧内容区 */
.settings-content {
  flex: 1;
  padding: 24px 32px;
  overflow-y: auto;
}

.settings-content::-webkit-scrollbar {
  width: 6px;
}

.settings-content::-webkit-scrollbar-track {
  background: transparent;
}

.settings-content::-webkit-scrollbar-thumb {
  background: var(--bg-tertiary);
  border-radius: 3px;
}

/* 页面标题 */
.settings-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 32px;
}

.header-icon {
  width: 28px;
  height: 28px;
  color: var(--accent-color);
}

.page-title {
  font-size: 24px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

/* 右侧导航 */
.settings-nav {
  width: 100px;
  padding: 24px 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.nav-item {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  text-decoration: none;
}

.nav-item:hover {
  background: var(--bg-secondary);
}

.nav-item.active {
  background: var(--bg-secondary);
}

.nav-label {
  font-size: 13px;
  color: var(--text-secondary);
}

.nav-item.active .nav-label {
  color: var(--accent-color);
}

.nav-icon {
  width: 16px;
  height: 16px;
  color: var(--text-tertiary);
}

.nav-item.active .nav-icon {
  color: var(--accent-color);
}
</style>

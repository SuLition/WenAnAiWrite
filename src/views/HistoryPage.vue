<script setup>
import {onMounted, computed} from 'vue';
import {useRouter} from 'vue-router';
import {useHistoryStore, useConfigStore} from '@/stores';
import {storeToRefs} from 'pinia';
import {getPlatformName, getPlatformColor} from '@/constants/platforms';
import {toast} from 'vue-sonner';

const router = useRouter();

// Store
const historyStore = useHistoryStore();
const configStore = useConfigStore();
const {list: historyList, loading} = storeToRefs(historyStore);

// 卡片动画配置
const cardAnimation = computed(() => configStore.appearance.cardAnimation || 'fade');
const hasCardAnimation = computed(() => cardAnimation.value !== 'none');

// 加载历史记录
onMounted(async () => {
  await historyStore.load();
});

// 删除记录
const handleDelete = async (id) => {
  await historyStore.delete(id);
  toast.success('已删除');
};

// 查看记录（跳转到解析页面并恢复展示）
const handleViewRecord = (item) => {
  router.push({
    path: '/parse',
    query: {historyId: item.id}
  });
};

// 复制文案
const handleCopy = async (item) => {
  const text = item.rewrittenText || item.originalText;
  if (!text) {
    toast.warning('暂无文案可复制');
    return;
  }
  try {
    await navigator.clipboard.writeText(text);
    toast.success('已复制到剪贴板');
  } catch (error) {
    toast.error('复制失败');
  }
};

// 获取显示文案（优先改写，其次原始）
const getDisplayText = (item) => {
  return item.rewrittenText || item.originalText || '暂无文案';
};

// 检查是否有文案
const hasText = (item) => {
  return !!(item.rewrittenText || item.originalText);
};

// 清空所有记录
const clearAll = async () => {
  if (confirm('确定要清空所有历史记录吗？')) {
    await historyStore.clear();
    toast.success('已清空');
  }
};
</script>

<template>
  <div class="history-page">
    <div class="history-header">
      <h1 class="page-title">历史记录</h1>
      <button v-if="historyList.length > 0" class="clear-button" @click="clearAll">
        清空记录
      </button>
    </div>

    <!-- 加载中 -->
    <div v-if="loading && historyList.length !== 0" class="empty-state">
      <p class="empty-text">加载中...</p>
    </div>

    <!-- 历史列表 -->
    <TransitionGroup v-if="hasCardAnimation && !loading" :name="cardAnimation" class="history-list" tag="div">
      <div v-for="item in historyList" :key="item.id" class="history-card">
        <!-- 左侧封面图 -->
        <div class="card-cover">
          <img v-if="item.cover" :alt="item.title" :src="item.cover"/>
          <!-- 本地音频图标 -->
          <div v-else-if="item.platform === 'local' && item.localType === 'audio'" class="cover-placeholder audio">
            <svg fill="none" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5" opacity="0.3"/>
              <path d="M9 18V7l8-2v11" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
              <circle cx="7" cy="18" r="2" fill="currentColor"/>
              <circle cx="15" cy="16" r="2" fill="currentColor"/>
            </svg>
          </div>
          <!-- 本地文案图标 -->
          <div v-else-if="item.platform === 'local' && item.localType === 'text'" class="cover-placeholder text">
            <svg fill="none" viewBox="0 0 24 24">
              <rect x="4" y="3" width="16" height="18" rx="2" stroke="currentColor" stroke-width="1.5" opacity="0.3"/>
              <path d="M8 7h8M8 11h8M8 15h5" stroke="currentColor" stroke-linecap="round" stroke-width="2"/>
            </svg>
          </div>
          <!-- 默认占位图 -->
          <div v-else class="cover-placeholder">
            <svg fill="none" viewBox="0 0 24 24">
              <path
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
            </svg>
          </div>
          <!-- 平台标签 -->
          <span :style="{ background: getPlatformColor(item.platform) }" class="platform-badge">
            {{ getPlatformName(item.platform, item.localType) }}
          </span>
        </div>

        <!-- 右侧内容 -->
        <div class="card-content">
          <!-- 标题 -->
          <h3 class="card-title">{{ item.title }}</h3>

          <!-- 文案区域（带悬浮复制按钮） -->
          <div class="card-text-wrapper">
            <p class="card-text">{{ getDisplayText(item) }}</p>
            <button v-if="hasText(item)" class="copy-btn" title="复制文案" @click="handleCopy(item)">
              <svg fill="none" viewBox="0 0 24 24">
                <rect height="13" rx="2" stroke="currentColor" stroke-width="2" width="13" x="9" y="9"/>
                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="currentColor" stroke-width="2"/>
              </svg>
            </button>
          </div>

          <!-- 底部操作 -->
          <div class="card-footer">
            <span class="create-time">{{ item.createTime }}</span>
            <div class="card-actions">
              <button class="action-btn primary" @click="handleViewRecord(item)">查看记录</button>
              <button class="action-btn danger" title="删除" @click="handleDelete(item.id)">
                <svg fill="none" height="16" viewBox="0 0 24 24" width="16">
                  <path
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </TransitionGroup>
    <!-- 无动画版本 -->
    <div v-else-if="!loading" class="history-list">
      <div v-for="item in historyList" :key="item.id" class="history-card">
        <!-- 左侧封面图 -->
        <div class="card-cover">
          <img v-if="item.cover" :alt="item.title" :src="item.cover"/>
          <!-- 本地音频图标 -->
          <div v-else-if="item.platform === 'local' && item.localType === 'audio'" class="cover-placeholder audio">
            <svg fill="none" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5" opacity="0.3"/>
              <path d="M9 18V7l8-2v11" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
              <circle cx="7" cy="18" r="2" fill="currentColor"/>
              <circle cx="15" cy="16" r="2" fill="currentColor"/>
            </svg>
          </div>
          <!-- 本地文案图标 -->
          <div v-else-if="item.platform === 'local' && item.localType === 'text'" class="cover-placeholder text">
            <svg fill="none" viewBox="0 0 24 24">
              <rect x="4" y="3" width="16" height="18" rx="2" stroke="currentColor" stroke-width="1.5" opacity="0.3"/>
              <path d="M8 7h8M8 11h8M8 15h5" stroke="currentColor" stroke-linecap="round" stroke-width="2"/>
            </svg>
          </div>
          <!-- 默认占位图 -->
          <div v-else class="cover-placeholder">
            <svg fill="none" viewBox="0 0 24 24">
              <path
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
            </svg>
          </div>
          <!-- 平台标签 -->
          <span :style="{ background: getPlatformColor(item.platform) }" class="platform-badge">
            {{ getPlatformName(item.platform, item.localType) }}
          </span>
        </div>

        <!-- 右侧内容 -->
        <div class="card-content">
          <!-- 标题 -->
          <h3 class="card-title">{{ item.title }}</h3>

          <!-- 文案区域（带悬浮复制按钮） -->
          <div class="card-text-wrapper">
            <p class="card-text">{{ getDisplayText(item) }}</p>
            <button v-if="hasText(item)" class="copy-btn" title="复制文案" @click="handleCopy(item)">
              <svg fill="none" viewBox="0 0 24 24">
                <rect height="13" rx="2" stroke="currentColor" stroke-width="2" width="13" x="9" y="9"/>
                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="currentColor" stroke-width="2"/>
              </svg>
            </button>
          </div>

          <!-- 底部操作 -->
          <div class="card-footer">
            <span class="create-time">{{ item.createTime }}</span>
            <div class="card-actions">
              <button class="action-btn primary" @click="handleViewRecord(item)">查看记录</button>
              <button class="action-btn danger" title="删除" @click="handleDelete(item.id)">
                <svg fill="none" height="16" viewBox="0 0 24 24" width="16">
                  <path
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    <!-- 空状态 -->
    <div v-if="!loading && historyList.length === 0" class="empty-state">
      <svg class="empty-icon" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
        <path
            d="M340.64 488.15c-11.05 0-20-8.95-20-20v-54.63c0-11.05 8.95-20 20-20s20 8.95 20 20v54.63c0 11.05-8.95 20-20 20zM494.87 484.92c-5.79 0-11.54-2.51-15.5-7.34l-20.15-24.64c-6.06-7.41-6.02-18.08 0.1-25.44l22.12-26.61c7.06-8.5 19.67-9.66 28.16-2.6s9.66 19.67 2.6 28.16l-11.58 13.94 9.71 11.88c6.99 8.55 5.73 21.15-2.83 28.14-3.72 3.04-8.2 4.52-12.65 4.52zM844.98 809.94c-8.45 0-16.9-3.21-23.33-9.62-6.25-6.23-9.7-14.52-9.69-23.34 0-8.82 3.44-17.11 9.69-23.34 12.86-12.82 33.79-12.82 46.65 0 6.25 6.23 9.69 14.52 9.69 23.34s-3.44 17.11-9.69 23.34c-6.43 6.41-14.88 9.62-23.33 9.62z m9.21-23.78h0.01-0.01z m-14.12-14.17c-1.31 1.31-2.07 3.13-2.07 4.99s0.75 3.68 2.07 4.99c2.71 2.7 7.12 2.7 9.82 0l0.06-0.06-9.88-9.91z m4.91-2.02c-1.78 0-3.56 0.67-4.91 2.02l9.88 9.92c1.28-1.3 2.01-3.09 2.01-4.93s-0.75-3.68-2.07-4.99a6.928 6.928 0 0 0-4.91-2.03z"
            fill="currentColor"/>
        <path
            d="M725.17 809H482.5c-80.53 0-156.25-31.36-213.19-88.31C212.36 663.74 181 588.03 181 507.5s31.36-156.25 88.31-213.19C326.26 237.36 401.97 206 482.5 206h242.67c31.23 0 56.64 25.41 56.64 56.64 0 25.17-16.19 46.96-40.29 54.23l-51.84 15.63c-14.62 4.41-24.44 17.63-24.44 32.9 0 16.24 11.54 30.39 27.45 33.66l54.42 11.17c22.34 4.58 42.58 16.84 56.99 34.51 14.41 17.67 22.35 39.96 22.35 62.76s-7.94 45.09-22.35 62.76c-14.41 17.67-34.65 29.93-56.99 34.51l-54.42 11.17c-15.91 3.26-27.45 17.42-27.45 33.66 0 15.27 9.82 28.49 24.44 32.9l51.84 15.63c24.1 7.26 40.29 29.06 40.29 54.23 0 31.23-25.41 56.64-56.64 56.64zM482.5 246c-69.85 0-135.52 27.2-184.91 76.59C248.2 371.98 221 437.65 221 507.5s27.2 135.52 76.59 184.91C346.98 741.8 412.65 769 482.5 769h242.67c9.18 0 16.64-7.47 16.64-16.64 0-7.4-4.76-13.8-11.84-15.93l-51.84-15.63c-15.41-4.65-28.63-13.93-38.22-26.85s-14.67-28.25-14.67-44.34c0-35.14 24.98-65.78 59.41-72.84l54.42-11.17c27.45-5.63 47.38-30.07 47.38-58.09s-19.93-52.46-47.38-58.09l-54.42-11.17c-34.42-7.06-59.41-37.7-59.41-72.84 0-16.09 5.07-31.43 14.67-44.34s22.81-22.2 38.22-26.85l51.84-15.63c7.08-2.13 11.84-8.54 11.84-15.93 0-9.18-7.47-16.64-16.64-16.64H482.5z"
            fill="currentColor"/>
      </svg>
      <p class="empty-text">还真是空旷啊</p>
    </div>
  </div>
</template>

<style scoped>
.history-page {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 40px;
  overflow-y: scroll;
  position: relative;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
}

.page-title {
  font-size: 28px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.clear-button {
  padding: 8px 16px;
  background: transparent;
  border: 1px solid var(--border-primary);
  border-radius: 6px;
  color: var(--text-secondary);
  font-size: 14px;
  cursor: pointer;
  transition: all var(--transition-normal) var(--easing-ease);
}

.clear-button:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.empty-state {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  pointer-events: none;
  z-index: 0;
}

.empty-icon {
  width: 64px;
  height: 64px;
  color: var(--text-tertiary);
}

.empty-text {
  font-size: 16px;
  color: var(--text-secondary);
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  position: relative;
  z-index: 1;
}

/* 卡片布局 */
.history-card {
  display: flex;
  gap: 20px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: 12px;
  padding: 16px;
  transition: all var(--transition-normal) var(--easing-ease);
}

.history-card:hover {
  border-color: var(--accent-color);
  box-shadow: 0 2px 12px var(--accent-light);
}

/* 封面图 */
.card-cover {
  position: relative;
  width: 160px;
  min-width: 160px;
  height: 120px;
  border-radius: 8px;
  overflow: hidden;
  background: var(--bg-tertiary);
}

.card-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cover-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-tertiary);
}

.cover-placeholder svg {
  width: 40px;
  height: 40px;
}

/* 本地音频占位图样式 */
.cover-placeholder.audio {
  background: linear-gradient(135deg, rgba(124, 58, 237, 0.15) 0%, rgba(124, 58, 237, 0.05) 100%);
  color: #7c3aed;
}

.cover-placeholder.audio svg {
  width: 48px;
  height: 48px;
}

/* 本地文案占位图样式 */
.cover-placeholder.text {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(59, 130, 246, 0.05) 100%);
  color: #3b82f6;
}

.cover-placeholder.text svg {
  width: 48px;
  height: 48px;
}

.platform-badge {
  position: absolute;
  top: 8px;
  left: 8px;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  color: #ffffff;
}

/* 右侧内容 */
.card-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.card-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 10px 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 文案区域 */
.card-text-wrapper {
  position: relative;
  flex: 1;
  min-height: 0;
}

.card-text {
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-secondary);
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  padding-right: 30px;
}

/* 悬浮复制按钮 */
.copy-btn {
  position: absolute;
  top: 0;
  right: 0;
  width: 28px;
  height: 28px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-primary);
  border-radius: 6px;
  color: var(--text-secondary);
  cursor: pointer;
  opacity: 0;
  transition: all var(--transition-fast, 200ms) var(--easing-ease, ease);
}

.copy-btn svg {
  width: 14px;
  height: 14px;
}

.card-text-wrapper:hover .copy-btn {
  opacity: 1;
}

.copy-btn:hover {
  background: var(--accent-color);
  border-color: var(--accent-color);
  color: #ffffff;
}

/* 底部操作 */
.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--border-primary);
}

.create-time {
  font-size: 12px;
  color: var(--text-tertiary);
}

.card-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  padding: 6px 14px;
  font-size: 13px;
  border-radius: 6px;
  cursor: pointer;
  transition: all var(--transition-fast, 200ms) var(--easing-ease, ease);
}

.action-btn.primary {
  background: var(--accent-color);
  border: 1px solid var(--accent-color);
  color: #ffffff;
}

.action-btn.primary:hover {
  background: var(--accent-hover);
  border-color: var(--accent-hover);
}

.action-btn.danger {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  background: transparent;
  border: 1px solid var(--border-primary);
  color: var(--text-secondary);
}

.action-btn.danger svg {
  width: 16px;
  height: 16px;
}

.action-btn.danger:hover {
  background: #c42b1c;
  border-color: #c42b1c;
  color: #ffffff;
}

/* TransitionGroup 离开动画定位（仅对列表内卡片生效） */
.history-list > .fade-leave-active,
.history-list > .slide-left-leave-active,
.history-list > .slide-right-leave-active,
.history-list > .slide-up-leave-active,
.history-list > .zoom-leave-active {
  position: absolute;
  left: 0;
  right: 0;
}
</style>

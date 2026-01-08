<script setup>
import {onMounted} from 'vue';
import {useRouter} from 'vue-router';
import {useHistoryStore} from '@/stores';
import {storeToRefs} from 'pinia';
import {getPlatformName, getPlatformColor} from '@/constants/platforms';
import {toast} from 'vue-sonner';

const router = useRouter();

// Store
const historyStore = useHistoryStore();
const {list: historyList, loading} = storeToRefs(historyStore);

// 加载历史记录
onMounted(async () => {
  await historyStore.load();
});

// 删除记录
const handleDelete = async (id) => {
  await historyStore.delete(id);
  toast.success('已删除');
};

// 重新解析
const handleReparse = (item) => {
  router.push({
    path: '/parse',
    query: {url: item.originalUrl, platform: item.platform}
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
    <div v-if="loading" class="empty-state">
      <p class="empty-text">加载中...</p>
    </div>

    <!-- 空状态 -->
    <div v-else-if="historyList.length === 0" class="empty-state">
      <svg class="empty-icon" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" stroke="currentColor"
              stroke-linecap="round" stroke-width="2"/>
        <path d="M9 5a2 2 0 012-2h2a2 2 0 012 2v0a2 2 0 01-2 2h-2a2 2 0 01-2-2v0z" stroke="currentColor"
              stroke-width="2"/>
        <path d="M9 12h6M9 16h6" stroke="currentColor" stroke-linecap="round" stroke-width="2"/>
      </svg>
      <p class="empty-text">暂无历史记录</p>
    </div>

    <!-- 历史列表 -->
    <div v-else class="history-list">
      <div v-for="item in historyList" :key="item.id" class="history-card">
        <!-- 左侧封面图 -->
        <div class="card-cover">
          <img v-if="item.cover" :alt="item.title" :src="item.cover"/>
          <div v-else class="cover-placeholder">
            <svg fill="none" viewBox="0 0 24 24">
              <path
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
            </svg>
          </div>
          <!-- 平台标签 -->
          <span :style="{ background: getPlatformColor(item.platform) }" class="platform-badge">
            {{ getPlatformName(item.platform) }}
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
              <button class="action-btn primary" @click="handleReparse(item)">重新解析</button>
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
  </div>
</template>

<style scoped>
.history-page {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 40px;
  overflow-y: auto;
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
  transition: all 0.3s;
}

.clear-button:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
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
}

/* 卡片布局 */
.history-card {
  display: flex;
  gap: 20px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: 12px;
  padding: 16px;
  transition: all 0.3s;
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
  transition: all 0.2s;
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
  transition: all 0.2s;
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
</style>

<script setup>
import {computed} from 'vue';
import {useTaskQueueStore, useConfigStore, TASK_STATUS, TASK_TYPE} from '@/stores';
import {storeToRefs} from 'pinia';
import {getPlatformName, getPlatformColor} from '@/constants/platforms';

// Store
const taskQueueStore = useTaskQueueStore();
const configStore = useConfigStore();
const {tasks} = storeToRefs(taskQueueStore);

// 计算属性
const taskCount = computed(() => taskQueueStore.totalCount);
const hasActiveTasks = computed(() => taskQueueStore.hasPendingTasks);

// 卡片动画配置
const cardAnimation = computed(() => configStore.appearance.cardAnimation || 'fade');
const hasCardAnimation = computed(() => cardAnimation.value !== 'none');

// 获取任务类型文本
const getTypeText = (type) => {
  return type === TASK_TYPE.EXTRACT ? '文案提取' : '文案改写';
};

// 获取状态文本
const getStatusText = (status) => {
  switch (status) {
    case TASK_STATUS.QUEUED:
      return '排队中';
    case TASK_STATUS.RUNNING:
      return '执行中';
    case TASK_STATUS.SUCCESS:
      return '完成';
    case TASK_STATUS.ERROR:
      return '失败';
    default:
      return '未知';
  }
};

// 获取状态样式类
const getStatusClass = (status) => {
  return `status-${status}`;
};

// 获取进度条样式
const getProgressStyle = (status) => {
  if (status === TASK_STATUS.SUCCESS) {
    return {width: '100%'};
  } else if (status === TASK_STATUS.RUNNING) {
    return {width: '50%'};
  } else if (status === TASK_STATUS.QUEUED) {
    return {width: '0%'};
  }
  return {width: '0%'};
};

// 是否显示重试按钮
const showRetryButton = (status) => {
  return status === TASK_STATUS.ERROR;
};

// 重试任务
const handleRetry = (taskId) => {
  taskQueueStore.retryTask(taskId);
};

// 移除任务
const handleRemoveTask = (taskId) => {
  taskQueueStore.removeTask(taskId);
};

// 清空已完成任务
const handleClearCompleted = () => {
  taskQueueStore.clearCompleted();
};

// 格式化时间
const formatTime = (timestamp) => {
  if (!timestamp) return '';
  return new Date(timestamp).toLocaleString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit'
  });
};
</script>

<template>
  <div class="task-queue-page">
    <div class="page-header">
      <h1 class="page-title">任务队列 <span v-if="taskCount > 0" class="task-count">({{ taskCount }})</span></h1>
      <button v-if="tasks.length > 0 && !hasActiveTasks" class="clear-button" @click="handleClearCompleted">
        清空已完成
      </button>
    </div>

    <!-- 空状态 -->
    <div v-if="tasks.length === 0" class="empty-state">
      <svg class="empty-icon" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
        <path
            d="M772.89 858.21c-5.12 0-10.25-1.96-14.15-5.87l-142-142.24c-5.71-5.72-13.32-8.88-21.41-8.88H455.57c-116.5 0-211.28-94.78-211.28-211.28v-87.46c0-11.05 8.95-20 20-20s20 8.95 20 20v87.46c0 94.44 76.84 171.28 171.28 171.28h139.76c18.79 0 36.44 7.32 49.71 20.62l142 142.24c7.8 7.82 7.79 20.48-0.02 28.28-3.9 3.9-9.02 5.85-14.13 5.85z"
            fill="currentColor"/>
        <path
            d="M842 655.86c-5.12 0-10.24-1.95-14.15-5.86L417.71 239.58c-19.85-19.86-46.24-30.8-74.31-30.8-34.85 0-67.35 17.22-86.92 46.05l-41.57 61.24 49.87 0.26c11.05 0.06 19.95 9.06 19.9 20.1-0.06 11.01-9 19.9-20 19.9h-0.11l-59.35-0.31a34.904 34.904 0 0 1-30.74-18.66 34.868 34.868 0 0 1 2.01-35.91l46.9-69.08a144.908 144.908 0 0 1 120.02-63.59c38.76 0 75.2 15.1 102.6 42.52l410.15 410.42c7.81 7.81 7.8 20.48 0 28.28-3.9 3.9-9.02 5.85-14.14 5.85zM804.09 756.85c-5.12 0-10.24-1.95-14.14-5.86L687.07 648.11c-7.81-7.81-7.81-20.47 0-28.28 7.81-7.81 20.47-7.81 28.28 0l102.88 102.88c7.81 7.81 7.81 20.47 0 28.28a19.92 19.92 0 0 1-14.14 5.86zM470.36 848.34c-3.55 0-7.15-0.95-10.4-2.93-9.43-5.75-12.41-18.06-6.65-27.49l49.42-80.98c5.75-9.43 18.06-12.41 27.49-6.65 9.43 5.75 12.41 18.06 6.65 27.49l-49.42 80.98c-3.77 6.18-10.35 9.58-17.09 9.58z"
            fill="currentColor"/>
        <path
            d="M511.11 858.07h-74.47c-11.05 0-20-8.95-20-20s8.95-20 20-20h74.47c11.05 0 20 8.95 20 20s-8.95 20-20 20zM359.8 848.34c-3.55 0-7.15-0.95-10.4-2.93-9.43-5.75-12.41-18.06-6.65-27.49l49.42-80.98c5.75-9.43 18.06-12.41 27.49-6.65 9.43 5.75 12.41 18.06 6.65 27.49l-49.42 80.98c-3.77 6.18-10.35 9.58-17.09 9.58z"
            fill="currentColor"/>
        <path
            d="M381.84 858.07h-52.91c-11.05 0-20-8.95-20-20s8.95-20 20-20h52.91c11.05 0 20 8.95 20 20s-8.95 20-20 20zM584.99 587.26h-52.88c-93.89 0-170.28-76.39-170.28-170.28 0-16.6 9.91-31.42 25.24-37.77 15.33-6.35 32.82-2.87 44.55 8.86l27.66 27.66c7.81 7.81 7.81 20.47 0 28.28-7.81 7.81-20.47 7.81-28.28 0l-27.66-27.66c-0.3-0.3-0.42-0.42-0.96-0.19-0.55 0.23-0.55 0.39-0.55 0.82 0 71.83 58.44 130.28 130.28 130.28h52.88c11.05 0 20 8.95 20 20s-8.95 20-20 20z"
            fill="currentColor"/>
      </svg>
      <p class="empty-text">暂时没有什么东西</p>
    </div>

    <!-- 任务列表 -->
    <TransitionGroup v-if="hasCardAnimation" :name="cardAnimation" class="task-list" tag="div">
      <div v-for="task in tasks" :key="task.id" class="task-card">
        <!-- 左侧封面图 -->
        <div class="card-cover">
          <img v-if="task.cover" :alt="task.title" :src="task.cover"/>
          <div v-else class="cover-placeholder">
            <svg fill="none" viewBox="0 0 24 24">
              <path
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
            </svg>
          </div>
          <!-- 平台标签 -->
          <span :style="{ background: getPlatformColor(task.platform) }" class="platform-badge">
            {{ getPlatformName(task.platform) }}
          </span>
        </div>

        <!-- 右侧内容 -->
        <div class="card-content">
          <!-- 上部信息 -->
          <div class="card-top">
            <!-- 标题行 -->
            <div class="card-header">
              <h3 class="card-title">{{ task.title }}</h3>
              <button class="remove-btn" title="移除任务" @click="handleRemoveTask(task.id)">
                <svg fill="none" viewBox="0 0 24 24">
                  <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" stroke-linecap="round" stroke-width="2"/>
                </svg>
              </button>
            </div>

            <!-- 任务时间 -->
            <div class="task-time">添加时间: {{ formatTime(task.createdAt) }}</div>
          </div>

          <!-- 任务进度 -->
          <div class="task-row">
            <span class="task-label">{{ getTypeText(task.type) }}</span>
            <div class="progress-wrapper">
              <div class="progress-track">
                <div
                    :class="getStatusClass(task.status)"
                    :style="getProgressStyle(task.status)"
                    class="progress-fill"
                ></div>
              </div>
            </div>
            <span :class="getStatusClass(task.status)" class="task-status">
              {{ getStatusText(task.status) }}
            </span>
            <button
                v-if="showRetryButton(task.status)"
                class="retry-btn"
                title="重试"
                @click="handleRetry(task.id)"
            >
              <svg fill="none" viewBox="0 0 24 24">
                <path
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </TransitionGroup>

    <!-- 无动画版本 -->
    <div v-else class="task-list">
      <div v-for="task in tasks" :key="task.id" class="task-card">
        <!-- 左侧封面图 -->
        <div class="card-cover">
          <img v-if="task.cover" :alt="task.title" :src="task.cover"/>
          <div v-else class="cover-placeholder">
            <svg fill="none" viewBox="0 0 24 24">
              <path
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
            </svg>
          </div>
          <!-- 平台标签 -->
          <span :style="{ background: getPlatformColor(task.platform) }" class="platform-badge">
            {{ getPlatformName(task.platform) }}
          </span>
        </div>

        <!-- 右侧内容 -->
        <div class="card-content">
          <!-- 上部信息 -->
          <div class="card-top">
            <!-- 标题行 -->
            <div class="card-header">
              <h3 class="card-title">{{ task.title }}</h3>
              <button class="remove-btn" title="移除任务" @click="handleRemoveTask(task.id)">
                <svg fill="none" viewBox="0 0 24 24">
                  <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" stroke-linecap="round" stroke-width="2"/>
                </svg>
              </button>
            </div>

            <!-- 任务时间 -->
            <div class="task-time">添加时间: {{ formatTime(task.createdAt) }}</div>
          </div>

          <!-- 任务进度 -->
          <div class="task-row">
            <span class="task-label">{{ getTypeText(task.type) }}</span>
            <div class="progress-wrapper">
              <div class="progress-track">
                <div
                    :class="getStatusClass(task.status)"
                    :style="getProgressStyle(task.status)"
                    class="progress-fill"
                ></div>
              </div>
            </div>
            <span :class="getStatusClass(task.status)" class="task-status">
              {{ getStatusText(task.status) }}
            </span>
            <button
                v-if="showRetryButton(task.status)"
                class="retry-btn"
                title="重试"
                @click="handleRetry(task.id)"
            >
              <svg fill="none" viewBox="0 0 24 24">
                <path
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.task-queue-page {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 40px;
  overflow-y: scroll;
  position: relative;
}

.page-header {
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

.task-count {
  font-size: 20px;
  color: var(--text-secondary);
  font-weight: 400;
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

/* 空状态 */
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
  gap: 12px;
  pointer-events: none;
}

.empty-icon {
  width: 64px;
  height: 64px;
  color: var(--text-tertiary);
}

.empty-text {
  font-size: 16px;
  color: var(--text-secondary);
  margin: 0;
}

.empty-hint {
  font-size: 13px;
  color: var(--text-tertiary);
  margin: 0;
}

/* 任务列表 */
.task-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  position: relative;
}

/* 任务卡片 */
.task-card {
  display: flex;
  gap: 20px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: 12px;
  padding: 16px;
  transition: all var(--transition-normal) var(--easing-ease);
}

.task-card:hover {
  border-color: var(--accent-color);
  box-shadow: 0 2px 12px var(--accent-light);
}

/* 封面图 */
.card-cover {
  position: relative;
  width: 140px;
  min-width: 140px;
  height: 100px;
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
  width: 32px;
  height: 32px;
}

.platform-badge {
  position: absolute;
  top: 6px;
  left: 6px;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
  color: #ffffff;
}

/* 右侧内容 */
.card-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-width: 0;
}

.card-top {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.card-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.remove-btn {
  width: 24px;
  height: 24px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 4px;
  color: var(--text-tertiary);
  cursor: pointer;
  opacity: 0;
  transition: all var(--transition-fast, 200ms) var(--easing-ease, ease);
}

.remove-btn svg {
  width: 14px;
  height: 14px;
}

.task-card:hover .remove-btn {
  opacity: 1;
}

.remove-btn:hover {
  background: var(--bg-tertiary);
  color: var(--text-secondary);
}

.task-time {
  font-size: 12px;
  color: var(--text-tertiary);
}

/* 任务行 */
.task-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.task-label {
  font-size: 13px;
  color: var(--text-secondary);
  width: 60px;
  flex-shrink: 0;
}

.progress-wrapper {
  flex: 1;
  height: 6px;
  min-width: 100px;
}

.progress-track {
  width: 100%;
  height: 100%;
  background: var(--border-primary);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.3s ease;
}

.progress-fill.status-queued {
  width: 0;
  background: var(--text-tertiary);
}

.progress-fill.status-running {
  background: var(--accent-color);
  animation: progress-pulse 1.5s ease-in-out infinite;
}

.progress-fill.status-success {
  background: #2ecc71;
}

.progress-fill.status-error {
  background: #e74c3c;
}

@keyframes progress-pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
}

.task-status {
  font-size: 12px;
  width: 50px;
  text-align: center;
  flex-shrink: 0;
}

.task-status.status-queued {
  color: var(--text-tertiary);
}

.task-status.status-running {
  color: var(--accent-color);
}

.task-status.status-success {
  color: #2ecc71;
}

.task-status.status-error {
  color: #e74c3c;
}

.retry-btn {
  width: 24px;
  height: 24px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 1px solid var(--border-primary);
  border-radius: 4px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast, 200ms) var(--easing-ease, ease);
  flex-shrink: 0;
}

.retry-btn svg {
  width: 14px;
  height: 14px;
}

.retry-btn:hover {
  background: var(--accent-color);
  border-color: var(--accent-color);
  color: #ffffff;
}

/* TransitionGroup 离开动画定位（仅对列表内卡片生效） */
.task-list > .fade-leave-active,
.task-list > .slide-left-leave-active,
.task-list > .slide-right-leave-active,
.task-list > .slide-up-leave-active,
.task-list > .zoom-leave-active {
  position: absolute;
  left: 0;
  right: 0;
}
</style>

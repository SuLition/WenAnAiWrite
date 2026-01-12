<script setup>
import {computed, ref} from 'vue';
import {useTaskQueueStore, useConfigStore, TASK_STATUS, TASK_TYPE} from '@/stores';
import {storeToRefs} from 'pinia';
import {getPlatformName, getPlatformColor} from '@/constants/platforms';
import {getCardAnimation} from '@/constants/motionAnimations';
import {Motion, AnimatePresence} from 'motion-v';
import CreateAudioTaskModal from './components/CreateAudioTaskModal.vue';
import CreateTextTaskModal from './components/CreateTextTaskModal.vue';

// 开发模式判断
const isDev = import.meta.env.DEV;

// Store
const taskQueueStore = useTaskQueueStore();
const configStore = useConfigStore();
const {tasks} = storeToRefs(taskQueueStore);

// 计算属性
const taskCount = computed(() => taskQueueStore.totalCount);

// 空状态动画时长
const animationDuration = computed(() => {
  const speed = configStore.appearance?.animationSpeed || 'normal'
  const durations = {disabled: 0, fast: 0.4, normal: 0.6, elegant: 1}
  return durations[speed] || 1
})

// 卡片动画配置
const currentAnimation = computed(() => {
  const anim = configStore.appearance.cardAnimation || 'fade';
  return getCardAnimation(anim);
});

// 创建任务下拉菜单状态
const showCreateMenu = ref(false);
const showAudioModal = ref(false);
const showTextModal = ref(false);

// 切换创建菜单
const toggleCreateMenu = () => {
  showCreateMenu.value = !showCreateMenu.value;
};

// 关闭创建菜单
const closeCreateMenu = () => {
  showCreateMenu.value = false;
};

// 打开音频任务弹窗
const openAudioModal = () => {
  showCreateMenu.value = false;
  showAudioModal.value = true;
};

// 打开文案任务弹窗
const openTextModal = () => {
  showCreateMenu.value = false;
  showTextModal.value = true;
};

// 获取任务类型文本
const getTypeText = (type) => {
  switch (type) {
    case TASK_TYPE.EXTRACT:
      return '文案提取';
    case TASK_TYPE.REWRITE:
      return '文案改写';
    case TASK_TYPE.DOWNLOAD:
      return '视频下载';
    default:
      return '未知任务';
  }
};

// 获取任务类型样式类
const getTypeClass = (type) => {
  switch (type) {
    case TASK_TYPE.EXTRACT:
      return 'type-extract';
    case TASK_TYPE.REWRITE:
      return 'type-rewrite';
    case TASK_TYPE.DOWNLOAD:
      return 'type-download';
    default:
      return '';
  }
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
const getProgressStyle = (task) => {
  if (task.status === TASK_STATUS.SUCCESS) {
    return {width: '100%'};
  } else if (task.status === TASK_STATUS.RUNNING) {
    // 下载任务使用真实进度
    if (task.type === TASK_TYPE.DOWNLOAD) {
      return {width: `${task.progress || 0}%`};
    }
    return {width: '50%'}; // 其他任务显示50%
  } else if (task.status === TASK_STATUS.QUEUED) {
    return {width: '0%'};
  }
  return {width: '0%'};
};

// 获取状态文本（下载任务显示进度百分比）
const getDisplayStatus = (task) => {
  if (task.type === TASK_TYPE.DOWNLOAD && task.status === TASK_STATUS.RUNNING) {
    return `${task.progress || 0}%`;
  }
  return getStatusText(task.status);
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

// 格式化时间
const formatTime = (timestamp) => {
  if (!timestamp) return '';
  return new Date(timestamp).toLocaleString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

// 测试用：添加模拟任务（仅用于 UI 测试，不会真正执行）
const handlePushTask = () => {
  const types = [TASK_TYPE.EXTRACT, TASK_TYPE.REWRITE, TASK_TYPE.DOWNLOAD];
  const platforms = ['douyin', 'bilibili', 'xiaohongshu'];
  const statuses = [TASK_STATUS.QUEUED, TASK_STATUS.SUCCESS, TASK_STATUS.ERROR];
  const titles = [
    '测试视频 - 今天天气真不错',
    '美食探店vlog',
    '旅行随手拍'
  ];

  const randomType = types[Math.floor(Math.random() * types.length)];
  const randomPlatform = platforms[Math.floor(Math.random() * platforms.length)];
  const randomTitle = titles[Math.floor(Math.random() * titles.length)];
  const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];

  // 直接添加到任务列表，不触发执行逻辑
  const mockTask = {
    id: `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: randomType,
    historyId: null,
    cover: '',
    title: `${randomTitle} #${Date.now().toString().slice(-4)}`,
    platform: randomPlatform,
    videoInfo: {},
    params: {},
    data: {},
    status: randomStatus,
    error: randomStatus === TASK_STATUS.ERROR ? '模拟错误信息' : null,
    createdAt: Date.now(),
    progress: randomStatus === TASK_STATUS.SUCCESS ? 100 : 0,
    progressText: ''
  };

  tasks.value.unshift(mockTask);
};

const handleRemoveLatestTask = () => {
  if (tasks.value.length > 0) {
    taskQueueStore.removeTask(tasks.value[0].id);
  }
}
</script>

<template>
  <div class="task-queue-page" @click="closeCreateMenu">
    <div class="page-header">
      <h1 class="page-title">任务队列 <span v-if="taskCount > 0" class="task-count">({{ taskCount }})</span></h1>
      <div class="header-actions">
        <!-- 创建任务按钮 -->
        <div class="create-task-wrapper" @click.stop>
          <button class="create-btn" title="创建任务" @click="toggleCreateMenu">
            <svg fill="none" viewBox="0 0 24 24">
              <path d="M12 4v16m-8-8h16" stroke="currentColor" stroke-linecap="round" stroke-width="2"/>
            </svg>
          </button>
          <!-- 下拉菜单 -->
          <Transition name="fade">
            <div v-if="showCreateMenu" class="create-menu">
              <button class="menu-item" @click="openAudioModal">
                <svg fill="none" viewBox="0 0 24 24">
                  <path
                      d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                      stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
                </svg>
                <span>音频识别</span>
              </button>
              <button class="menu-item" @click="openTextModal">
                <svg fill="none" viewBox="0 0 24 24">
                  <path
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
                </svg>
                <span>文案改写</span>
              </button>
            </div>
          </Transition>
        </div>
        <button v-if="isDev" class="clear-button" title="添加任务" @click="handlePushTask">
          添加任务
        </button>
        <button v-if="isDev" class="clear-button" title="移除任务" @click="handleRemoveLatestTask">
          移除任务
        </button>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-if="tasks.length === 0" class="empty-state">
      <svg class="empty-icon" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
        <!-- 鸟身体主体 -->
        <Motion
            :animate="{ pathLength: 1, opacity: 1 }"
            :initial="{ pathLength: 0, opacity: 0 }"
            :transition="{ duration: animationDuration * 0.4, ease: 'linear' }"
            as="path"
            d="m 265.87146,394.85861 0.87744,118.45759 c 0,0 8.77464,72.82947 43.87318,109.68294 35.09855,36.85347 111.43788,57.9126 111.43788,57.9126 0,0 164.08568,4.3872 185.14481,2.63232 21.05913,-1.75488 168.47305,155.31104 168.47305,155.31104"
            fill="none"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="33"
        />
        <!-- 翅膀 -->
        <Motion
            :animate="{ pathLength: 1, opacity: 1 }"
            :initial="{ pathLength: 0, opacity: 0 }"
            :transition="{ duration: animationDuration * 0.3, delay: animationDuration * 0.15, ease: 'linear' }"
            as="path"
            d="m 443.11911,428.20223 c 0,0 -20.18166,-37.73093 -55.2802,-33.34362 -35.09855,4.38733 10.52956,109.68295 32.46615,132.497 21.93658,22.81405 109.68295,57.9126 162.33076,42.11825"
            fill="none"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="33"
        />
        <!-- 尾巴 -->
        <Motion
            :animate="{ pathLength: 1, opacity: 1 }"
            :initial="{ pathLength: 0, opacity: 0 }"
            :transition="{ duration: animationDuration * 0.2, delay: animationDuration * 0.35, ease: 'linear' }"
            as="path"
            d="M 695.82861,633.5287 811.65382,743.21165"
            fill="none"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="33"
        />
        <!-- 头部和喘 -->
        <Motion
            :animate="{ pathLength: 1, opacity: 1 }"
            :initial="{ pathLength: 0, opacity: 0 }"
            :transition="{ duration: animationDuration * 0.4, delay: animationDuration * 0.4, ease: 'linear' }"
            as="path"
            d="m 267.62639,336.94602 c 0,0 -77.21679,4.38732 -80.72665,-9.65211 -3.50985,-14.03941 71.07455,-117.58011 85.11397,-121.08997 14.03942,-3.50985 57.91259,-40.36333 115.8252,-8.77463 57.91259,31.58869 458.03597,442.24164 458.03597,442.24164"
            fill="none"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="33"
        />
        <!-- 头顶羽毛 -->
        <Motion
            :animate="{ pathLength: 1, opacity: 1 }"
            :initial="{ pathLength: 0, opacity: 0 }"
            :transition="{ duration: animationDuration * 0.15, delay: animationDuration * 0.5, ease: 'linear' }"
            as="path"
            d="m 336.30245,246.33336 c 0,5.06868 -3.10018,26.79171 -3.10018,26.79171"
            fill="none"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="33"
        />
        <!-- 左腿 -->
        <Motion
            :animate="{ pathLength: 1, opacity: 1 }"
            :initial="{ pathLength: 0, opacity: 0 }"
            :transition="{ duration: animationDuration * 0.2, delay: animationDuration * 0.6, ease: 'linear' }"
            as="path"
            d="m 410.65295,743.21165 -55.2802,89.50131"
            fill="none"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="33"
        />
        <!-- 左脚 -->
        <Motion
            :animate="{ pathLength: 1, opacity: 1 }"
            :initial="{ pathLength: 0, opacity: 0 }"
            :transition="{ duration: animationDuration * 0.15, delay: animationDuration * 0.7, ease: 'linear' }"
            as="path"
            d="m 311.49957,838.85517 80.72665,-0.87744"
            fill="none"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="33"
        />
        <!-- 右腿 -->
        <Motion
            :animate="{ pathLength: 1, opacity: 1 }"
            :initial="{ pathLength: 0, opacity: 0 }"
            :transition="{ duration: animationDuration * 0.2, delay: animationDuration * 0.75, ease: 'linear' }"
            as="path"
            d="m 524.72322,744.96659 -53.52527,85.99143"
            fill="none"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="33"
        />
        <!-- 右脚 -->
        <Motion
            :animate="{ pathLength: 1, opacity: 1 }"
            :initial="{ pathLength: 0, opacity: 0 }"
            :transition="{ duration: animationDuration * 0.15, delay: animationDuration * 0.85, ease: 'linear' }"
            as="path"
            d="m 425.56984,837.10029 93.01114,-0.87744"
            fill="none"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="33"
        />
      </svg>
      <p class="empty-text">暂时没有任务</p>
    </div>

    <!-- 任务列表 -->
    <div class="task-list">
      <AnimatePresence mode="popLayout">
        <Motion
            v-for="task in tasks"
            :key="task.id"
            :animate="currentAnimation?.animate"
            :exit="currentAnimation?.exit"
            :initial="currentAnimation?.initial"
            :transition="currentAnimation?.transition"
            as="div"
            class="task-card"
            layout
        >
          <!-- 左侧封面图 -->
          <div class="card-cover">
            <img v-if="task.cover" :alt="task.title" :src="task.cover"/>
            <!-- 本地音频图标 -->
            <div v-else-if="task.platform === 'local' && task.data?.localType === 'audio'"
                 class="cover-placeholder audio">
              <svg fill="none" viewBox="0 0 24 24">
                <circle cx="12" cy="12" opacity="0.3" r="10" stroke="currentColor" stroke-width="1.5"/>
                <path d="M9 18V7l8-2v11" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"
                      stroke-width="2"/>
                <circle cx="7" cy="18" fill="currentColor" r="2"/>
                <circle cx="15" cy="16" fill="currentColor" r="2"/>
              </svg>
            </div>
            <!-- 本地文案图标 -->
            <div v-else-if="task.platform === 'local' && task.data?.localType === 'text'"
                 class="cover-placeholder text">
              <svg fill="none" viewBox="0 0 24 24">
                <rect height="18" opacity="0.3" rx="2" stroke="currentColor" stroke-width="1.5" width="16" x="4" y="3"/>
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
            <span :style="{ background: getPlatformColor(task.platform) }" class="platform-badge">
            {{ getPlatformName(task.platform, task.data?.localType) }}
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
              <!--            <div class="task-time">添加时间: {{ formatTime(task.createdAt) }}</div>-->
              <div class="task-time">添加时间: {{ formatTime(task.createdAt) }}</div>
            </div>

            <!-- 任务进度 -->
            <div class="task-row">
              <span :class="['task-type-tag', getTypeClass(task.type)]">{{ getTypeText(task.type) }}</span>
              <div class="progress-wrapper">
                <div class="progress-track">
                  <div
                      :class="getStatusClass(task.status)"
                      :style="getProgressStyle(task)"
                      class="progress-fill"
                  ></div>
                </div>
              </div>
              <span :class="getStatusClass(task.status)" class="task-status">
              {{ getDisplayStatus(task) }}
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
        </Motion>
      </AnimatePresence>
    </div>

    <!-- 音频任务弹窗 -->
    <CreateAudioTaskModal v-model:visible="showAudioModal"/>

    <!-- 文案任务弹窗 -->
    <CreateTextTaskModal v-model:visible="showTextModal"/>
  </div>
</template>

<style scoped>
.task-queue-page {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 40px;
  overflow-y: scroll;
  overflow-x: hidden;
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
  transform-origin: top;

}

.task-card:hover {
  border-color: var(--accent-color);
  box-shadow: 0 2px 12px var(--accent-light);
  transition: border-color var(--transition-normal) var(--easing-ease),
  box-shadow var(--transition-normal) var(--easing-ease);
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

/* 本地音频占位图样式 */
.cover-placeholder.audio {
  background: linear-gradient(135deg, rgba(124, 58, 237, 0.15) 0%, rgba(124, 58, 237, 0.05) 100%);
  color: #7c3aed;
}

.cover-placeholder.audio svg {
  width: 40px;
  height: 40px;
}

/* 本地文案占位图样式 */
.cover-placeholder.text {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(59, 130, 246, 0.05) 100%);
  color: #3b82f6;
}

.cover-placeholder.text svg {
  width: 40px;
  height: 40px;
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

.task-type-tag {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  flex-shrink: 0;
}

.task-type-tag.type-extract {
  background: rgba(6, 182, 212, 0.12);
  color: #06b6d4;
}

.task-type-tag.type-rewrite {
  background: rgba(168, 85, 247, 0.12);
  color: #a855f7;
}

.task-type-tag.type-download {
  background: rgba(34, 197, 94, 0.12);
  color: #22c55e;
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

/* 头部操作区 */
.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* 创建任务按钮容器 */
.create-task-wrapper {
  position: relative;
}

.create-btn {
  width: 36px;
  height: 36px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--accent-color);
  border: none;
  border-radius: 8px;
  color: #ffffff;
  cursor: pointer;
  transition: all var(--transition-normal) var(--easing-ease);
}

.create-btn svg {
  width: 20px;
  height: 20px;
}

.create-btn:hover {
  background: var(--accent-hover);
  transform: scale(1.05);
}

/* 创建任务下拉菜单 */
.create-menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  min-width: 160px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: 10px;
  padding: 6px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  z-index: 100;
}

.menu-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: transparent;
  border: none;
  border-radius: 6px;
  color: var(--text-primary);
  font-size: 14px;
  cursor: pointer;
  transition: all var(--transition-fast) var(--easing-ease);
}

.menu-item svg {
  width: 18px;
  height: 18px;
  color: var(--text-secondary);
  flex-shrink: 0;
}

.menu-item:hover {
  background: var(--bg-tertiary);
}

.menu-item:hover svg {
  color: var(--accent-color);
}

/* 菜单淡入淡出动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>

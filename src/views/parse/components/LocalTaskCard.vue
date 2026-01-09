<template>
  <div class="local-task-card">
    <!-- 卡片头部 -->
    <div class="card-header">
      <div :class="taskInfo.localType" class="task-type-badge">
        <svg v-if="taskInfo.localType === 'audio'" fill="none" viewBox="0 0 24 24">
          <path
              d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
              stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
        </svg>
        <svg v-else fill="none" viewBox="0 0 24 24">
          <path
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
        </svg>
        <span>{{ taskInfo.localType === 'audio' ? '本地音频' : '本地文案' }}</span>
      </div>
      <h3 class="card-title">{{ taskInfo.title }}</h3>
    </div>

    <!-- 音频预览（仅音频任务） -->
    <div v-if="taskInfo.localType === 'audio'" class="audio-section">
      <div v-if="!audioExists" class="audio-missing">
        <svg fill="none" viewBox="0 0 24 24">
          <path
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
        </svg>
        <span>找不到音频文件</span>
      </div>
      <div v-else class="audio-preview">
        <audio
            ref="audioRef"
            :src="audioUrl"
            preload="auto"
            @ended="onEnded"
            @loadedmetadata="onLoadedMetadata"
            @pause="onPause"
            @play="onPlay"
            @timeupdate="onTimeUpdate"
        />

        <!-- 播放按钮 -->
        <button :disabled="!audioUrl" class="play-btn" @click="togglePlay">
          <svg v-if="!isPlaying" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z"/>
          </svg>
          <svg v-else fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
          </svg>
        </button>

        <!-- 进度条 -->
        <div
            ref="progressRef"
            :class="{ dragging: isDragging }"
            class="progress-wrapper"
            @click="onProgressClick"
            @mousedown="onProgressMouseDown"
        >
          <div class="progress-track">
            <div :style="{ width: progressPercent + '%' }" class="progress-fill"></div>
            <div :style="{ left: progressPercent + '%' }" class="progress-thumb"></div>
          </div>
        </div>

        <!-- 时间显示 -->
        <span class="time-display">
          {{ formatTime(isDragging ? dragTime : currentTime) }} / {{ formatTime(duration) }}
        </span>
      </div>
    </div>

    <!-- 来源类型（音频任务） -->
    <div v-if="taskInfo.localType === 'audio' && taskInfo.localSourceType" class="source-info">
      <span class="info-label">来源类型:</span>
      <span class="info-value">{{ taskInfo.localSourceType === 'video' ? '视频提取' : '音频文件' }}</span>
    </div>

    <!-- 创建时间 -->
    <div class="create-time">
      <span class="info-label">创建时间:</span>
      <span class="info-value">{{ taskInfo.createTime }}</span>
    </div>
  </div>
</template>

<script setup>
import {ref, computed, onMounted, onUnmounted, watch} from 'vue';
import {readFile} from '@tauri-apps/plugin-fs';
import {checkAudioExists, getAudioAbsolutePath} from '@/services/storage/localAudioStorage';

const props = defineProps({
  taskInfo: {
    type: Object,
    required: true
  }
});

const audioExists = ref(true);
const audioUrl = ref('');

// 音频播放器状态
const audioRef = ref(null);
const progressRef = ref(null);
const isPlaying = ref(false);
const currentTime = ref(0);
const duration = ref(0);
const isDragging = ref(false);
const dragTime = ref(0);

// 进度百分比
const progressPercent = computed(() => {
  if (duration.value === 0) return 0;
  const time = isDragging.value ? dragTime.value : currentTime.value;
  return (time / duration.value) * 100;
});

// 格式化时间
const formatTime = (seconds) => {
  if (!seconds || !isFinite(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// 播放控制
const togglePlay = () => {
  if (!audioRef.value) return;
  if (isPlaying.value) {
    audioRef.value.pause();
  } else {
    audioRef.value.play();
  }
};

const onPlay = () => isPlaying.value = true;
const onPause = () => isPlaying.value = false;
const onEnded = () => isPlaying.value = false;
const onLoadedMetadata = () => duration.value = audioRef.value?.duration || 0;
const onTimeUpdate = () => {
  if (!isDragging.value) {
    currentTime.value = audioRef.value?.currentTime || 0;
  }
};

// 进度条点击
const onProgressClick = (e) => {
  if (!audioRef.value || !progressRef.value) return;
  const rect = progressRef.value.getBoundingClientRect();
  const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  audioRef.value.currentTime = percent * duration.value;
};

// 进度条拖动
const onProgressMouseDown = (e) => {
  if (!audioRef.value || !progressRef.value) return;
  isDragging.value = true;
  updateDragTime(e);

  const onMouseMove = (e) => updateDragTime(e);
  const onMouseUp = () => {
    if (audioRef.value) {
      audioRef.value.currentTime = dragTime.value;
    }
    isDragging.value = false;
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  };

  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
};

const updateDragTime = (e) => {
  if (!progressRef.value) return;
  const rect = progressRef.value.getBoundingClientRect();
  const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  dragTime.value = percent * duration.value;
};

// 从文件路径创建 blob URL
const createBlobUrlFromPath = async (path) => {
  try {
    const data = await readFile(path);
    const ext = path.split('.').pop().toLowerCase();
    const mimeType = ext === 'mp3' ? 'audio/mpeg' :
        ext === 'wav' ? 'audio/wav' :
            ext === 'flac' ? 'audio/flac' :
                ext === 'aac' ? 'audio/aac' :
                    ext === 'm4a' ? 'audio/mp4' :
                        ext === 'ogg' ? 'audio/ogg' : 'audio/mpeg';
    const blob = new Blob([data], {type: mimeType});
    return URL.createObjectURL(blob);
  } catch (e) {
    console.error('创建音频预览失败:', e);
    return '';
  }
};

// 检查音频文件并获取URL
const checkAndLoadAudio = async () => {
  if (props.taskInfo.localType !== 'audio' || !props.taskInfo.localAudioPath) {
    return;
  }

  const exists = await checkAudioExists(props.taskInfo.localAudioPath);
  audioExists.value = exists;

  if (exists) {
    // 释放之前的 blob URL
    if (audioUrl.value && audioUrl.value.startsWith('blob:')) {
      URL.revokeObjectURL(audioUrl.value);
    }
    const absolutePath = await getAudioAbsolutePath(props.taskInfo.localAudioPath);
    audioUrl.value = await createBlobUrlFromPath(absolutePath);
  }
};

onMounted(checkAndLoadAudio);

watch(() => props.taskInfo.localAudioPath, checkAndLoadAudio);

// 组件卸载时清理 blob URL
onUnmounted(() => {
  if (audioUrl.value && audioUrl.value.startsWith('blob:')) {
    URL.revokeObjectURL(audioUrl.value);
  }
});
</script>

<style scoped>
.local-task-card {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px;
  background: var(--bg-secondary);
  border-radius: 16px;
  border: 1px solid var(--border-primary);
}

.card-header {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.task-type-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 500;
  width: fit-content;
}

.task-type-badge svg {
  width: 16px;
  height: 16px;
}

.task-type-badge.audio {
  background: rgba(124, 58, 237, 0.1);
  color: #7c3aed;
}

.task-type-badge.text {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
}

.card-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
  /* 单行显示，超出省略号 */
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.audio-section {
  padding: 12px 16px;
  background: var(--bg-tertiary);
  border-radius: 12px;
}

.audio-missing {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #e74c3c;
  font-size: 14px;
}

.audio-missing svg {
  width: 20px;
  height: 20px;
}

.audio-preview {
  display: flex;
  align-items: center;
  gap: 10px;
}

.audio-preview audio {
  display: none;
}

.play-btn {
  width: 32px;
  height: 32px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--accent-color);
  border: none;
  border-radius: 50%;
  color: #ffffff;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.play-btn svg {
  width: 16px;
  height: 16px;
}

.play-btn:hover:not(:disabled) {
  background: var(--accent-hover);
  transform: scale(1.05);
}

.play-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.progress-wrapper {
  flex: 1;
  height: 28px;
  display: flex;
  align-items: center;
  cursor: pointer;
  padding: 0 4px;
  min-width: 80px;
  user-select: none;
}

.progress-wrapper.dragging {
  cursor: grabbing;
}

.progress-track {
  position: relative;
  width: 100%;
  height: 4px;
  background: var(--bg-primary);
  border-radius: 2px;
  overflow: visible;
  transition: height 0.15s ease;
}

.progress-fill {
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  background: var(--accent-color);
  border-radius: 2px;
}

.progress-thumb {
  position: absolute;
  top: 50%;
  width: 12px;
  height: 12px;
  background: var(--accent-color);
  border: 2px solid #ffffff;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.progress-wrapper:hover .progress-thumb,
.progress-wrapper.dragging .progress-thumb {
  transform: translate(-50%, -50%) scale(1.2);
  box-shadow: 0 2px 8px rgba(74, 158, 255, 0.4);
}

.progress-wrapper:hover .progress-track,
.progress-wrapper.dragging .progress-track {
  height: 6px;
}

.time-display {
  font-size: 12px;
  color: var(--text-secondary);
  font-family: 'SF Mono', Monaco, monospace;
  white-space: nowrap;
  flex-shrink: 0;
}

.source-info,
.create-time {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.info-label {
  color: var(--text-tertiary);
}

.info-value {
  color: var(--text-secondary);
}
</style>

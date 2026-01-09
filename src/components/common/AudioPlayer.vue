<template>
  <div class="audio-player">
    <audio
        ref="audioRef"
        :src="src"
        preload="auto"
        @ended="onEnded"
        @error="onAudioError"
        @loadedmetadata="onLoadedMetadata"
        @loadstart="onLoadStart"
        @pause="onPause"
        @play="onPlay"
        @timeupdate="onTimeUpdate"
    />

    <!-- 播放按钮 -->
    <button
        :disabled="audioError || isAudioLoading"
        class="play-btn"
        @click="togglePlay"
    >
      <!-- 加载中 -->
      <svg v-if="isAudioLoading" class="spin" fill="none" viewBox="0 0 24 24">
        <circle cx="12" cy="12" opacity="0.3" r="10" stroke="currentColor" stroke-width="2"/>
        <path d="M12 2a10 10 0 0110 10" stroke="currentColor" stroke-linecap="round" stroke-width="2"/>
      </svg>
      <!-- 播放 -->
      <svg v-else-if="!isPlaying" fill="currentColor" viewBox="0 0 24 24">
        <path d="M8 5v14l11-7z"/>
      </svg>
      <!-- 暂停 -->
      <svg v-else fill="currentColor" viewBox="0 0 24 24">
        <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
      </svg>
    </button>

    <!-- 时间显示（进度条前） -->
    <span v-if="showTimeBeforeProgress" class="time-display">
      {{ formatTime(isDragging ? dragTime : currentTime) }} / {{ formatTime(duration) }}
    </span>

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

    <!-- 时间显示（进度条后，默认） -->
    <span v-if="!showTimeBeforeProgress" class="time-display">
      {{ formatTime(isDragging ? dragTime : currentTime) }} / {{ formatTime(duration) }}
    </span>
  </div>
</template>

<script setup>
import { ref, computed, watch, onUnmounted, onMounted } from 'vue';

const props = defineProps({
  src: {
    type: String,
    default: ''
  },
  // 时间显示位置：true 在进度条前，false 在进度条后
  showTimeBeforeProgress: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['error', 'play', 'pause', 'ended', 'loadedmetadata']);

// 音频播放器状态
const audioRef = ref(null);
const isPlaying = ref(false);
const isAudioLoading = ref(false);
const currentTime = ref(0);
const duration = ref(0);
const audioError = ref(false);

// 拖拽状态
const isDragging = ref(false);
const dragTime = ref(0);
const wasPlayingBeforeDrag = ref(false);
const progressRef = ref(null);

// 格式化时间
const formatTime = (seconds) => {
  if (!seconds || isNaN(seconds)) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

// 播放进度百分比（拖拽时使用dragTime）
const progressPercent = computed(() => {
  if (!duration.value) return 0;
  const time = isDragging.value ? dragTime.value : currentTime.value;
  return (time / duration.value) * 100;
});

// 播放/暂停
const togglePlay = async () => {
  if (!audioRef.value) return;

  if (isPlaying.value) {
    audioRef.value.pause();
  } else {
    try {
      await audioRef.value.play();
    } catch (e) {
      console.error('音频播放失败:', e);
      emit('error', e);
    }
  }
};

// 时间更新（拖拽时不更新）
const onTimeUpdate = () => {
  if (audioRef.value && !isDragging.value) {
    currentTime.value = audioRef.value.currentTime;
  }
};

// 加载元数据
const onLoadedMetadata = () => {
  if (audioRef.value) {
    duration.value = audioRef.value.duration;
    isAudioLoading.value = false;
    audioError.value = false;
    emit('loadedmetadata', { duration: duration.value });
  }
};

// 播放状态变化
const onPlay = () => {
  isPlaying.value = true;
  emit('play');
};

const onPause = () => {
  isPlaying.value = false;
  emit('pause');
};

const onEnded = () => {
  isPlaying.value = false;
  currentTime.value = 0;
  emit('ended');
};

// 音频加载错误
const onAudioError = () => {
  console.error('音频加载失败');
  audioError.value = true;
  isAudioLoading.value = false;
  isPlaying.value = false;
  emit('error', new Error('音频加载失败'));
};

// 开始加载
const onLoadStart = () => {
  isAudioLoading.value = true;
};

// 计算拖拽位置对应的时间
const calcTimeFromPosition = (e, rect) => {
  const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  return percent * duration.value;
};

// 进度条点击/拖拽开始
const onProgressMouseDown = (e) => {
  if (!audioRef.value || !duration.value) return;

  e.preventDefault();
  isDragging.value = true;
  wasPlayingBeforeDrag.value = isPlaying.value;

  // 暂停播放
  if (isPlaying.value) {
    audioRef.value.pause();
  }

  // 设置拖拽时间
  const rect = progressRef.value.getBoundingClientRect();
  dragTime.value = calcTimeFromPosition(e, rect);

  // 添加全局事件监听
  document.addEventListener('mousemove', onProgressMouseMove);
  document.addEventListener('mouseup', onProgressMouseUp);
};

// 拖拽移动
const onProgressMouseMove = (e) => {
  if (!isDragging.value || !progressRef.value) return;

  const rect = progressRef.value.getBoundingClientRect();
  dragTime.value = calcTimeFromPosition(e, rect);
};

// 拖拽结束
const onProgressMouseUp = async () => {
  if (!isDragging.value) return;

  // 移除全局事件监听
  document.removeEventListener('mousemove', onProgressMouseMove);
  document.removeEventListener('mouseup', onProgressMouseUp);

  // 设置播放位置
  if (audioRef.value) {
    audioRef.value.currentTime = dragTime.value;
    currentTime.value = dragTime.value;

    // 如果之前在播放，继续播放
    if (wasPlayingBeforeDrag.value) {
      try {
        await audioRef.value.play();
      } catch (e) {
        console.error('继续播放失败:', e);
      }
    }
  }

  isDragging.value = false;
};

// 进度条点击跳转（单击时直接跳转）
const onProgressClick = (e) => {
  // 如果是拖拽结束后的点击，忽略
  if (isDragging.value) return;
  if (!audioRef.value || !duration.value) return;

  const rect = e.currentTarget.getBoundingClientRect();
  const time = calcTimeFromPosition(e, rect);
  audioRef.value.currentTime = time;
  currentTime.value = time;
};

// 监听 src 变化，重置播放器
watch(() => props.src, () => {
  if (audioRef.value) {
    audioRef.value.pause();
    audioRef.value.currentTime = 0;
  }
  isPlaying.value = false;
  currentTime.value = 0;
  duration.value = 0;
  audioError.value = false;
  isDragging.value = false;
});

// 组件卸载时停止播放并清理事件
onUnmounted(() => {
  if (audioRef.value) {
    audioRef.value.pause();
  }
  document.removeEventListener('mousemove', onProgressMouseMove);
  document.removeEventListener('mouseup', onProgressMouseUp);
});

// 暴露方法给父组件
defineExpose({
  play: () => audioRef.value?.play(),
  pause: () => audioRef.value?.pause(),
  stop: () => {
    if (audioRef.value) {
      audioRef.value.pause();
      audioRef.value.currentTime = 0;
    }
  }
});
</script>

<style scoped>
.audio-player {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.audio-player audio {
  display: none;
}

.play-btn {
  width: 28px;
  height: 28px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--accent-color);
  border: none;
  border-radius: 50%;
  color: #ffffff;
  cursor: pointer;
  transition: all var(--transition-fast, 200ms) var(--easing-ease, ease);
  flex-shrink: 0;
}

.play-btn svg {
  width: 14px;
  height: 14px;
}

.play-btn:hover:not(:disabled) {
  background: var(--accent-hover);
  transform: scale(1.05);
}

.play-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.play-btn .spin {
  animation: spin var(--animation-spin, 1000ms) linear infinite;
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
  background: var(--border-primary);
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
  color: var(--text-tertiary);
  font-family: 'SF Mono', Monaco, monospace;
  white-space: nowrap;
  flex-shrink: 0;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>

<script setup>
import {ref, computed, watch, onUnmounted, onMounted, nextTick} from 'vue';
import {toast} from 'vue-sonner';
import {useRouter} from 'vue-router';
import CustomSelect from '@/components/common/CustomSelect.vue';
import {AI_MODELS, REWRITE_STYLES, DEFAULT_PROMPTS} from '@/constants/options.js';
import {recognizeAudioWithData} from '@/services/tencentAsr.js';
import {rewriteText} from '@/services/aiRewrite.js';
import {downloadAudioData} from '@/services/download/downloadService.js';
import {useHistoryStore, useTaskQueueStore} from '@/stores';

const props = defineProps({
  videoInfo: {
    type: Object,
    required: true
  },
  currentHistoryId: {
    type: [Number, null],
    default: null
  }
});

const copyText = ref('');
const copyMode = ref('original');
const aiModel = ref('doubao');
const rewriteStyle = ref('professional');
const customPrompt = ref(DEFAULT_PROMPTS['professional'] || '');
const isRewriting = ref(false);
const isExtracting = ref(false);

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

// Store
const historyStore = useHistoryStore();
const taskQueueStore = useTaskQueueStore();
const router = useRouter();

// 当 currentHistoryId 变化时，从历史记录加载文案
watch(() => props.currentHistoryId, async (newId) => {
  if (newId) {
    console.log('[CopywritingPanel] currentHistoryId 变化:', newId);
    await historyStore.load();
    const historyItem = historyStore.findById(newId);
    console.log('[CopywritingPanel] 查找到的历史记录:', historyItem);

    if (historyItem) {
      // 优先显示改写后的文案，其次是原始文案
      if (historyItem.rewrittenText) {
        copyText.value = historyItem.rewrittenText;
        copyMode.value = 'rewritten';
        console.log('[CopywritingPanel] 加载改写文案');
      } else if (historyItem.originalText) {
        copyText.value = historyItem.originalText;
        copyMode.value = 'original';
        console.log('[CopywritingPanel] 加载原始文案');
      } else {
        copyText.value = '';
        copyMode.value = 'original';
        console.log('[CopywritingPanel] 无文案数据');
      }
    }
  }
}, {immediate: true});

// 监听历史记录的更新，如果当前显示的历史记录被更新，则刷新文案
watch(() => historyStore.list, (newList) => {
  if (props.currentHistoryId) {
    const updatedItem = newList.find(item => item.id === props.currentHistoryId);
    if (updatedItem) {
      // 优先显示改写后的文案，其次是原始文案
      if (updatedItem.rewrittenText) {
        copyText.value = updatedItem.rewrittenText;
        copyMode.value = 'rewritten';
        console.log('[CopywritingPanel] 从历史记录更新中加载改写文案');
      } else if (updatedItem.originalText) {
        copyText.value = updatedItem.originalText;
        copyMode.value = 'original';
        console.log('[CopywritingPanel] 从历史记录更新中加载原始文案');
      }
    }
  }
}, {deep: true});

// 获取音频URL
const audioUrl = computed(() => {
  if (!props.videoInfo?.audioStream?.url) return null;
  const platform = props.videoInfo.platform;
  const url = props.videoInfo.audioStream.url;
  // 通过后端代理解决跨域问题
  return `http://127.0.0.1:3721/proxy-audio?url=${encodeURIComponent(url)}&platform=${platform}`;
});

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
      toast.error('音频播放失败');
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
  }
};

// 播放状态变化
const onPlay = () => isPlaying.value = true;
const onPause = () => isPlaying.value = false;
const onEnded = () => {
  isPlaying.value = false;
  currentTime.value = 0;
};

// 音频加载错误
const onAudioError = async () => {
  console.error('音频代理加载失败，尝试直接加载原始音频');
  audioError.value = true;
  isAudioLoading.value = false;
  isPlaying.value = false;

  // 尝试直接加载原始音频URL
  if (props.videoInfo?.audioStream?.url && audioRef.value) {
    try {
      audioRef.value.src = props.videoInfo.audioStream.url;
      await audioRef.value.load();
      audioError.value = false;
      console.log('使用原始音频URL成功');
    } catch (e) {
      console.error('直接加载原始音频也失败:', e);
    }
  }
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

// 监听videoInfo变化，重置播放器并自动加载音频
watch(() => props.videoInfo, async (newInfo) => {
  // 重置播放器状态
  if (audioRef.value) {
    audioRef.value.pause();
    audioRef.value.currentTime = 0;
  }
  isPlaying.value = false;
  currentTime.value = 0;
  duration.value = 0;
  audioError.value = false;
  isDragging.value = false;

  // 解析完成后自动加载音频
  if (newInfo?.audioStream?.url) {
    // 等待 DOM 更新
    await nextTick();
    if (audioRef.value) {
      audioRef.value.load();
    }
  }
});

// 组件卸载时停止播放并清理事件
onUnmounted(() => {
  if (audioRef.value) {
    audioRef.value.pause();
  }
  document.removeEventListener('mousemove', onProgressMouseMove);
  document.removeEventListener('mouseup', onProgressMouseUp);
});

const onStyleChange = (newStyle) => {
  customPrompt.value = DEFAULT_PROMPTS[newStyle] || '';
};

const handleExtractCopy = async () => {
  if (!props.videoInfo) {
    toast.warning('请先解析视频');
    return;
  }

  if (!props.currentHistoryId) {
    toast.warning('无效的历史记录');
    return;
  }

  // 创建后台任务
  taskQueueStore.addTask({
    type: 'extract',
    historyId: props.currentHistoryId,
    videoInfo: JSON.parse(JSON.stringify(props.videoInfo))
  });

  toast.success('文案提取任务已添加到队列', {
    action: {
      label: '查看队列',
      onClick: () => router.push('/task-queue')
    }
  });
};

const handleRewrite = async () => {
  if (!copyText.value || copyMode.value !== 'original') {
    toast.warning('请先提取文案');
    return;
  }

  if (!props.currentHistoryId) {
    toast.warning('无效的历史记录');
    return;
  }

  // 创建后台任务
  taskQueueStore.addTask({
    type: 'rewrite',
    historyId: props.currentHistoryId,
    videoInfo: JSON.parse(JSON.stringify(props.videoInfo)),
    params: {
      aiModel: aiModel.value,
      rewriteStyle: rewriteStyle.value,
      customPrompt: customPrompt.value
    }
  });

  toast.success('文案改写任务已添加到队列', {
    action: {
      label: '查看队列',
      onClick: () => router.push('/task-queue')
    }
  });
};

const handleCopy = () => {
  if (!copyText.value) return;

  navigator.clipboard.writeText(copyText.value).then(() => {
    toast.success('已复制到剪贴板');
  });
};
</script>

<template>
  <div class="copywriting-module">
    <div class="copy-left">
      <div class="copy-display-area">
        <div class="copy-header">
          <div class="copy-mode-indicator">
            <span v-if="copyMode === 'original'" class="mode-tag original">原始文案</span>
            <span v-else class="mode-tag rewritten">改写后</span>
          </div>

          <!-- 音频播放器 -->
          <div v-if="audioUrl" class="audio-player">
            <audio
                ref="audioRef"
                :src="audioUrl"
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

          <div class="floating-actions">
            <button
                :disabled="isExtracting || !videoInfo"
                class="floating-btn extract"
                title="文案提取"
                @click="handleExtractCopy"
            >
              <svg v-if="!isExtracting" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                <path d="M8 9V15" stroke="currentColor" stroke-linecap="round" stroke-width="2"/>
                <path d="M12 7V17" stroke="currentColor" stroke-linecap="round" stroke-width="2"/>
                <path d="M16 9V15" stroke="currentColor" stroke-linecap="round" stroke-width="2"/>
              </svg>
              <svg v-else class="spin" fill="none" viewBox="0 0 24 24">
                <circle cx="12" cy="12" opacity="0.3" r="10" stroke="currentColor" stroke-width="2"/>
                <path d="M12 2a10 10 0 0110 10" stroke="currentColor" stroke-linecap="round" stroke-width="2"/>
              </svg>
            </button>

            <button
                :disabled="!copyText"
                class="floating-btn copy"
                title="复制文案"
                @click="handleCopy"
            >
              <svg fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <rect height="13" rx="2" stroke="currentColor" stroke-width="2" width="13" x="9" y="9"/>
                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="currentColor" stroke-width="2"/>
              </svg>
            </button>
          </div>
        </div>

        <textarea
            v-model="copyText"
            class="copy-textarea"
            placeholder="点击右上角按钮提取视频文案..."
        ></textarea>
      </div>
    </div>

    <div class="copy-right">
      <div class="control-row">
        <div class="control-group">
          <label class="control-label">AI模型</label>
          <CustomSelect
              v-model="aiModel"
              :options="AI_MODELS"
              class="control-select"
          />
        </div>

        <div class="control-group">
          <label class="control-label">改写风格</label>
          <CustomSelect
              v-model="rewriteStyle"
              :options="REWRITE_STYLES"
              class="control-select"
              @change="onStyleChange"
          />
        </div>
      </div>

      <div class="control-group prompt-group">
        <label class="control-label">提示词</label>
        <textarea
            v-model="customPrompt"
            class="prompt-textarea"
            placeholder="输入自定义提示词..."
        ></textarea>
      </div>

      <button :disabled="!copyText || isRewriting" class="rewrite-button" @click="handleRewrite">
        <svg v-if="!isRewriting" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M4 12C4 16.4183 7.58172 20 12 20C16.4183 20 20 16.4183 20 12C20 7.58172 16.4183 4 12 4"
                stroke="currentColor" stroke-linecap="round" stroke-width="2"/>
          <path d="M12 4L8 8L12 12" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"
                stroke-width="2"/>
        </svg>
        {{ isRewriting ? '改写中...' : '改写' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.copywriting-module {
  display: flex;
  gap: 16px;
  flex: 3;
  min-height: 0;
  background: var(--bg-secondary);
  border-radius: 8px;
  border: 1px solid var(--border-primary);
  padding: 16px;
  transition: background-color 0.3s ease, border-color 0.3s ease;
}

.copy-left {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.copy-display-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  border-radius: 6px;
  overflow: hidden;
}

.copy-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px;
  background: var(--bg-primary);
  border: 1px solid var(--border-primary);
  border-bottom: none;
  border-radius: 6px 6px 0 0;
}

.copy-mode-indicator {
  flex-shrink: 0;
}

.floating-actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
  margin-left: auto;
}

/* 音频播放器样式 */
.audio-player {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 8px;
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
  transition: all 0.2s ease;
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
  animation: spin 1s linear infinite;
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

.floating-btn {
  width: 32px;
  height: 32px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--accent-light);
  border: 1px solid var(--accent-border);
  border-radius: 6px;
  color: var(--accent-color);
  cursor: pointer;
  transition: all 0.2s;
}

.floating-btn svg {
  width: 18px;
  height: 18px;
}

.floating-btn:hover:not(:disabled) {
  background: var(--accent-color);
  color: #ffffff;
}

.floating-btn.copy:hover:not(:disabled) {
  background: #2ecc71;
  border-color: #2ecc71;
}

.floating-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.floating-btn .spin {
  animation: spin 1s linear infinite;
}

.mode-tag {
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
}

.mode-tag.original {
  background: var(--accent-light);
  color: var(--accent-color);
  border: 1px solid var(--accent-border);
}

.mode-tag.rewritten {
  background: rgba(46, 204, 113, 0.2);
  color: #2ecc71;
  border: 1px solid rgba(46, 204, 113, 0.3);
}

.copy-textarea {
  flex: 1;
  width: 100%;
  padding: 12px;
  background: var(--bg-primary);
  border: 1px solid var(--border-primary);
  border-top: none;
  border-radius: 0 0 6px 6px;
  color: var(--text-primary);
  font-size: 14px;
  line-height: 1.6;
  resize: none;
  outline: none;
  font-family: inherit;
}

.copy-textarea::placeholder {
  color: var(--text-placeholder);
}

.copy-right {
  width: 260px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.control-row {
  display: flex;
  gap: 12px;
}

.control-row .control-group {
  flex: 1;
}

.control-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.control-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
}

.prompt-group {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.prompt-group .prompt-textarea {
  flex: 1;
  min-height: 60px;
}

.prompt-textarea {
  width: 100%;
  min-height: 60px;
  padding: 10px;
  background: var(--bg-primary);
  border: 1px solid var(--border-primary);
  border-radius: 6px;
  color: var(--text-primary);
  font-size: 13px;
  line-height: 1.5;
  resize: none;
  outline: none;
  font-family: inherit;
  transition: all 0.3s;
}

.prompt-textarea:focus {
  border-color: var(--accent-color);
}

.prompt-textarea::placeholder {
  color: var(--text-placeholder);
}

.rewrite-button {
  width: 100%;
  padding: 12px 20px;
  background: var(--accent-color);
  border: none;
  border-radius: 6px;
  color: #ffffff;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  flex-shrink: 0;
  margin-top: auto;
}

.rewrite-button svg {
  width: 20px;
  height: 20px;
}

.rewrite-button:hover:not(:disabled) {
  background: var(--accent-hover);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(74, 158, 255, 0.3);
}

.rewrite-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
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

<script setup>
import {ref, computed, watch, onUnmounted, nextTick} from 'vue';
import {toast} from 'vue-sonner';
import CustomSelect from '@/components/common/CustomSelect.vue';
import {AI_MODELS, REWRITE_STYLES, DEFAULT_PROMPTS} from '@/constants/options.js';
import {recognizeAudioWithData} from '@/services/tencentAsr.js';
import {rewriteText} from '@/services/aiRewrite.js';
import {downloadAudioData} from '@/services/download/downloadService.js';
import {useHistoryStore} from '@/stores';

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
const onAudioError = () => {
  audioError.value = true;
  isAudioLoading.value = false;
  isPlaying.value = false;
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

  isExtracting.value = true;
  copyMode.value = 'original';
  copyText.value = '正在提取文案...';

  try {
    let result = '';

    if (props.videoInfo.platform === 'bilibili') {
      const audioStream = props.videoInfo.audioStream;
      let audioUrl = audioStream?.url;
      const backupUrls = audioStream?.backupUrl || [];

      const isPcdn = audioUrl && (audioUrl.includes('mcdn.bilivideo') || audioUrl.includes('.szbdyd.com'));
      if (isPcdn && backupUrls.length > 0) {
        audioUrl = backupUrls[0];
      }

      if (!audioUrl) {
        throw new Error('未获取到B站音频链接');
      }

      const audioData = await downloadAudioData(audioUrl, 'bilibili', () => {
      });
      const MAX_SIZE = 5 * 1024 * 1024;
      const finalData = audioData.length > MAX_SIZE ? audioData.slice(0, MAX_SIZE) : audioData;

      const chunkSize = 32768;
      let binary = '';
      for (let i = 0; i < finalData.length; i += chunkSize) {
        const chunk = finalData.subarray(i, Math.min(i + chunkSize, finalData.length));
        binary += String.fromCharCode.apply(null, chunk);
      }
      const base64Data = btoa(binary);

      result = await recognizeAudioWithData(base64Data, () => {
      });
    } else if (props.videoInfo.platform === 'douyin') {
      const audioStream = props.videoInfo.audioStream;
      let audioUrl = audioStream?.url;
      const isVideoAudio = audioStream?.isVideoAudio || false;

      if (!audioUrl) {
        throw new Error('未获取到抖音音频链接');
      }

      let base64Data = '';

      if (isVideoAudio) {
        const extractResponse = await fetch('http://127.0.0.1:3721/extract-audio', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({video_url: audioUrl, platform: 'douyin'})
        });

        const extractResult = await extractResponse.json();
        if (!extractResult.success) {
          throw new Error(extractResult.message || '音频提取失败');
        }

        base64Data = extractResult.audio_base64;
      } else {
        const audioData = await downloadAudioData(audioUrl, 'douyin', () => {
        });
        const MAX_SIZE = 5 * 1024 * 1024;
        const finalData = audioData.length > MAX_SIZE ? audioData.slice(0, MAX_SIZE) : audioData;

        const chunkSize = 32768;
        let binary = '';
        for (let i = 0; i < finalData.length; i += chunkSize) {
          const chunk = finalData.subarray(i, Math.min(i + chunkSize, finalData.length));
          binary += String.fromCharCode.apply(null, chunk);
        }
        base64Data = btoa(binary);
      }

      result = await recognizeAudioWithData(base64Data, () => {
      });
    } else if (props.videoInfo.platform === 'xiaohongshu') {
      if (!props.videoInfo.isVideo) {
        throw new Error('图文笔记不支持文案提取');
      }

      const videoUrl = props.videoInfo.audioStream?.url || props.videoInfo.videoUrl;
      if (!videoUrl) {
        throw new Error('未获取到小红书视频链接');
      }

      const extractResponse = await fetch('http://127.0.0.1:3721/extract-audio', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({video_url: videoUrl, platform: 'xiaohongshu'})
      });

      const extractResult = await extractResponse.json();
      if (!extractResult.success) {
        throw new Error(extractResult.message || '音频提取失败');
      }

      const base64Data = extractResult.audio_base64;
      result = await recognizeAudioWithData(base64Data, () => {
      });
    } else {
      throw new Error('该平台文案提取服务开发中');
    }

    copyText.value = result || '未识别到语音内容';

    if (props.currentHistoryId && result) {
      await historyStore.update(props.currentHistoryId, {originalText: result});
    }

    toast.success('文案提取完成');
  } catch (error) {
    console.error('语音识别失败:', error);
    copyText.value = '';
    toast.error(`识别失败: ${error.message}`);
  } finally {
    isExtracting.value = false;
  }
};

const handleRewrite = async () => {
  if (!copyText.value || copyMode.value !== 'original') {
    toast.warning('请先提取文案');
    return;
  }

  isRewriting.value = true;

  try {
    const result = await rewriteText(copyText.value, rewriteStyle.value, aiModel.value);
    copyMode.value = 'rewritten';
    copyText.value = result;

    if (props.currentHistoryId) {
      await historyStore.update(props.currentHistoryId, {rewrittenText: result});
    }

    toast.success('改写完成');
  } catch (error) {
    console.error('改写失败:', error);
    toast.error(error.message || '改写失败，请重试');
  } finally {
    isRewriting.value = false;
  }
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
                @timeupdate="onTimeUpdate"
                @loadedmetadata="onLoadedMetadata"
                @play="onPlay"
                @pause="onPause"
                @ended="onEnded"
                @error="onAudioError"
                @loadstart="onLoadStart"
            />
            
            <!-- 播放按钮 -->
            <button 
                class="play-btn" 
                :disabled="audioError || isAudioLoading"
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
                class="progress-wrapper" 
                :class="{ dragging: isDragging }"
                @mousedown="onProgressMouseDown"
                @click="onProgressClick"
            >
              <div class="progress-track">
                <div class="progress-fill" :style="{ width: progressPercent + '%' }"></div>
                <div class="progress-thumb" :style="{ left: progressPercent + '%' }"></div>
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

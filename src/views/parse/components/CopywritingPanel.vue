<script setup>
import {ref, computed, watch} from 'vue';
import {toast} from 'vue-sonner';
import {useRouter} from 'vue-router';
import CustomSelect from '@/components/common/CustomSelect.vue';
import {AudioPlayer} from '@/components/common';
import {AI_MODELS, REWRITE_STYLES, DEFAULT_PROMPTS} from '@/constants/options.js';
import {useHistoryStore, useTaskQueueStore} from '@/stores';

const props = defineProps({
  videoInfo: {
    type: Object,
    default: null
  },
  currentHistoryId: {
    type: [Number, null],
    default: null
  },
  localTaskInfo: {
    type: Object,
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
  // 本地任务不显示音频播放器（本地音频已在 LocalTaskCard 中处理）
  if (props.localTaskInfo) return null;
  if (!props.videoInfo?.audioStream?.url) return null;
  const platform = props.videoInfo.platform;
  const url = props.videoInfo.audioStream.url;
  // 通过后端代理解决跨域问题
  return `http://127.0.0.1:3721/proxy-audio?url=${encodeURIComponent(url)}&platform=${platform}`;
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
          <AudioPlayer
              v-if="audioUrl"
              :src="audioUrl"
              class="audio-player-wrapper"
          />

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
  border-radius: 16px;
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
.audio-player-wrapper {
  flex: 1;
  padding: 0 8px;
  min-width: 0;
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
  transition: all var(--transition-fast, 200ms) var(--easing-ease, ease);
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

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
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
  transition: all var(--transition-normal) var(--easing-ease);
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
  transition: all var(--transition-normal) var(--easing-ease);
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
</style>

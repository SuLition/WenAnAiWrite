<script setup>
import { ref } from 'vue';
import { toast } from 'vue-sonner';
import CustomSelect from '@/components/common/CustomSelect.vue';
import { AI_MODELS, REWRITE_STYLES, DEFAULT_PROMPTS } from '@/constants/options.js';
import { recognizeAudioWithData } from '@/services/tencentAsr.js';
import { rewriteText } from '@/services/aiRewrite.js';
import { downloadAudioData } from '@/services/download/downloadService.js';
import { useHistoryStore } from '@/stores';

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

// Store
const historyStore = useHistoryStore();

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

      const audioData = await downloadAudioData(audioUrl, 'bilibili', () => {});
      const MAX_SIZE = 5 * 1024 * 1024;
      const finalData = audioData.length > MAX_SIZE ? audioData.slice(0, MAX_SIZE) : audioData;

      const chunkSize = 32768;
      let binary = '';
      for (let i = 0; i < finalData.length; i += chunkSize) {
        const chunk = finalData.subarray(i, Math.min(i + chunkSize, finalData.length));
        binary += String.fromCharCode.apply(null, chunk);
      }
      const base64Data = btoa(binary);

      result = await recognizeAudioWithData(base64Data, () => {});
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
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ video_url: audioUrl, platform: 'douyin' })
        });

        const extractResult = await extractResponse.json();
        if (!extractResult.success) {
          throw new Error(extractResult.message || '音频提取失败');
        }

        base64Data = extractResult.audio_base64;
      } else {
        const audioData = await downloadAudioData(audioUrl, 'douyin', () => {});
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

      result = await recognizeAudioWithData(base64Data, () => {});
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ video_url: videoUrl, platform: 'xiaohongshu' })
      });

      const extractResult = await extractResponse.json();
      if (!extractResult.success) {
        throw new Error(extractResult.message || '音频提取失败');
      }

      const base64Data = extractResult.audio_base64;
      result = await recognizeAudioWithData(base64Data, () => {});
    } else {
      throw new Error('该平台文案提取服务开发中');
    }

    copyText.value = result || '未识别到语音内容';

    if (props.currentHistoryId && result) {
      await historyStore.update(props.currentHistoryId, { originalText: result });
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
      await historyStore.update(props.currentHistoryId, { rewrittenText: result });
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
        <div class="copy-mode-indicator">
          <span v-if="copyMode === 'original'" class="mode-tag original">原始文案</span>
          <span v-else class="mode-tag rewritten">改写后</span>
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

        <textarea
            v-model="copyText"
            class="copy-textarea"
            placeholder="点击右上角按钮提取视频文案..."
            readonly
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
          <path d="M4 12C4 16.4183 7.58172 20 12 20C16.4183 20 20 16.4183 20 12C20 7.58172 16.4183 4 12 4" stroke="currentColor" stroke-linecap="round" stroke-width="2"/>
          <path d="M12 4L8 8L12 12" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
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
  background: var(--bg-secondary, #2b2d30);
  border-radius: 8px;
  border: 1px solid var(--border-primary, #3d3f43);
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
  position: relative;
  border-radius: 6px;
  overflow: hidden;
}

.copy-mode-indicator {
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 2;
}

.floating-actions {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 2;
  display: flex;
  gap: 6px;
}

.floating-btn {
  width: 32px;
  height: 32px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--accent-light, rgba(74, 158, 255, 0.15));
  border: 1px solid var(--accent-border, rgba(74, 158, 255, 0.3));
  border-radius: 6px;
  color: var(--accent-color, #4a9eff);
  cursor: pointer;
  transition: all 0.2s;
}

.floating-btn svg {
  width: 18px;
  height: 18px;
}

.floating-btn:hover:not(:disabled) {
  background: var(--accent-color, #4a9eff);
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
  background: var(--accent-light, rgba(74, 158, 255, 0.2));
  color: var(--accent-color, #4a9eff);
  border: 1px solid var(--accent-border, rgba(74, 158, 255, 0.3));
}

.mode-tag.rewritten {
  background: rgba(46, 204, 113, 0.2);
  color: #2ecc71;
  border: 1px solid rgba(46, 204, 113, 0.3);
}

.copy-textarea {
  width: 100%;
  height: 100%;
  padding: 12px;
  padding-top: 48px;
  background: var(--bg-primary, #1e1f22);
  border: 1px solid var(--border-primary, #3d3f43);
  border-radius: 6px;
  color: var(--text-primary, #ffffff);
  font-size: 14px;
  line-height: 1.6;
  resize: none;
  outline: none;
  font-family: inherit;
}

.copy-textarea::placeholder {
  color: var(--text-placeholder, #6c6e73);
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
  color: var(--text-secondary, #afb1b3);
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
  background: var(--bg-primary, #1e1f22);
  border: 1px solid var(--border-primary, #3d3f43);
  border-radius: 6px;
  color: var(--text-primary, #ffffff);
  font-size: 13px;
  line-height: 1.5;
  resize: none;
  outline: none;
  font-family: inherit;
  transition: all 0.3s;
}

.prompt-textarea:focus {
  border-color: var(--accent-color, #4a9eff);
}

.prompt-textarea::placeholder {
  color: var(--text-placeholder, #6c6e73);
}

.rewrite-button {
  width: 100%;
  padding: 12px 20px;
  background: var(--accent-color, #4a9eff);
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
  background: var(--accent-hover, #3d8fe8);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(74, 158, 255, 0.3);
}

.rewrite-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>

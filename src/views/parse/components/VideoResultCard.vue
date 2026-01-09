<script setup>
import {ref} from 'vue';
import {toast} from 'vue-sonner';
import CustomSelect from '@/components/common/CustomSelect.vue';
import {formatDuration} from '@/utils/format.js';
import {openDownloadDir} from '@/services/download/tauriDownload.js';
import {
  downloadBilibili,
  downloadDouyin,
  downloadXiaohongshu
} from '@/services/download/downloadService.js';

const props = defineProps({
  videoInfo: {
    type: Object,
    required: true
  },
  qualityOptions: {
    type: Array,
    default: () => []
  },
  selectedQuality: {
    type: [String, Number],
    default: ''
  }
});

const emit = defineEmits(['update:selectedQuality']);

const isDownloading = ref(false);
const downloadProgress = ref(0);

const handleQualityChange = (value) => {
  emit('update:selectedQuality', value);
};

const handleDownload = async () => {
  if (props.selectedQuality === '' || props.selectedQuality === null || props.selectedQuality === undefined) {
    toast.warning('请选择下载清晰度');
    return;
  }

  const fileName = (props.videoInfo.title || 'video').replace(/[\\/:*?"<>|]/g, '_');
  const selectedStream = props.qualityOptions.find(q => q.value === props.selectedQuality);

  if (!selectedStream) {
    toast.error('未找到选中的视频流');
    return;
  }

  isDownloading.value = true;
  downloadProgress.value = 0;

  const onProgress = (progress) => {
    downloadProgress.value = Math.min(Math.max(progress, 0), 100);
  };

  try {
    if (props.videoInfo.platform === 'bilibili') {
      await downloadBilibili(
          selectedStream.stream.url,
          `${fileName}_${selectedStream.stream.short}.mp4`,
          onProgress,
          {backupUrls: selectedStream.stream.backupUrl || []}
      );
    } else if (props.videoInfo.platform === 'douyin') {
      await downloadDouyin(
          selectedStream.stream.url,
          `${fileName}_${selectedStream.stream.short}.mp4`,
          onProgress,
          {backupUrls: selectedStream.stream.backupUrls || []}
      );
    } else if (props.videoInfo.platform === 'xiaohongshu') {
      await downloadXiaohongshu(
          selectedStream.stream.url,
          `${fileName}_${selectedStream.stream.short}.mp4`,
          onProgress,
          {backupUrls: selectedStream.stream.backupUrls || []}
      );
    }

    downloadProgress.value = 100;
    toast.success('下载完成');
  } catch (error) {
    console.error('下载失败:', error);
    toast.error('下载失败，请重试');
  } finally {
    isDownloading.value = false;
    downloadProgress.value = 0;
  }
};
</script>

<template>
  <div class="result-area">
    <!-- 左侧封面 -->
    <div class="cover-box">
      <img :src="videoInfo.cover" alt="封面"/>
    </div>

    <!-- 右侧信息卡片 -->
    <div class="info-card">
      <!-- 标题 -->
      <div class="title-row">
        <span class="video-title">{{ videoInfo.title }}</span>
      </div>

      <!-- 统计数据 -->
      <div class="stats-row">
        <div class="stats-left">
          <div v-if="videoInfo.views" class="stat-item">
            <svg fill="none" viewBox="0 0 24 24">
              <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" stroke="currentColor" stroke-width="2"/>
              <path
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  stroke="currentColor" stroke-width="2"/>
            </svg>
            <span>{{ videoInfo.views }}</span>
          </div>
          <div v-if="videoInfo.danmaku" class="stat-item">
            <svg fill="none" viewBox="0 0 24 24">
              <path
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
            </svg>
            <span>{{ videoInfo.danmaku }}</span>
          </div>
          <div v-if="videoInfo.likes" class="stat-item">
            <svg fill="none" viewBox="0 0 24 24">
              <path
                  d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3"
                  stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
            </svg>
            <span>{{ videoInfo.likes }}</span>
          </div>
          <div v-if="videoInfo.coin" class="stat-item">
            <svg fill="none" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
              <path d="M12 6v12M9 9h6M9 15h6" stroke="currentColor" stroke-linecap="round" stroke-width="2"/>
            </svg>
            <span>{{ videoInfo.coin }}</span>
          </div>
          <div v-if="videoInfo.comments" class="stat-item">
            <svg fill="none" viewBox="0 0 24 24">
              <path
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
            </svg>
            <span>{{ videoInfo.comments }}</span>
          </div>
          <div v-if="videoInfo.favorite || videoInfo.collects" class="stat-item">
            <svg fill="none" viewBox="0 0 24 24">
              <path
                  d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                  stroke="currentColor" stroke-width="2"/>
            </svg>
            <span>{{ videoInfo.favorite || videoInfo.collects }}</span>
          </div>
          <div v-if="videoInfo.share || videoInfo.shares" class="stat-item">
            <svg fill="none" viewBox="0 0 24 24">
              <path
                  d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                  stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
            </svg>
            <span>{{ videoInfo.share || videoInfo.shares }}</span>
          </div>
        </div>
        <!-- 右侧：时长、分辨率、发布时间 -->
        <div class="stats-right">
          <span v-if="videoInfo.durationRaw" class="meta-item">
            <svg fill="none" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
              <path d="M12 6v6l4 2" stroke="currentColor" stroke-linecap="round" stroke-width="2"/>
            </svg>
            <span>{{ formatDuration(videoInfo.durationRaw) }}</span>
          </span>
          <span v-if="videoInfo.dimensionStr" class="meta-item">
            <svg fill="none" viewBox="0 0 24 24">
              <rect height="14" rx="2" stroke="currentColor" stroke-width="2" width="20" x="2" y="3"/>
              <path d="M8 21h8M12 17v4" stroke="currentColor" stroke-linecap="round" stroke-width="2"/>
            </svg>
            <span>{{ videoInfo.dimensionStr }}</span>
          </span>
          <span v-if="videoInfo.pubdate" class="meta-item">
            <svg fill="none" viewBox="0 0 24 24">
              <rect height="18" rx="2" stroke="currentColor" stroke-width="2" width="18" x="3" y="4"/>
              <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" stroke-linecap="round" stroke-width="2"/>
            </svg>
            <span>{{ videoInfo.pubdate }}</span>
          </span>
        </div>
      </div>

      <!-- 视频简介 -->
      <div v-if="videoInfo.desc" class="video-desc">{{ videoInfo.desc }}</div>

      <!-- 底部：作者 + 下载 -->
      <div class="bottom-row">
        <div class="author-box">
          <img :src="videoInfo.author?.avatar" alt="头像" class="author-avatar"/>
          <div class="author-info">
            <span class="author-label">{{ videoInfo.author?.name || '未知作者' }}</span>
            <span v-if="videoInfo.author?.id" class="author-id">ID: {{ videoInfo.author.id }}</span>
          </div>
        </div>

        <div class="download-box">
          <CustomSelect
              :modelValue="selectedQuality"
              :options="qualityOptions"
              class="quality-select"
              placeholder="选择清晰度"
              @update:modelValue="handleQualityChange"
          />
          <button
              :class="{ downloading: isDownloading }"
              :disabled="isDownloading"
              :style="isDownloading ? { '--progress': downloadProgress + '%' } : {}"
              class="download-button"
              @click="handleDownload"
          >
            <svg v-if="!isDownloading" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <rect height="16" rx="2" stroke="currentColor" stroke-width="2" width="20" x="2" y="4"/>
              <path d="M2 8h20M2 16h20M6 4v4M6 16v4M18 4v4M18 16v4" stroke="currentColor" stroke-linecap="round"
                    stroke-width="2"/>
            </svg>
            <svg v-else class="spin" fill="none" viewBox="0 0 24 24">
              <circle cx="12" cy="12" opacity="0.3" r="10" stroke="currentColor" stroke-width="2"/>
              <path d="M12 2a10 10 0 0110 10" stroke="currentColor" stroke-linecap="round" stroke-width="2"/>
            </svg>
            <span class="download-text">{{ isDownloading ? downloadProgress + '%' : '下载' }}</span>
          </button>
          <button class="open-folder-btn" title="打开下载文件夹" @click="openDownloadDir">
            <svg fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2v11z" stroke="currentColor"
                    stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
              <path d="M12 11v6M9 14l3-3 3 3" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"
                    stroke-width="2"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.result-area {
  display: flex;
  gap: 16px;
  padding: 16px;
  background: var(--bg-secondary);
  border-radius: 16px;
  border: 1px solid var(--border-primary);
  transition: background-color 0.3s ease, border-color 0.3s ease;
}

.cover-box {
  width: 180px;
  height: 180px;
  flex-shrink: 0;
  background: var(--bg-primary);
  border-radius: 8px;
  overflow: hidden;
}

.cover-box img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.info-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}

.video-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.stats-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.stats-left {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: center;
}

.stats-right {
  display: flex;
  gap: 12px;
  align-items: center;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--text-secondary);
  font-size: 13px;
}

.stat-item svg {
  width: 16px;
  height: 16px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--text-tertiary);
  font-size: 12px;
}

.meta-item svg {
  width: 14px;
  height: 14px;
}

.video-desc {
  font-size: 13px;
  color: var(--text-tertiary);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.bottom-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: auto;
  padding-top: 12px;
  border-top: 1px solid var(--border-primary);
}

.author-box {
  display: flex;
  align-items: center;
  gap: 8px;
}

.author-avatar {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  object-fit: cover;
}

.author-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.author-label {
  font-size: 13px;
  color: var(--text-primary);
}

.author-id {
  font-size: 11px;
  color: var(--text-tertiary);
}

.download-box {
  display: flex;
  align-items: center;
  gap: 12px;
}

.quality-select {
  width: 220px;
}

.download-button {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-width: 100px;
  padding: 10px 24px;
  background: var(--accent-color);
  border: none;
  border-radius: 6px;
  color: #ffffff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-normal) var(--easing-ease);
  overflow: hidden;
}

.download-button svg {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  position: relative;
  z-index: 2;
}

.download-button svg.spin {
  animation: spin var(--animation-spin, 1000ms) linear infinite;
}

.download-button .download-text {
  position: relative;
  z-index: 2;
}

.download-button.downloading {
  background: var(--bg-tertiary);
  cursor: not-allowed;
}

.download-button.downloading::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  width: var(--progress);
  background: linear-gradient(90deg, var(--accent-color) 0%, var(--accent-hover) 100%);
  transition: width 0.3s ease-out;
  z-index: 1;
}

.download-button:hover:not(:disabled) {
  background: var(--accent-hover);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(74, 158, 255, 0.3);
}

.download-button:disabled:not(.downloading) {
  opacity: 0.6;
  cursor: not-allowed;
}

.open-folder-btn {
  width: 38px;
  height: 38px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-primary);
  border-radius: 6px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast, 200ms) var(--easing-ease, ease);
  flex-shrink: 0;
}

.open-folder-btn svg {
  width: 18px;
  height: 18px;
}

.open-folder-btn:hover {
  background: var(--accent-color);
  border-color: var(--accent-color);
  color: #ffffff;
  transform: translateY(-1px);
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

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
      <AudioPlayer
          v-else
          :src="audioUrl"
          :show-time-before-progress="true"
      />
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
import {ref, onMounted, onUnmounted, watch} from 'vue';
import {readFile} from '@tauri-apps/plugin-fs';
import {AudioPlayer} from '@/components/common';
import {checkAudioExists, getAudioAbsolutePath} from '@/services/storage/localAudioStorage';

const props = defineProps({
  taskInfo: {
    type: Object,
    required: true
  }
});

const audioExists = ref(true);
const audioUrl = ref('');

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

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="visible" class="modal-overlay" @click.self="handleClose">
        <div class="modal-container">
          <!-- 标题栏 -->
          <div class="modal-header">
            <h3 class="modal-title">创建音频识别任务</h3>
            <button class="close-btn" @click="handleClose">
              <svg fill="none" viewBox="0 0 24 24">
                <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" stroke-linecap="round" stroke-width="2"/>
              </svg>
            </button>
          </div>

          <!-- 内容区 -->
          <div class="modal-body">
            <!-- 文件选择区 -->
            <div class="file-section">
              <div 
                class="file-drop-zone" 
                :class="{ 'has-file': selectedFile, 'dragging': isDragging }"
                @click="handleSelectFile"
                @dragover.prevent="isDragging = true"
                @dragleave="isDragging = false"
                @drop.prevent="handleDrop"
              >
                <template v-if="!selectedFile">
                  <svg class="upload-icon" fill="none" viewBox="0 0 24 24">
                    <path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
                  </svg>
                  <p class="drop-text">点击选择或拖拽音频/视频文件</p>
                  <p class="drop-hint">支持 mp3, wav, m4a, mp4, mkv 等格式</p>
                </template>
                <template v-else>
                  <div class="file-info">
                    <svg class="file-icon" fill="none" viewBox="0 0 24 24">
                      <path d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
                    </svg>
                    <div class="file-details">
                      <span class="file-name">{{ selectedFile.name }}</span>
                      <span class="file-size">{{ formatFileSize(selectedFile.size) }}</span>
                    </div>
                    <button class="remove-file-btn" @click.stop="clearFile">
                      <svg fill="none" viewBox="0 0 24 24">
                        <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" stroke-linecap="round" stroke-width="2"/>
                      </svg>
                    </button>
                  </div>
                </template>
              </div>

              <!-- 文件类型提示 -->
              <div v-if="fileType === 'video'" class="file-type-hint">
                <svg fill="none" viewBox="0 0 24 24">
                  <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
                </svg>
                <span>视频文件将自动提取音频进行识别</span>
              </div>

              <!-- 音频预览 -->
              <div v-if="audioPreviewUrl" class="audio-preview">
                <label class="preview-label">音频预览</label>
                <AudioPlayer 
                    :src="audioPreviewUrl" 
                    :show-time-before-progress="true"
                    class="custom-audio-player"
                />
              </div>
            </div>

            <!-- 提取音频进度 -->
            <div v-if="isExtracting" class="extract-progress">
              <div class="progress-header">
                <span>正在提取音频...</span>
                <span>{{ extractProgress }}%</span>
              </div>
              <div class="progress-bar">
                <div class="progress-fill" :style="{ width: extractProgress + '%' }"></div>
              </div>
            </div>
          </div>

          <!-- 底部按钮 -->
          <div class="modal-footer">
            <button class="btn btn-cancel" @click="handleClose">取消</button>
            <button 
              class="btn btn-primary" 
              :disabled="!canSubmit || isExtracting"
              @click="handleSubmit"
            >
              {{ isExtracting ? '处理中...' : '添加任务' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, onUnmounted } from 'vue';
import { open } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { readFile } from '@tauri-apps/plugin-fs';
import { getCurrentWebview } from '@tauri-apps/api/webview';
import { useTaskQueueStore, TASK_TYPE } from '@/stores';
import { AudioPlayer } from '@/components/common';
import { copyAudioToAppData, detectFileType, getSupportedExtensions } from '@/services/storage/localAudioStorage';

const props = defineProps({
  visible: Boolean
});

const emit = defineEmits(['update:visible']);

const taskQueueStore = useTaskQueueStore();

// 状态
const selectedFile = ref(null);
const filePath = ref('');
const fileType = ref(''); // audio / video
const audioPreviewUrl = ref('');
const isDragging = ref(false);
const isExtracting = ref(false);
const extractProgress = ref(0);
const extractedAudioPath = ref(''); // 视频提取后的音频路径

// 计算属性
const canSubmit = computed(() => {
  return selectedFile.value && (fileType.value === 'audio' || extractedAudioPath.value);
});

// 拖拽事件取消函数
const unlistenDragDrop = ref(null);

// 监听弹窗显示状态，启用/禁用拖拽事件监听
watch(() => props.visible, async (newVal) => {
  if (newVal) {
    // 弹窗打开时，启用拖拽事件监听
    setupDragDropListener();
  } else {
    // 弹窗关闭时，移除拖拽事件监听并重置状态
    if (unlistenDragDrop.value) {
      unlistenDragDrop.value();
      unlistenDragDrop.value = null;
    }
    resetState();
  }
});

// 设置 Tauri 拖拽事件监听
const setupDragDropListener = async () => {
  try {
    const webview = getCurrentWebview();
    unlistenDragDrop.value = await webview.onDragDropEvent(async (event) => {
      if (!props.visible) return; // 确保弹窗是打开状态
      
      if (event.payload.type === 'over') {
        isDragging.value = true;
      } else if (event.payload.type === 'leave') {
        isDragging.value = false;
      } else if (event.payload.type === 'drop') {
        isDragging.value = false;
        const paths = event.payload.paths;
        if (paths && paths.length > 0 && !selectedFile.value) {
          const path = paths[0];
          const ext = path.split('.').pop().toLowerCase();
          const supportedExts = getSupportedExtensions();
          if (supportedExts.includes(ext)) {
            await processSelectedFile(path);
          }
        }
      }
    });
  } catch (e) {
    console.warn('设置拖拽事件监听失败:', e);
  }
};

// 重置状态
const resetState = () => {
  // 释放之前的 blob URL
  if (audioPreviewUrl.value && audioPreviewUrl.value.startsWith('blob:')) {
    URL.revokeObjectURL(audioPreviewUrl.value);
  }
  selectedFile.value = null;
  filePath.value = '';
  fileType.value = '';
  audioPreviewUrl.value = '';
  isDragging.value = false;
  isExtracting.value = false;
  extractProgress.value = 0;
  extractedAudioPath.value = '';
};

// 组件卸载时清理 blob URL 和拖拽事件监听
onUnmounted(() => {
  if (audioPreviewUrl.value && audioPreviewUrl.value.startsWith('blob:')) {
    URL.revokeObjectURL(audioPreviewUrl.value);
  }
  if (unlistenDragDrop.value) {
    unlistenDragDrop.value();
    unlistenDragDrop.value = null;
  }
});

// 从文件路径创建 blob URL 用于预览
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
    const blob = new Blob([data], { type: mimeType });
    return URL.createObjectURL(blob);
  } catch (e) {
    console.error('创建音频预览失败:', e);
    return '';
  }
};

// 关闭弹窗
const handleClose = () => {
  emit('update:visible', false);
};

// 选择文件
const handleSelectFile = async () => {
  if (selectedFile.value) return;
  
  try {
    const extensions = getSupportedExtensions();
    const result = await open({
      multiple: false,
      filters: [{
        name: '音频/视频文件',
        extensions
      }]
    });
    
    if (result) {
      await processSelectedFile(result);
    }
  } catch (error) {
    console.error('选择文件失败:', error);
  }
};

// 处理拖拽（保留 DOM 事件作为备用，实际由 Tauri 事件处理）
const handleDrop = async (e) => {
  // Tauri 2 使用 onDragDropEvent 处理，此处仅保留事件绑定形式
  isDragging.value = false;
};

// 处理选择的文件
const processSelectedFile = async (path) => {
  filePath.value = path;
  const fileName = path.split(/[/\\]/).pop();
  
  // 获取文件大小
  let fileSize = 0;
  try {
    const stat = await invoke('get_file_stat', { path });
    fileSize = stat.size;
  } catch (e) {
    console.warn('获取文件大小失败:', e);
  }
  
  selectedFile.value = {
    name: fileName,
    size: fileSize,
    path
  };
  
  // 检测文件类型
  fileType.value = detectFileType(fileName);
  
  if (fileType.value === 'audio') {
    // 音频文件直接预览
    audioPreviewUrl.value = await createBlobUrlFromPath(path);
  } else if (fileType.value === 'video') {
    // 视频文件需要提取音频
    await extractAudioFromVideo(path);
  }
};

// 从视频提取音频
const extractAudioFromVideo = async (videoPath) => {
  isExtracting.value = true;
  extractProgress.value = 0;
  
  // 监听提取进度
  const unlisten = await listen('extract-audio-progress', (event) => {
    extractProgress.value = Math.round(event.payload.progress * 100);
  });
  
  try {
    const result = await invoke('extract_audio', { videoPath });
    extractedAudioPath.value = result.audio_path;
    audioPreviewUrl.value = await createBlobUrlFromPath(result.audio_path);
    extractProgress.value = 100;
  } catch (error) {
    console.error('提取音频失败:', error);
    alert('提取音频失败: ' + error);
    clearFile();
  } finally {
    unlisten();
    isExtracting.value = false;
  }
};

// 格式化文件大小
const formatFileSize = (bytes) => {
  if (!bytes) return '未知大小';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

// 清除文件
const clearFile = () => {
  selectedFile.value = null;
  filePath.value = '';
  fileType.value = '';
  audioPreviewUrl.value = '';
  extractedAudioPath.value = '';
};

// 提交任务
const handleSubmit = async () => {
  if (!canSubmit.value || isExtracting.value) return;
  
  try {
    // 确定要处理的音频路径
    const audioPath = fileType.value === 'video' ? extractedAudioPath.value : filePath.value;
    
    // 复制音频文件到应用数据目录
    const { relativePath } = await copyAudioToAppData(audioPath, selectedFile.value.name);
    
    // 生成任务标题
    const taskTitle = selectedFile.value.name.replace(/\.[^.]+$/, '');
    
    // 添加到任务队列
    taskQueueStore.addTask({
      type: TASK_TYPE.EXTRACT,
      title: taskTitle,
      cover: '',
      platform: 'local',
      data: {
        isLocal: true,
        localType: 'audio',
        localAudioPath: relativePath,
        localSourceType: fileType.value,
        originalFileName: selectedFile.value.name
      }
    });
    
    // 关闭弹窗
    handleClose();
  } catch (error) {
    console.error('创建任务失败:', error);
    alert('创建任务失败: ' + error);
  }
};
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-container {
  width: 480px;
  max-width: 90vw;
  max-height: 90vh;
  background: var(--bg-primary);
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-primary);
}

.modal-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.close-btn {
  width: 32px;
  height: 32px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 8px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.close-btn svg {
  width: 20px;
  height: 20px;
}

.close-btn:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.modal-body {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
}

.file-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.file-drop-zone {
  border: 2px dashed var(--border-secondary);
  border-radius: 12px;
  padding: 40px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.file-drop-zone:hover,
.file-drop-zone.dragging {
  border-color: var(--accent-color);
  background: var(--bg-secondary);
}

.file-drop-zone.has-file {
  border-style: solid;
  padding: 16px;
  cursor: default;
}

.upload-icon {
  width: 48px;
  height: 48px;
  color: var(--text-tertiary);
}

.drop-text {
  font-size: 15px;
  color: var(--text-primary);
  margin: 0;
}

.drop-hint {
  font-size: 13px;
  color: var(--text-tertiary);
  margin: 0;
}

.file-info {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
}

.file-icon {
  width: 40px;
  height: 40px;
  color: var(--accent-color);
  flex-shrink: 0;
}

.file-details {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.file-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-size {
  font-size: 12px;
  color: var(--text-tertiary);
}

.remove-file-btn {
  width: 28px;
  height: 28px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 6px;
  color: var(--text-tertiary);
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.remove-file-btn svg {
  width: 16px;
  height: 16px;
}

.remove-file-btn:hover {
  background: var(--bg-tertiary);
  color: #e74c3c;
}

.file-type-hint {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: var(--bg-secondary);
  border-radius: 8px;
  font-size: 13px;
  color: var(--text-secondary);
}

.file-type-hint svg {
  width: 16px;
  height: 16px;
  color: var(--accent-color);
  flex-shrink: 0;
}

.audio-preview {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.preview-label {
  font-size: 13px;
  color: var(--text-secondary);
}

.custom-audio-player {
  padding: 8px 12px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: 8px;
}

.extract-progress {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px;
  background: var(--bg-secondary);
  border-radius: 10px;
  margin-top: 16px;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: var(--text-secondary);
}

.progress-bar {
  height: 6px;
  background: var(--bg-tertiary);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--accent-color);
  border-radius: 3px;
  transition: width 0.3s ease;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid var(--border-primary);
}

.btn {
  height: 40px;
  padding: 0 20px;
  font-size: 14px;
  font-weight: 500;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-cancel {
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  color: var(--text-primary);
}

.btn-cancel:hover {
  background: var(--bg-tertiary);
}

.btn-primary {
  background: var(--accent-color);
  border: none;
  color: #ffffff;
}

.btn-primary:hover:not(:disabled) {
  background: var(--accent-hover);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 弹窗动画 */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-active .modal-container,
.modal-leave-active .modal-container {
  transition: transform 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-container,
.modal-leave-to .modal-container {
  transform: scale(0.95);
}
</style>

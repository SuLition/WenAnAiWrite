<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="visible" class="modal-overlay" @click.self="handleClose">
        <div class="modal-container">
          <!-- 标题栏 -->
          <div class="modal-header">
            <h3 class="modal-title">创建文案改写任务</h3>
            <button class="close-btn" @click="handleClose">
              <svg fill="none" viewBox="0 0 24 24">
                <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" stroke-linecap="round" stroke-width="2"/>
              </svg>
            </button>
          </div>

          <!-- 内容区 -->
          <div class="modal-body">
            <!-- 文案输入 -->
            <div class="form-group">
              <label class="form-label">原始文案</label>
              <textarea 
                v-model="originalText" 
                class="text-input" 
                placeholder="请输入需要改写的文案内容..."
                rows="6"
              ></textarea>
              <span class="char-count">{{ originalText.length }} 字</span>
            </div>

            <!-- 任务标题 -->
            <div class="form-group">
              <label class="form-label">任务标题（可选）</label>
              <input 
                v-model="taskTitle" 
                type="text" 
                class="title-input" 
                placeholder="不填则自动生成"
              />
            </div>

            <!-- 模型和风格选择（同一行） -->
            <div class="form-row">
              <div class="form-group flex-1">
                <label class="form-label">AI模型</label>
                <CustomSelect
                    v-model="selectedModel"
                    :options="AI_MODELS"
                    class="select-full"
                />
              </div>
              <div class="form-group flex-1">
                <label class="form-label">改写风格</label>
                <CustomSelect
                    v-model="selectedStyle"
                    :options="REWRITE_STYLES"
                    class="select-full"
                    @change="onStyleChange"
                />
              </div>
            </div>

            <!-- 提示词 -->
            <div class="form-group prompt-group">
              <label class="form-label">提示词</label>
              <textarea 
                v-model="customPrompt" 
                class="prompt-input" 
                placeholder="输入自定义提示词..."
                rows="4"
              ></textarea>
            </div>
          </div>

          <!-- 底部按钮 -->
          <div class="modal-footer">
            <button class="btn btn-cancel" @click="handleClose">取消</button>
            <button 
              class="btn btn-primary" 
              :disabled="!canSubmit"
              @click="handleSubmit"
            >
              添加任务
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useTaskQueueStore, TASK_TYPE } from '@/stores';
import CustomSelect from '@/components/common/CustomSelect.vue';
import { AI_MODELS, REWRITE_STYLES, DEFAULT_PROMPTS } from '@/constants/options.js';

const props = defineProps({
  visible: Boolean
});

const emit = defineEmits(['update:visible']);

const taskQueueStore = useTaskQueueStore();

// 表单数据
const originalText = ref('');
const taskTitle = ref('');
const selectedModel = ref('doubao');
const selectedStyle = ref('professional');
const customPrompt = ref(DEFAULT_PROMPTS['professional'] || '');

// 计算属性
const canSubmit = computed(() => {
  return originalText.value.trim().length > 0;
});

// 监听弹窗关闭
watch(() => props.visible, (newVal) => {
  if (!newVal) {
    resetState();
  }
});

// 重置状态
const resetState = () => {
  originalText.value = '';
  taskTitle.value = '';
  selectedModel.value = 'doubao';
  selectedStyle.value = 'professional';
  customPrompt.value = DEFAULT_PROMPTS['professional'] || '';
};

// 风格变化时更新提示词
const onStyleChange = (newStyle) => {
  customPrompt.value = DEFAULT_PROMPTS[newStyle] || '';
};

// 关闭弹窗
const handleClose = () => {
  emit('update:visible', false);
};

// 生成任务标题
const generateTitle = () => {
  if (taskTitle.value.trim()) {
    return taskTitle.value.trim();
  }
  // 从文案内容截取前20个字符
  const text = originalText.value.trim();
  if (text.length <= 20) {
    return text;
  }
  return text.substring(0, 20) + '...';
};

// 提交任务
const handleSubmit = async () => {
  if (!canSubmit.value) return;
  
  const title = generateTitle();
  
  // 添加到任务队列
  taskQueueStore.addTask({
    type: TASK_TYPE.REWRITE,
    title: title,
    cover: '',
    platform: 'local',
    data: {
      isLocal: true,
      localType: 'text',
      originalText: originalText.value.trim(),
      model: selectedModel.value,
      style: selectedStyle.value,
      customPrompt: customPrompt.value.trim()
    }
  });
  
  // 关闭弹窗
  handleClose();
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
  width: 520px;
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
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  position: relative;
}

.form-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 8px;
}

.label-hint {
  font-size: 12px;
  font-weight: 400;
  color: var(--text-tertiary);
}

.text-input,
.prompt-input {
  width: 100%;
  padding: 12px 14px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: 10px;
  font-size: 14px;
  color: var(--text-primary);
  resize: none;
  transition: all 0.2s ease;
  font-family: inherit;
}

.text-input:focus,
.prompt-input:focus {
  outline: none;
  border-color: var(--accent-color);
}

.char-count {
  position: absolute;
  right: 12px;
  bottom: 12px;
  font-size: 12px;
  color: var(--text-tertiary);
  pointer-events: none;
}

.title-input {
  width: 100%;
  height: 42px;
  padding: 0 14px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: 10px;
  font-size: 14px;
  color: var(--text-primary);
  transition: all 0.2s ease;
}

.title-input:focus {
  outline: none;
  border-color: var(--accent-color);
}

.form-row {
  display: flex;
  gap: 12px;
}

.flex-1 {
  flex: 1;
}

.select-full {
  width: 100%;
}

.prompt-group {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.prompt-group .prompt-input {
  flex: 1;
  min-height: 80px;
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

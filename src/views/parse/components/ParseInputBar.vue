<script setup>
import {PLATFORMS} from '@/constants/options.js';
import CustomSelect from '@/components/common/CustomSelect.vue';

const props = defineProps({
  videoUrl: {
    type: String,
    default: ''
  },
  platform: {
    type: String,
    default: 'auto'
  },
  isParsing: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['update:videoUrl', 'update:platform', 'parse', 'clear']);

const handleUrlInput = (e) => {
  emit('update:videoUrl', e.target.value);
  // 输入新内容时自动切换回自动检测
  emit('update:platform', 'auto');
};

const handlePlatformChange = (value) => {
  emit('update:platform', value);
};

const handleParse = () => {
  emit('parse');
};

const handleClear = () => {
  emit('update:platform', 'auto');
  emit('clear');
};
</script>

<template>
  <div class="top-input-bar">
    <CustomSelect
        :modelValue="platform"
        :options="PLATFORMS"
        class="platform-select"
        @update:modelValue="handlePlatformChange"
    />

    <div class="url-input-wrapper">
      <input
          :value="videoUrl"
          class="url-input"
          placeholder="请输入视频链接，支持自动识别平台"
          type="text"
          @input="handleUrlInput"
          @keyup.enter="handleParse"
      />
      <button v-if="videoUrl" class="clear-btn" title="清空" @click="handleClear">
        <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path d="M18 6L6 18M6 6l12 12" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
    </div>

    <button :disabled="isParsing" class="parse-button" @click="handleParse">
      <svg v-if="!isParsing" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" stroke="currentColor"
              stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
        <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" stroke="currentColor"
              stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
      </svg>
      <svg v-else class="spin" fill="none" viewBox="0 0 24 24">
        <circle cx="12" cy="12" opacity="0.3" r="10" stroke="currentColor" stroke-width="2"/>
        <path d="M12 2a10 10 0 0110 10" stroke="currentColor" stroke-linecap="round" stroke-width="2"/>
      </svg>
      <span>{{ isParsing ? '解析中...' : '解析' }}</span>
    </button>
  </div>
</template>

<style scoped>
.top-input-bar {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 16px;
  background: var(--bg-secondary);
  border-radius: 8px;
  border: 1px solid var(--border-primary);
  transition: background-color 0.3s ease, border-color 0.3s ease;
}

.platform-select {
  width: 140px !important;
}

.url-input-wrapper {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
}

.url-input {
  width: 100%;
  padding: 10px 36px 10px 16px;
  background: var(--bg-primary);
  border: 1px solid var(--border-primary);
  border-radius: 6px;
  color: var(--text-primary);
  font-size: 14px;
  outline: none;
  transition: all var(--transition-normal) var(--easing-ease);
}

.url-input:focus {
  border-color: var(--accent-color);
  box-shadow: 0 0 0 3px var(--accent-light);
}

.url-input::placeholder {
  color: var(--text-placeholder);
}

.clear-btn {
  position: absolute;
  right: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  padding: 0;
  background: transparent;
  border: none;
  border-radius: 4px;
  color: var(--text-tertiary);
  cursor: pointer;
  transition: all var(--transition-fast, 200ms) var(--easing-ease, ease);
}

.clear-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.clear-btn svg {
  width: 14px;
  height: 14px;
}

.parse-button {
  display: flex;
  align-items: center;
  justify-content: space-between;
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
}

.parse-button svg {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.parse-button svg.spin {
  animation: spin var(--animation-spin, 1000ms) linear infinite;
}

.parse-button:hover:not(:disabled) {
  background: var(--accent-hover);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(74, 158, 255, 0.3);
}

.parse-button:disabled {
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

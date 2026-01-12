<template>
  <div ref="selectRef" :class="{ open: isOpen, disabled: disabled }" class="custom-select">
    <div class="select-trigger" @click="toggle">
      <span :class="{ placeholder: !modelValue }" class="select-value">
        <span v-if="selectedOption?.icon" class="option-icon" v-html="selectedOption.icon"></span>
        {{ displayValue }}
      </span>
      <svg class="select-arrow" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M6 9L12 15L18 9" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"
              stroke-width="2"/>
      </svg>
    </div>

    <AnimatePresence>
      <Motion
        v-if="isOpen"
        :initial="currentDropdownAnimation.initial"
        :animate="currentDropdownAnimation.animate"
        :exit="currentDropdownAnimation.exit"
        :transition="currentDropdownAnimation.transition"
        as="div"
        class="select-dropdown"
      >
        <div class="select-options">
          <div
              v-for="option in options"
              :key="option.value"
              :class="{
              selected: option.value === modelValue,
              disabled: option.disabled
            }"
              class="select-option"
              @click="selectOption(option)"
          >
            <span v-if="option.icon" class="option-icon" v-html="option.icon"></span>
            {{ option.label }}
          </div>
        </div>
      </Motion>
    </AnimatePresence>
  </div>
</template>

<script setup>
import {ref, computed, onMounted, onUnmounted} from 'vue';
import {Motion, AnimatePresence} from 'motion-v';
import {getDropdownAnimation} from '@/constants/motionAnimations';
import {useConfigStore} from '@/stores';

const props = defineProps({
  modelValue: {
    type: [String, Number, null],
    default: null
  },
  options: {
    type: Array,
    required: true,
    // [{ value: '', label: '', disabled?: boolean }]
  },
  placeholder: {
    type: String,
    default: '请选择'
  },
  disabled: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['update:modelValue', 'change']);

const isOpen = ref(false);
const selectRef = ref(null);

const displayValue = computed(() => {
  if (props.modelValue === null || props.modelValue === undefined || props.modelValue === '') {
    return props.placeholder;
  }
  const selected = props.options.find(opt => opt.value === props.modelValue);
  return selected ? selected.label : props.placeholder;
});

const selectedOption = computed(() => {
  return props.options.find(opt => opt.value === props.modelValue);
});

// 动画速率
const configStore = useConfigStore();
const animationSpeed = computed(() => configStore.appearance.animationSpeed || 'normal');
const currentDropdownAnimation = computed(() => getDropdownAnimation(animationSpeed.value));

const toggle = () => {
  if (props.disabled) return;
  isOpen.value = !isOpen.value;
};

const selectOption = (option) => {
  if (option.disabled) return;
  emit('update:modelValue', option.value);
  emit('change', option.value);
  isOpen.value = false;
};

const handleClickOutside = (e) => {
  if (selectRef.value && !selectRef.value.contains(e.target)) {
    isOpen.value = false;
  }
};

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>

<style scoped>
.custom-select {
  position: relative;
  width: 100%;
  font-size: 14px;
  user-select: none;
}

.select-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  background: var(--bg-primary);
  border: 1px solid var(--border-primary);
  border-radius: 12px;
  cursor: pointer;
  transition: all var(--transition-fast, 200ms) var(--easing-ease, ease);
  min-height: 40px;
}

.custom-select:hover .select-trigger {
  border-color: var(--accent-color);
}

.custom-select.open .select-trigger {
  border-color: var(--accent-color);
  box-shadow: 0 0 0 2px var(--accent-light);
}

.custom-select.disabled .select-trigger {
  opacity: 0.5;
  cursor: not-allowed;
}

.custom-select.disabled:hover .select-trigger {
  border-color: var(--border-primary);
}

.select-value {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.select-value.placeholder {
  color: var(--text-placeholder);
}

.select-arrow {
  width: 16px;
  height: 16px;
  color: var(--text-secondary);
  flex-shrink: 0;
  margin-left: 8px;
  transition: transform var(--transition-fast, 200ms) var(--easing-ease, ease);
}

.custom-select.open .select-arrow {
  transform: rotate(180deg);
}

.select-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  z-index: 9999;
  overflow: hidden;
}

.select-options {
  max-height: 280px;
  overflow-y: auto;
  padding: 4px;
}

.select-options::-webkit-scrollbar {
  width: 6px;
}

.select-options::-webkit-scrollbar-track {
  background: transparent;
}

.select-options::-webkit-scrollbar-thumb {
  background: var(--bg-tertiary);
  border-radius: 3px;
}

.select-options::-webkit-scrollbar-thumb:hover {
  background: var(--border-secondary);
}

.select-option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  color: var(--text-secondary);
  cursor: pointer;
  border-radius: 12px;
  transition: all var(--transition-fastest, 150ms) var(--easing-ease, ease);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.option-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.option-icon :deep(svg) {
  width: 16px;
  height: 16px;
}

.select-option:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.select-option.selected {
  background: var(--accent-color);
  color: #ffffff;
}

.select-option.selected:hover {
  background: var(--accent-hover);
}

.select-option.disabled {
  color: var(--text-tertiary);
  cursor: not-allowed;
}

.select-option.disabled:hover {
  background: transparent;
  color: var(--text-tertiary);
}
</style>

<script setup>
import {onMounted, onUnmounted, ref} from "vue";

const isClosing = ref(false)
let unlisten = null

onMounted(async () => {
  // 监听关闭事件
  try {
    const {listen} = await import('@tauri-apps/api/event')
    unlisten = await listen('app-closing', () => {
      isClosing.value = true
    })
  } catch (e) {

  }
})

onUnmounted(() => {
  if (unlisten) unlisten()
})
</script>

<template>
  <div v-if="isClosing" class="closing-overlay">
    <div class="closing-content">
      <div class="closing-spinner"></div>
      <p class="closing-text">正在关闭服务...</p>
    </div>
  </div>
</template>

<style scoped>


/* 关闭提示样式 */
.closing-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 99999;
}

.closing-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.closing-spinner {
  width: 48px;
  height: 48px;
  border: 4px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin var(--animation-spin, 1000ms) linear infinite;
}

.closing-text {
  color: #fff;
  font-size: 16px;
  font-weight: 500;
}
</style>
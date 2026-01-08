<script setup>
</script>

<template>
  <div class="empty-state">
    <svg class="empty-icon" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path
          d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
          stroke="currentColor" stroke-width="2"/>
      <path d="M12 8V12L14 14" stroke="currentColor" stroke-linecap="round" stroke-width="2"/>
    </svg>
    <p class="empty-text">输入视频链接并点击解析</p>
  </div>
</template>

<style scoped>
.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
}

.empty-icon {
  width: 80px;
  height: 80px;
  color: var(--text-tertiary);
}

.empty-text {
  font-size: 16px;
  color: var(--text-secondary);
}
</style>

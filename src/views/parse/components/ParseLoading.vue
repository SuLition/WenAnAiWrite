<script setup>
import HamsterLoading from '@/components/common/HamsterLoading.vue';
</script>

<template>
  <div class="parsing-state">
    <HamsterLoading :size="12"/>
    <p class="parsing-hint">全力解析中...</p>
  </div>
</template>

<style scoped>
.parsing-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
}

.parsing-hint {
  font-size: 14px;
  color: var(--text-secondary);
}
</style>

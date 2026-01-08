<script setup>
import {watch, onMounted} from 'vue';
import {useRoute} from 'vue-router';
import {toast} from 'vue-sonner';
import {useVideoParse} from './composables/useVideoParse.js';
import {useHistoryStore} from '@/stores';
import ParseInputBar from './components/ParseInputBar.vue';
import VideoResultCard from './components/VideoResultCard.vue';
import CopywritingPanel from './components/CopywritingPanel.vue';
import ParseEmpty from './components/ParseEmpty.vue';
import ParseLoading from './components/ParseLoading.vue';

const route = useRoute();
const historyStore = useHistoryStore();

const {
  videoUrl,
  platform,
  isParsing,
  videoInfo,
  qualityOptions,
  selectedQuality,
  currentHistoryId,
  isRestoring,
  handleParse,
  clearInput,
  resetState,
  restoreFromHistory
} = useVideoParse();

// 平台切换时重置状态（恢复模式下跳过）
watch(platform, () => {
  if (!isRestoring.value) {
    resetState();
  }
});

// 初始化：检查是否有传入的参数
onMounted(async () => {

  // 优先处理“查看记录”模式（直接恢复已存储的数据）
  if (route.query.historyId) {
    await historyStore.load();

    const historyItem = historyStore.findById(Number(route.query.historyId));

    if (historyItem) {
      const restored = await restoreFromHistory(historyItem);

      if (restored) {
        return;
      }
      // 恢复失败，旧数据不完整，重新解析
      toast.info('历史数据不完整，正在重新解析...');
      videoUrl.value = historyItem.originalUrl || '';
      platform.value = historyItem.platform || 'auto';
      await handleParse();
      return;
    } else {
      console.log('[ParsePage] 未找到匹配的历史记录');
    }
  }

  // 处理“重新解析”模式（传入 url 重新发起解析）
  if (route.query.url) {
    videoUrl.value = route.query.url;
    if (route.query.platform) {
      platform.value = route.query.platform;
    }
    await handleParse();
  }
});
</script>

<template>
  <div class="parse-page">
    <!-- 顶部输入区 -->
    <ParseInputBar
        v-model:platform="platform"
        v-model:videoUrl="videoUrl"
        :isParsing="isParsing"
        @clear="clearInput"
        @parse="handleParse"
    />

    <!-- 解析结果 -->
    <VideoResultCard
        v-if="videoInfo"
        v-model:selectedQuality="selectedQuality"
        :qualityOptions="qualityOptions"
        :videoInfo="videoInfo"
    />

    <!-- 文案模块 -->
    <CopywritingPanel
        v-if="videoInfo"
        :currentHistoryId="currentHistoryId"
        :videoInfo="videoInfo"
    />

    <!-- 解析中状态 -->
    <ParseLoading v-if="isParsing && !videoInfo"/>

    <!-- 空状态 -->
    <ParseEmpty v-if="!videoInfo && !isParsing"/>
  </div>
</template>

<style scoped>
.parse-page {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 20px;
  gap: 16px;
  overflow: hidden;
}
</style>

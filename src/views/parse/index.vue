<script setup>
import {watch, onMounted, computed} from 'vue';
import {useRoute} from 'vue-router';
import {toast} from 'vue-sonner';
import {Motion, AnimatePresence} from 'motion-v';
import {useVideoParse} from './composables/useVideoParse.js';
import {useHistoryStore, useConfigStore} from '@/stores';
import {getCardAnimation} from '@/constants/motionAnimations';
import ParseInputBar from './components/ParseInputBar.vue';
import VideoResultCard from './components/VideoResultCard.vue';
import LocalTaskCard from './components/LocalTaskCard.vue';
import CopywritingPanel from './components/CopywritingPanel.vue';
import ParseEmpty from './components/ParseEmpty.vue';
import ParseLoading from './components/ParseLoading.vue';

const route = useRoute();
const historyStore = useHistoryStore();
const configStore = useConfigStore();

// 卡片动画配置
const currentAnimation = computed(() => {
  const anim = configStore.appearance.cardAnimation || 'fade';
  return getCardAnimation(anim);
});

const {
  videoUrl,
  platform,
  isParsing,
  videoInfo,
  qualityOptions,
  selectedQuality,
  currentHistoryId,
  isRestoring,
  isLocalTask,
  localTaskInfo,
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


    <!-- 解析结果（网络视频） -->
    <AnimatePresence mode="wait">
      <Motion
          v-if="videoInfo && !isLocalTask"
          :key="'video-' + currentHistoryId"
          :animate="currentAnimation?.animate"
          :exit="currentAnimation?.exit"
          :initial="currentAnimation?.initial"
          :transition="currentAnimation?.transition"
      >
        <VideoResultCard
            v-model:selectedQuality="selectedQuality"
            :qualityOptions="qualityOptions"
            :videoInfo="videoInfo"
        />
      </Motion>
    </AnimatePresence>

    <!-- 本地任务卡片 -->
    <AnimatePresence mode="wait">
      <Motion
          v-if="isLocalTask && localTaskInfo"
          :key="'local-' + currentHistoryId"
          :animate="currentAnimation?.animate"
          :exit="currentAnimation?.exit"
          :initial="currentAnimation?.initial"
          :transition="currentAnimation?.transition"
      >
        <LocalTaskCard :taskInfo="localTaskInfo"/>
      </Motion>
    </AnimatePresence>

    <!-- 文案模块 -->
    <AnimatePresence mode="wait">
      <Motion
          v-if="videoInfo || (isLocalTask && localTaskInfo)"
          :key="'copy-' + currentHistoryId"
          :animate="currentAnimation?.animate"
          :exit="currentAnimation?.exit"
          :initial="currentAnimation?.initial"
          :transition="{ ...currentAnimation?.transition, delay: 0.1 }"
          :style="{ flex: 3, minHeight: 0, display: 'flex' }"
      >
        <CopywritingPanel
            :currentHistoryId="currentHistoryId"
            :videoInfo="isLocalTask ? null : videoInfo"
            :localTaskInfo="isLocalTask ? localTaskInfo : null"
        />
      </Motion>
    </AnimatePresence>

    <!-- 解析中状态 -->
    <ParseLoading v-if="isParsing && !videoInfo"/>

    <!-- 空状态 -->
    <ParseEmpty v-if="!videoInfo && !isParsing && !isLocalTask"/>
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

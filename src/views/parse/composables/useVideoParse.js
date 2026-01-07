/**
 * 视频解析组合式函数
 */
import { ref } from 'vue';
import { toast } from 'vue-sonner';
import { parseVideo as parseBilibiliVideoApi } from '@/services/api/bilibiliApi.js';
import { parseVideo as parseDouyinVideoApi } from '@/services/api/douyinApi.js';
import { parseVideo as parseXiaohongshuVideoApi } from '@/services/api/xiaohongshuApi.js';
import { useHistoryStore } from '@/stores';
import { extractUrlFromText, detectPlatform } from '@/utils/urlParser.js';
import {
  formatBilibiliData,
  formatDouyinData,
  formatXiaohongshuData,
  formatQualityOptions
} from '../utils/videoDataFormatter.js';

export function useVideoParse() {
  const videoUrl = ref('');
  const platform = ref('auto');
  const isParsing = ref(false);
  const videoInfo = ref(null);
  const qualityOptions = ref([]);
  const selectedQuality = ref('');
  const currentHistoryId = ref(null);
  
  // Store
  const historyStore = useHistoryStore();

  /**
   * 解析B站视频
   */
  const parseBilibiliVideo = async () => {
    const result = await parseBilibiliVideoApi(videoUrl.value);
    const data = result.formatted;
    
    videoInfo.value = formatBilibiliData(data);
    
    if (data.videoStreams && data.videoStreams.length > 0) {
      qualityOptions.value = formatQualityOptions(data.videoStreams);
      selectedQuality.value = qualityOptions.value[0]?.value ?? '';
    }
  };

  /**
   * 解析抖音视频
   */
  const parseDouyinVideo = async () => {
    const data = await parseDouyinVideoApi(videoUrl.value);
    
    videoInfo.value = formatDouyinData(data);
    
    if (data.videoStreams && data.videoStreams.length > 0) {
      qualityOptions.value = formatQualityOptions(data.videoStreams);
      selectedQuality.value = qualityOptions.value[0]?.value ?? '';
    }
  };

  /**
   * 解析小红书视频
   */
  const parseXiaohongshuVideo = async () => {
    const data = await parseXiaohongshuVideoApi(videoUrl.value);
    
    videoInfo.value = formatXiaohongshuData(data);
    
    if (data.videoStreams && data.videoStreams.length > 0) {
      qualityOptions.value = formatQualityOptions(data.videoStreams);
      selectedQuality.value = qualityOptions.value[0]?.value ?? '';
    }
  };

  /**
   * 执行解析
   */
  const handleParse = async () => {
    if (!videoUrl.value.trim()) {
      toast.warning('请输入视频链接');
      return;
    }

    const extractedUrl = extractUrlFromText(videoUrl.value);
    if (extractedUrl !== videoUrl.value) {
      videoUrl.value = extractedUrl;
    }

    // 自动检测平台并切换
    let targetPlatform = platform.value;
    if (platform.value === 'auto') {
      const detected = detectPlatform(videoUrl.value);
      if (!detected) {
        toast.error('无法识别链接平台，请手动选择');
        return;
      }
      targetPlatform = detected;
      platform.value = detected;
    }

    isParsing.value = true;
    videoInfo.value = null;
    currentHistoryId.value = null;

    try {
      if (targetPlatform === 'bilibili') {
        await parseBilibiliVideo();
      } else if (targetPlatform === 'douyin') {
        await parseDouyinVideo();
      } else if (targetPlatform === 'xiaohongshu') {
        await parseXiaohongshuVideo();
      } else {
        throw new Error(`${targetPlatform} 解析功能开发中...`);
      }

      // 保存到历史记录
      if (videoInfo.value) {
        const videoId = videoInfo.value.bvid || videoInfo.value.awemeId || videoInfo.value.noteId || '';
        
        const historyId = await historyStore.add({
          cover: videoInfo.value.cover || '',
          title: videoInfo.value.title || '',
          platform: videoInfo.value.platform || platform.value,
          originalUrl: videoUrl.value,
          originalText: '',
          rewrittenText: '',
          videoId: videoId
        });
        currentHistoryId.value = historyId;
      }

      toast.success('解析成功');
    } catch (error) {
      console.error('解析失败:', error);
      toast.error(`解析失败: ${error.message}`);
    } finally {
      isParsing.value = false;
    }
  };

  /**
   * 清空输入
   */
  const clearInput = () => {
    videoUrl.value = '';
  };

  /**
   * 重置状态
   */
  const resetState = () => {
    videoInfo.value = null;
    qualityOptions.value = [];
    selectedQuality.value = '';
    currentHistoryId.value = null;
  };

  return {
    // 状态
    videoUrl,
    platform,
    isParsing,
    videoInfo,
    qualityOptions,
    selectedQuality,
    currentHistoryId,
    // 方法
    handleParse,
    clearInput,
    resetState
  };
}

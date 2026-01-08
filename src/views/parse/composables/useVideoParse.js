/**
 * 视频解析组合式函数
 */
import {ref, nextTick} from 'vue';
import {toast} from 'vue-sonner';
import {parseVideo as parseBilibiliVideoApi} from '@/services/api/bilibiliApi.js';
import {parseVideo as parseDouyinVideoApi} from '@/services/api/douyinApi.js';
import {parseVideo as parseXiaohongshuVideoApi} from '@/services/api/xiaohongshuApi.js';
import {useHistoryStore} from '@/stores';
import {extractUrlFromText, detectPlatform} from '@/utils/urlParser.js';
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
    const isRestoring = ref(false); // 恢复模式标志，防止 watch 触发 resetState

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

            // 保存到历史记录（包含完整信息用于恢复展示）
            if (videoInfo.value) {
                const videoId = videoInfo.value.bvid || videoInfo.value.awemeId || videoInfo.value.noteId || '';

                const historyId = await historyStore.add({
                    cover: videoInfo.value.cover || '',
                    title: videoInfo.value.title || '',
                    platform: videoInfo.value.platform || platform.value,
                    originalUrl: videoUrl.value,
                    originalText: '',
                    rewrittenText: '',
                    videoId: videoId,
                    // 完整信息用于“查看记录”时恢复
                    videoInfo: JSON.parse(JSON.stringify(videoInfo.value)),
                    qualityOptions: JSON.parse(JSON.stringify(qualityOptions.value)),
                    selectedQuality: selectedQuality.value
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

    /**
     * 从历史记录恢复状态（用于“查看记录”功能）
     */
    const restoreFromHistory = async (historyItem) => {
        console.log('[restoreFromHistory] 开始恢复, historyItem:', historyItem);
        
        if (!historyItem) {
            console.log('[restoreFromHistory] historyItem 为空');
            return false;
        }

        // 进入恢复模式，防止 platform watch 触发 resetState
        isRestoring.value = true;
        console.log('[restoreFromHistory] 进入恢复模式');

        // 恢复基本信息
        videoUrl.value = historyItem.originalUrl || '';
        platform.value = historyItem.platform || 'auto';
        currentHistoryId.value = historyItem.id;
        console.log('[restoreFromHistory] 基本信息已恢复:', { videoUrl: videoUrl.value, platform: platform.value, currentHistoryId: currentHistoryId.value });

        // 恢复完整视频信息
        if (historyItem.videoInfo) {
            console.log('[restoreFromHistory] 有 videoInfo, 正在赋值');
            videoInfo.value = historyItem.videoInfo;
            console.log('[restoreFromHistory] videoInfo.value 已设置:', videoInfo.value);
        } else {
            // 旧数据不完整，直接返回失败
            console.log('[restoreFromHistory] 无 videoInfo, 返回失败');
            isRestoring.value = false;
            return false;
        }

        // 恢复画质选项
        if (historyItem.qualityOptions && historyItem.qualityOptions.length > 0) {
            qualityOptions.value = historyItem.qualityOptions;
            // 确保 selectedQuality 与 qualityOptions 中的值类型一致
            const storedQuality = historyItem.selectedQuality;
            const matchingOption = qualityOptions.value.find(opt => 
                opt.value === storedQuality || String(opt.value) === String(storedQuality)
            );
            selectedQuality.value = matchingOption?.value ?? qualityOptions.value[0]?.value ?? '';
            console.log('[restoreFromHistory] 画质选项已恢复:', qualityOptions.value, '选中:', selectedQuality.value);
        } else {
            qualityOptions.value = [];
            selectedQuality.value = '';
            console.log('[restoreFromHistory] 无画质选项');
        }

        // 退出恢复模式（延迟到下一个 tick，确保 watch 回调已执行）
        await nextTick();
        isRestoring.value = false;
        console.log('[restoreFromHistory] 恢复完成, 最终 videoInfo.value:', videoInfo.value);
        return true;
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
        isRestoring, // 暴露恢复模式标志
        // 方法
        handleParse,
        clearInput,
        resetState,
        restoreFromHistory
    };
}

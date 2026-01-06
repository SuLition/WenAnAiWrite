<script setup>
import {ref, computed, watch, onMounted} from 'vue';
import {toast} from 'vue-sonner';
import {parseVideo as parseBilibiliVideoApi} from '../services/api/bilibiliApi.js';
import {parseVideo as parseDouyinVideoApi} from '../services/api/douyinApi.js';
import {parseVideo as parseXiaohongshuVideoApi} from '../services/api/xiaohongshuApi.js';
import {recognizeAudioWithData} from '../services/tencentAsr.js';
import {rewriteText} from '../services/aiRewrite.js';
import {
  downloadBilibili,
  downloadDouyin,
  downloadXiaohongshu,
  downloadAudioData
} from '../services/download/downloadService.js';
import {isLoggedIn} from '../services/auth/bilibiliAuth.js';
import BilibiliDetail from '../components/platforms/BilibiliDetail.vue';
import DouyinDetail from '../components/platforms/DouyinDetail.vue';
import XiaohongshuDetail from '../components/platforms/XiaohongshuDetail.vue';
import {formatNumber, formatDuration, formatFileSize, formatPubDate} from '../utils/format.js';
import {extractUrlFromText} from '../utils/urlParser.js';
import CustomSelect from '../components/common/CustomSelect.vue';

const videoUrl = ref('');
const platform = ref('bilibili');
const isParsing = ref(false);
const videoInfo = ref(null);
const copyText = ref('');
const copyMode = ref('original'); // 'original' 或 'rewritten'
const aiModel = ref('doubao');
const rewriteStyle = ref('professional');
const customPrompt = ref('');
const isRewriting = ref(false);
const isExtracting = ref(false);
const selectedQuality = ref('');

const platforms = [
  {value: 'bilibili', label: 'B站'},
  {value: 'douyin', label: '抖音'},
  {value: 'kuaishou', label: '快手'},
  {value: 'xiaohongshu', label: '小红书'}
];

const aiModels = [
  {value: 'deepseek', label: 'DeepSeek'},
  {value: 'doubao', label: '豆包'},
  {value: 'qianwen', label: '千问'},
  {value: 'hunyuan', label: '元宝'}
];

const rewriteStyles = [
  {value: 'professional', label: '专业'},
  {value: 'casual', label: '口语化'},
  {value: 'funny', label: '幽默'},
  {value: 'short', label: '精简'}
];

const qualityOptions = ref([]);

// 默认提示词
const defaultPrompts = {
  professional: '请将以下文案改写为专业、正式的风格，适合商务或官方场合使用。保持信息完整，语言精炼专业：',
  casual: '请将以下文案改写为轻松、口语化的风格，像朋友聊天一样亲切自然，可以适当加入网络流行语和表情：',
  funny: '请将以下文案改写为幽默搞笑的风格，加入有趣的比喻、夸张和调侃，让读者会心一笑：',
  short: '请将以下文案精简压缩，只保留最核心的信息，用最少的字数表达完整含义：'
};

// 加载提示词（直接使用默认提示词）
const loadPrompt = (style) => {
  customPrompt.value = defaultPrompts[style] || '';
};

// 风格切换时加载对应提示词
const onStyleChange = (newStyle) => {
  loadPrompt(newStyle);
};

// 初始化加载
onMounted(() => {
  loadPrompt(rewriteStyle.value);
});

const currentPlatformComponent = computed(() => {
  const components = {
    'bilibili': BilibiliDetail,
    'douyin': DouyinDetail,
    'xiaohongshu': XiaohongshuDetail
  };
  return components[platform.value] || null;
});

// 平台切换时清空视频信息
watch(platform, () => {
  videoInfo.value = null;
  copyText.value = '';
  copyMode.value = 'original';
});


const handleParse = async () => {
  if (!videoUrl.value.trim()) {
    toast.warning('请输入视频链接');
    return;
  }

  const extractedUrl = extractUrlFromText(videoUrl.value);
  if (extractedUrl !== videoUrl.value) {
    videoUrl.value = extractedUrl;
  }

  isParsing.value = true;
  videoInfo.value = null;
  copyText.value = '';

  try {
    if (platform.value === 'bilibili') {
      await parseBilibiliVideo();
    } else if (platform.value === 'douyin') {
      await parseDouyinVideo();
    } else if (platform.value === 'xiaohongshu') {
      await parseXiaohongshuVideo();
    } else {
      throw new Error(`${platform.value} 解析功能开发中...`);
    }

    isParsing.value = false;
    toast.success('解析成功');
  } catch (error) {
    console.error('解析失败:', error);
    isParsing.value = false;
    toast.error(`解析失败: ${error.message}`);
  }
};

// 解析B站视频
const parseBilibiliVideo = async () => {
  const result = await parseBilibiliVideoApi(videoUrl.value);
  const data = result.formatted; // 直接使用格式化后的数据

  // 统一数据格式
  const biliInfo = {
    ...data,
    // 作者信息统一为对象格式
    author: {
      name: data.author || '未知作者',
      avatar: data.authorAvatar || '',
      id: data.authorId || ''
    },
    // 确保统计数据存在
    views: data.views || '0',
    likes: data.likes || '0',
    comments: data.comments || '0',
    danmaku: data.danmaku || '0',
    coin: data.coin || '0',
    favorite: data.favorite || '0',
    share: data.shares || '0',
    // 简介
    desc: data.desc || '暂无简介',
    // 发布时间
    pubdate: data.createTime || formatPubDate(data.pubdate),
    // 时长（秒）- B站的 durationRaw 才是数字，duration 是格式化后的字符串
    durationRaw: data.durationRaw || 0,
    // 分辨率（统一为字符串格式）
    dimensionStr: data.dimension ? `${data.dimension.width}x${data.dimension.height}` : ''
  };

  // 设置下载选项
  if (data.videoStreams && data.videoStreams.length > 0) {
    qualityOptions.value = data.videoStreams.map(s => ({
      label: `${s.short || s.name} (${s.size || '未知'})`,
      value: s.id,
      stream: s
    }));
    if (qualityOptions.value.length > 0) {
      selectedQuality.value = qualityOptions.value[0].value;
    }
  }

  videoInfo.value = biliInfo;
};

// 解析抖音视频
const parseDouyinVideo = async () => {
  const data = await parseDouyinVideoApi(videoUrl.value);

  // 统一数据格式
  const douyinInfo = {
    ...data,
    // 作者信息统一格式
    author: {
      name: data.author || '未知作者',
      avatar: data.authorAvatar || '',
      id: data.authorId || '',
      signature: data.authorSignature || ''
    },
    // 统计数据统一字段名
    views: formatNumber(data.views || 0),
    likes: formatNumber(data.likes || 0),
    comments: formatNumber(data.comments || 0),
    shares: formatNumber(data.shares || 0),
    collects: formatNumber(data.collects || 0),
    // 简介
    desc: data.title || '',
    // 时长（秒）
    durationRaw: data.durationRaw || data.duration || 0,
    // 发布时间
    pubdate: data.createTime || '',
    // 分辨率（已是字符串格式）
    dimensionStr: data.dimension || ''
  };

  videoInfo.value = douyinInfo;

  // 设置下载选项
  if (data.videoStreams && data.videoStreams.length > 0) {
    qualityOptions.value = data.videoStreams.map(s => ({
      label: `${s.short || s.name} (${s.size || '未知'})`,
      value: s.id,
      stream: s
    }));
    if (qualityOptions.value.length > 0) {
      selectedQuality.value = qualityOptions.value[0].value;
    }
  }
};

// 解析小红书视频
const parseXiaohongshuVideo = async () => {
  const data = await parseXiaohongshuVideoApi(videoUrl.value);

  // 统一数据格式
  const xhsInfo = {
    ...data,
    // 作者信息统一格式
    author: {
      name: data.author || '未知作者',
      avatar: data.authorAvatar || '',
      id: data.authorId || ''
    },
    // 简介
    desc: data.desc || data.title || '',
    // 时长（秒）- 确保是数字
    durationRaw: parseInt(data.duration, 10) || 0,
    // 发布时间
    pubdate: data.createTime || '',
    // 分辨率
    dimensionStr: data.dimension || '',
    // 评论数
    comments: data.comments || '0'
  };

  videoInfo.value = xhsInfo;

  // 设置下载选项
  if (data.videoStreams && data.videoStreams.length > 0) {
    qualityOptions.value = data.videoStreams.map(s => ({
      label: `${s.name} (${s.size || '未知'})`,
      value: s.id,
      stream: s
    }));
    if (qualityOptions.value.length > 0) {
      selectedQuality.value = qualityOptions.value[0].value;
    }
  }
};

const handleExtractCopy = async () => {
  if (!videoInfo.value) {
    toast.warning('请先解析视频');
    return;
  }

  isExtracting.value = true;
  copyMode.value = 'original';
  copyText.value = '正在提取文案...';

  try {
    let result = '';

    if (videoInfo.value.platform === 'bilibili') {
      const audioStream = videoInfo.value.audioStream;
      let audioUrl = audioStream?.url;
      const backupUrls = audioStream?.backupUrl || [];

      const isPcdn = audioUrl && (audioUrl.includes('mcdn.bilivideo') || audioUrl.includes('.szbdyd.com'));
      if (isPcdn && backupUrls.length > 0) {
        audioUrl = backupUrls[0];
      }

      if (!audioUrl) {
        throw new Error('未获取到B站音频链接');
      }

      const audioData = await downloadAudioData(audioUrl, 'bilibili', () => {
      });

      const MAX_SIZE = 5 * 1024 * 1024;
      const finalData = audioData.length > MAX_SIZE ? audioData.slice(0, MAX_SIZE) : audioData;

      const chunkSize = 32768;
      let binary = '';
      for (let i = 0; i < finalData.length; i += chunkSize) {
        const chunk = finalData.subarray(i, Math.min(i + chunkSize, finalData.length));
        binary += String.fromCharCode.apply(null, chunk);
      }
      const base64Data = btoa(binary);

      result = await recognizeAudioWithData(base64Data, () => {
      });
    } else if (videoInfo.value.platform === 'douyin') {
      const audioStream = videoInfo.value.audioStream;
      let audioUrl = audioStream?.url;
      const isVideoAudio = audioStream?.isVideoAudio || false;

      if (!audioUrl) {
        throw new Error('未获取到抖音音频链接');
      }

      let base64Data = '';

      if (isVideoAudio) {
        const extractResponse = await fetch('http://127.0.0.1:3721/extract-audio', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({video_url: audioUrl, platform: 'douyin'})
        });

        const extractResult = await extractResponse.json();
        if (!extractResult.success) {
          throw new Error(extractResult.message || '音频提取失败');
        }

        base64Data = extractResult.audio_base64;
      } else {
        const audioData = await downloadAudioData(audioUrl, 'douyin', () => {
        });
        const MAX_SIZE = 5 * 1024 * 1024;
        const finalData = audioData.length > MAX_SIZE ? audioData.slice(0, MAX_SIZE) : audioData;

        const chunkSize = 32768;
        let binary = '';
        for (let i = 0; i < finalData.length; i += chunkSize) {
          const chunk = finalData.subarray(i, Math.min(i + chunkSize, finalData.length));
          binary += String.fromCharCode.apply(null, chunk);
        }
        base64Data = btoa(binary);
      }

      result = await recognizeAudioWithData(base64Data, () => {
      });
    } else if (videoInfo.value.platform === 'xiaohongshu') {
      if (!videoInfo.value.isVideo) {
        throw new Error('图文笔记不支持文案提取');
      }

      const videoUrl = videoInfo.value.audioStream?.url || videoInfo.value.videoUrl;
      if (!videoUrl) {
        throw new Error('未获取到小红书视频链接');
      }

      const extractResponse = await fetch('http://127.0.0.1:3721/extract-audio', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({video_url: videoUrl, platform: 'xiaohongshu'})
      });

      const extractResult = await extractResponse.json();
      if (!extractResult.success) {
        throw new Error(extractResult.message || '音频提取失败');
      }

      const base64Data = extractResult.audio_base64;
      result = await recognizeAudioWithData(base64Data, () => {
      });
    } else {
      throw new Error('该平台文案提取服务开发中');
    }

    copyText.value = result || '未识别到语音内容';
    toast.success('文案提取完成');
  } catch (error) {
    console.error('语音识别失败:', error);
    copyText.value = '';
    toast.error(`识别失败: ${error.message}`);
  } finally {
    isExtracting.value = false;
  }
};

const handleRewrite = async () => {
  if (!copyText.value || copyMode.value !== 'original') {
    toast.warning('请先提取文案');
    return;
  }

  isRewriting.value = true;

  try {
    const result = await rewriteText(copyText.value, rewriteStyle.value, aiModel.value);
    copyMode.value = 'rewritten';
    copyText.value = result;
    toast.success('改写完成');
  } catch (error) {
    console.error('改写失败:', error);
    toast.error(error.message || '改写失败，请重试');
  } finally {
    isRewriting.value = false;
  }
};

const handleCopy = () => {
  if (!copyText.value) return;

  navigator.clipboard.writeText(copyText.value).then(() => {
    toast.success('已复制到剪贴板');
  });
};

const handleDownload = async () => {
  if (!videoInfo.value || selectedQuality.value === '' || selectedQuality.value === null || selectedQuality.value === undefined) {
    toast.warning('请选择下载清晰度');
    return;
  }

  const fileName = (videoInfo.value.title || 'video').replace(/[\\/:*?"<>|]/g, '_');
  const selectedStream = qualityOptions.value.find(q => q.value === selectedQuality.value);

  if (!selectedStream) {
    toast.error('未找到选中的视频流');
    return;
  }

  try {
    if (videoInfo.value.platform === 'bilibili') {
      await downloadBilibili(
          selectedStream.stream.url,
          `${fileName}_${selectedStream.stream.short}.mp4`,
          () => {
          },
          {backupUrls: selectedStream.stream.backupUrl || []}
      );
    } else if (videoInfo.value.platform === 'douyin') {
      await downloadDouyin(
          selectedStream.stream.url,
          `${fileName}_${selectedStream.stream.short}.mp4`,
          () => {
          },
          {backupUrls: selectedStream.stream.backupUrls || []}
      );
    } else if (videoInfo.value.platform === 'xiaohongshu') {
      await downloadXiaohongshu(
          selectedStream.stream.url,
          `${fileName}_${selectedStream.stream.short}.mp4`,
          () => {
          },
          {backupUrls: selectedStream.stream.backupUrls || []}
      );
    }

    toast.success('下载完成');
  } catch (error) {
    console.error('下载失败:', error);
    toast.error('下载失败，请重试');
  }
};
</script>

<template>
  <div class="parse-page">
    <!-- 顶部输入区 -->
    <div class="top-input-bar">
      <CustomSelect
          v-model="platform"
          :options="platforms"
          class="platform-select"
      />

      <input
          v-model="videoUrl"
          class="url-input"
          placeholder="请输入视频链接"
          type="text"
          @keyup.enter="handleParse"
      />

      <button :disabled="isParsing" class="parse-button" @click="handleParse">
        {{ isParsing ? '解析中...' : '解析' }}
      </button>
    </div>

    <!-- 中间解析结果区 -->
    <div v-if="videoInfo" class="result-area">
      <!-- 左侧封面 -->
      <div class="cover-box">
        <img :src="videoInfo.cover" alt="封面"/>
      </div>

      <!-- 右侧信息卡片 -->
      <div class="info-card">
        <!-- 第一行：作者名 + 视频标题 -->
        <div class="title-row">
          <span class="video-title">{{ videoInfo.title }}</span>
        </div>

        <!-- 第二行：统计数据横排 + 时长/分辨率/发布时间靠右 -->
        <div class="stats-row">
          <div class="stats-left">
            <div v-if="videoInfo.views" class="stat-item">
              <svg fill="none" viewBox="0 0 24 24">
                <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" stroke="currentColor" stroke-width="2"/>
                <path
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    stroke="currentColor" stroke-width="2"/>
              </svg>
              <span>{{ videoInfo.views }}</span>
            </div>
            <!-- B站弹幕 -->
            <div v-if="videoInfo.danmaku" class="stat-item">
              <svg fill="none" viewBox="0 0 24 24">
                <path
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
              </svg>
              <span>{{ videoInfo.danmaku }}</span>
            </div>
            <div v-if="videoInfo.likes" class="stat-item">
              <svg fill="none" viewBox="0 0 24 24">
                <path
                    d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3"
                    stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
              </svg>
              <span>{{ videoInfo.likes }}</span>
            </div>
            <!-- B站投币 -->
            <div v-if="videoInfo.coin" class="stat-item">
              <svg fill="none" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                <path d="M12 6v12M9 9h6M9 15h6" stroke="currentColor" stroke-linecap="round" stroke-width="2"/>
              </svg>
              <span>{{ videoInfo.coin }}</span>
            </div>
            <!-- 评论(抖音/小红书) -->
            <div v-if="videoInfo.comments" class="stat-item">
              <svg fill="none" viewBox="0 0 24 24">
                <path
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
              </svg>
              <span>{{ videoInfo.comments }}</span>
            </div>
            <!-- 收藏(B站favorite/抖音collects) -->
            <div v-if="videoInfo.favorite || videoInfo.collects" class="stat-item">
              <svg fill="none" viewBox="0 0 24 24">
                <path
                    d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                    stroke="currentColor" stroke-width="2"/>
              </svg>
              <span>{{ videoInfo.favorite || videoInfo.collects }}</span>
            </div>
            <!-- 分享(B站share/抖音shares) -->
            <div v-if="videoInfo.share || videoInfo.shares" class="stat-item">
              <svg fill="none" viewBox="0 0 24 24">
                <path
                    d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                    stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
              </svg>
              <span>{{ videoInfo.share || videoInfo.shares }}</span>
            </div>
          </div>
          <!-- 右侧：时长、分辨率、发布时间 -->
          <div class="stats-right">
            <span v-if="videoInfo.durationRaw" class="meta-item">
              <svg fill="none" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                <path d="M12 6v6l4 2" stroke="currentColor" stroke-linecap="round" stroke-width="2"/>
              </svg>
              <span>{{ formatDuration(videoInfo.durationRaw) }}</span>
            </span>
            <span v-if="videoInfo.dimensionStr" class="meta-item">
              <svg fill="none" viewBox="0 0 24 24">
                <rect x="2" y="3" width="20" height="14" rx="2" stroke="currentColor" stroke-width="2"/>
                <path d="M8 21h8M12 17v4" stroke="currentColor" stroke-linecap="round" stroke-width="2"/>
              </svg>
              <span>{{ videoInfo.dimensionStr }}</span>
            </span>
            <span v-if="videoInfo.pubdate" class="meta-item">
              <svg fill="none" viewBox="0 0 24 24">
                <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2"/>
                <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" stroke-linecap="round" stroke-width="2"/>
              </svg>
              <span>{{ videoInfo.pubdate }}</span>
            </span>
          </div>
        </div>

        <!-- 第四行：视频简介 -->
        <div v-if="videoInfo.desc" class="video-desc">{{ videoInfo.desc }}</div>

        <!-- 底部区域：用户头像 + 下载区 -->
        <div class="bottom-row">
          <!-- 左侧：用户头像和名称 -->
          <div class="author-box">
            <img :src="videoInfo.author?.avatar" alt="头像" class="author-avatar"/>
            <div class="author-info">
              <span class="author-label">{{ videoInfo.author?.name || '未知作者' }}</span>
              <span v-if="videoInfo.author?.id" class="author-id">ID: {{ videoInfo.author.id }}</span>
            </div>
          </div>

          <!-- 右侧：下载区域 -->
          <div class="download-box">
            <CustomSelect
                v-model="selectedQuality"
                :options="qualityOptions"
                class="quality-select"
                placeholder="选择清晰度"
            />
            <button class="download-button" @click="handleDownload">下载</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部文案模块 -->
    <div v-if="videoInfo" class="copywriting-module">
      <div class="copy-left">
        <div class="copy-display-area">
          <div v-if="copyText" class="copy-mode-indicator">
            <span v-if="copyMode === 'original'" class="mode-tag original">原始文案</span>
            <span v-else class="mode-tag rewritten">改写后</span>
          </div>

          <!-- 悬浮按钮 -->
          <div class="floating-actions">
            <button
                :disabled="isExtracting || !videoInfo"
                class="floating-btn extract"
                title="文案提取"
                @click="handleExtractCopy"
            >
              <svg v-if="!isExtracting" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" stroke="currentColor"
                      stroke-linecap="round" stroke-width="2"/>
                <path d="M9 5a2 2 0 012-2h2a2 2 0 012 2v0a2 2 0 01-2 2h-2a2 2 0 01-2-2v0z" stroke="currentColor"
                      stroke-width="2"/>
              </svg>
              <svg v-else class="spin" fill="none" viewBox="0 0 24 24">
                <circle cx="12" cy="12" opacity="0.3" r="10" stroke="currentColor" stroke-width="2"/>
                <path d="M12 2a10 10 0 0110 10" stroke="currentColor" stroke-linecap="round" stroke-width="2"/>
              </svg>
            </button>

            <button
                :disabled="!copyText"
                class="floating-btn copy"
                title="复制文案"
                @click="handleCopy"
            >
              <svg fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <rect height="13" rx="2" stroke="currentColor" stroke-width="2" width="13" x="9" y="9"/>
                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="currentColor" stroke-width="2"/>
              </svg>
            </button>
          </div>

          <textarea
              v-model="copyText"
              class="copy-textarea"
              placeholder="点击右上角按钮提取视频文案..."
              readonly
          ></textarea>
        </div>
      </div>

      <div class="copy-right">
        <div class="control-row">
          <div class="control-group">
            <label class="control-label">AI模型</label>
            <CustomSelect
                v-model="aiModel"
                :options="aiModels"
                class="control-select"
            />
          </div>

          <div class="control-group">
            <label class="control-label">改写风格</label>
            <CustomSelect
                v-model="rewriteStyle"
                :options="rewriteStyles"
                class="control-select"
                @change="onStyleChange"
            />
          </div>
        </div>

        <div class="control-group prompt-group">
          <label class="control-label">提示词</label>
          <textarea
              v-model="customPrompt"
              class="prompt-textarea"
              placeholder="输入自定义提示词..."
          ></textarea>
        </div>

        <button :disabled="!copyText || isRewriting" class="rewrite-button" @click="handleRewrite">
          <svg v-if="!isRewriting" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 12C4 16.4183 7.58172 20 12 20C16.4183 20 20 16.4183 20 12C20 7.58172 16.4183 4 12 4"
                  stroke="currentColor" stroke-linecap="round" stroke-width="2"/>
            <path d="M12 4L8 8L12 12" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"
                  stroke-width="2"/>
          </svg>
          {{ isRewriting ? '改写中...' : '改写' }}
        </button>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-if="!videoInfo" class="empty-state">
      <svg class="empty-icon" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path
            d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
            stroke="currentColor" stroke-width="2"/>
        <path d="M12 8V12L14 14" stroke="currentColor" stroke-linecap="round" stroke-width="2"/>
      </svg>
      <p class="empty-text">输入视频链接并点击解析</p>
    </div>
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

/* 顶部输入区 */
.top-input-bar {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 16px;
  background: #2b2d30;
  border-radius: 8px;
  border: 1px solid #3d3f43;
}

.platform-select {
  width: 120px !important;
}

.platform-select:hover {
}

.platform-select:focus {
}

.url-input {
  flex: 1;
  padding: 10px 16px;
  background: #1e1f22;
  border: 1px solid #3d3f43;
  border-radius: 6px;
  color: #ffffff;
  font-size: 14px;
  outline: none;
  transition: all 0.3s;
}

.url-input:focus {
  border-color: #4a9eff;
  box-shadow: 0 0 0 3px rgba(74, 158, 255, 0.1);
}

.url-input::placeholder {
  color: #6c6e73;
}

.parse-button {
  min-width: 100px;
  padding: 10px 24px;
  background: #4a9eff;
  border: none;
  border-radius: 6px;
  color: #ffffff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.parse-button:hover:not(:disabled) {
  background: #3d8fe8;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(74, 158, 255, 0.3);
}

.parse-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 中间解析结果区 */
.result-area {
  display: flex;
  gap: 16px;
  padding: 16px;
  background: #2b2d30;
  border-radius: 12px;
  border: 1px solid #3d3f43;
}

.cover-box {
  width: 180px;
  height: 180px;
  flex-shrink: 0;
  background: #1e1f22;
  border-radius: 8px;
  overflow: hidden;
}

.cover-box img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.info-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}

.video-title {
  font-size: 18px;
  font-weight: 600;
  color: #ffffff;
}

.stats-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.stats-left {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: center;
}

.stats-right {
  display: flex;
  gap: 12px;
  align-items: center;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #afb1b3;
  font-size: 13px;
}

.stat-item svg {
  width: 16px;
  height: 16px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #8c8c8c;
  font-size: 12px;
}

.meta-item svg {
  width: 14px;
  height: 14px;
}

.video-desc {
  font-size: 13px;
  color: #8c8c8c;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* 底部区域：用户信息 + 下载 */
.bottom-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: auto;
  padding-top: 12px;
  border-top: 1px solid #3d3f43;
}

.author-box {
  display: flex;
  align-items: center;
  gap: 8px;
}

.author-avatar {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  object-fit: cover;
}

.author-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.author-label {
  font-size: 13px;
  color: #ffffff;
}

.author-id {
  font-size: 11px;
  color: #6c6e73;
}

.download-box {
  display: flex;
  align-items: center;
  gap: 12px;
}

.quality-select {
  width: 220px;
}

.download-button {
  min-width: 100px;
  padding: 10px 24px;
  background: #4a9eff;
  border: none;
  border-radius: 6px;
  color: #ffffff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.download-button:hover {
  background: #3d8fe8;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(74, 158, 255, 0.3);
}

/* 底部文案模块 */
.copywriting-module {
  display: flex;
  gap: 16px;
  flex: 3;
  min-height: 0;
  background: #2b2d30;
  border-radius: 8px;
  border: 1px solid #3d3f43;
  padding: 16px;
}

.copy-left {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.copy-display-area {
  flex: 1;
  position: relative;
  border-radius: 6px;
  overflow: hidden;
}

.copy-mode-indicator {
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 2;
}

/* 悬浮操作按钮 */
.floating-actions {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 2;
  display: flex;
  gap: 6px;
}

.floating-btn {
  width: 32px;
  height: 32px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(74, 158, 255, 0.15);
  border: 1px solid rgba(74, 158, 255, 0.3);
  border-radius: 6px;
  color: #4a9eff;
  cursor: pointer;
  transition: all 0.2s;
}

.floating-btn svg {
  width: 18px;
  height: 18px;
}

.floating-btn:hover:not(:disabled) {
  background: #4a9eff;
  color: #ffffff;
}

.floating-btn.copy:hover:not(:disabled) {
  background: #2ecc71;
  border-color: #2ecc71;
}

.floating-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.floating-btn .spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.mode-tag {
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
}

.mode-tag.original {
  background: rgba(74, 158, 255, 0.2);
  color: #4a9eff;
  border: 1px solid rgba(74, 158, 255, 0.3);
}

.mode-tag.rewritten {
  background: rgba(46, 204, 113, 0.2);
  color: #2ecc71;
  border: 1px solid rgba(46, 204, 113, 0.3);
}

.copy-textarea {
  width: 100%;
  height: 100%;
  padding: 12px;
  padding-top: 48px;
  background: #1e1f22;
  border: 1px solid #3d3f43;
  border-radius: 6px;
  color: #ffffff;
  font-size: 14px;
  line-height: 1.6;
  resize: none;
  outline: none;
  font-family: inherit;
}

.copy-textarea::placeholder {
  color: #6c6e73;
}

.copy-right {
  width: 260px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.control-row {
  display: flex;
  gap: 12px;
}

.control-row .control-group {
  flex: 1;
}

.control-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.control-label {
  font-size: 12px;
  font-weight: 600;
  color: #afb1b3;
}

.control-select {
  /* 使用 CustomSelect 组件自带样式 */
}

.prompt-group {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.prompt-group .prompt-textarea {
  flex: 1;
  min-height: 60px;
}

.rewrite-button {
  width: 100%;
  padding: 12px 20px;
  background: #4a9eff;
  border: none;
  border-radius: 6px;
  color: #ffffff;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  flex-shrink: 0;
  margin-top: auto;
}

.rewrite-button svg {
  width: 20px;
  height: 20px;
}

.rewrite-button:hover:not(:disabled) {
  background: #3d8fe8;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(74, 158, 255, 0.3);
}

.rewrite-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.prompt-textarea {
  width: 100%;
  min-height: 60px;
  padding: 10px;
  background: #1e1f22;
  border: 1px solid #3d3f43;
  border-radius: 6px;
  color: #ffffff;
  font-size: 13px;
  line-height: 1.5;
  resize: none;
  outline: none;
  font-family: inherit;
  transition: all 0.3s;
}

.prompt-textarea:focus {
  border-color: #4a9eff;
}

.prompt-textarea::placeholder {
  color: #6c6e73;
}

/* 空状态 */
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
  color: #3d3f43;
}

.empty-text {
  font-size: 16px;
  color: #6c6e73;
}
</style>

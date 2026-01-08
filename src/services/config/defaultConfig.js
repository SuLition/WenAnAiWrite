/**
 * 默认配置值
 */

import { DEFAULT_PROMPTS } from '@/constants/options'

// 页面过渡效果选项
export const PAGE_TRANSITION_OPTIONS = [
  { value: 'none', label: '无效果' },
  { value: 'fade', label: '淡入淡出' },
  { value: 'slide-left', label: '左滑' },
  { value: 'slide-right', label: '右滑' },
  { value: 'slide-up', label: '上滑' },
  { value: 'zoom', label: '缩放' }
]

// 应用默认配置
export const defaultConfig = {
  // 外观设置
  appearance: {
    themeMode: 'dark',       // 主题模式: light, dark, system
    windowEffect: 'none',    // 窗口效果: none, mica, acrylic
    pageTransition: 'fade',  // 页面过渡效果: none, fade, slide-left, slide-right, slide-up, zoom
    accentColor: 'blue',     // 主题色: blue, green, purple, orange, pink, cyan, red
    animationSpeed: 'normal' // 动画速率: disabled, fast, normal, elegant
  },
  
  // 下载设置
  download: {
    savePath: ''  // 空字符串表示使用系统默认下载目录
  },
  
  // 历史记录设置
  history: {
    maxRecords: 100  // 最大记录数量
  },
  
  // 任务队列设置
  taskQueue: {
    maxConcurrent: 3  // 最大并行任务数
  },
  
  // 腾讯语音识别配置
  tencentAsr: {
    secretId: '',
    secretKey: ''
  },
  
  // 豆包配置
  doubao: {
    apiKey: '',
    model: 'doubao-seed-1-6-251015'
  },
  
  // DeepSeek 配置
  deepseek: {
    apiKey: '',
    model: 'deepseek-chat'
  },
  
  // 千问配置
  qianwen: {
    apiKey: '',
    model: 'qwen-turbo'
  },
  
  // 混元配置
  hunyuan: {
    secretId: '',
    secretKey: ''
  },
  
  // 提示词配置
  prompts: { ...DEFAULT_PROMPTS },
  
  // 更新设置
  update: {
    autoCheck: true  // 自动检查更新
  }
}

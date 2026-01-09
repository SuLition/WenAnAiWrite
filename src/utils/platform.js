/**
 * 平台相关工具函数
 * 整合平台检测、名称获取、颜色配置等功能
 */

import { PLATFORM_NAMES, PLATFORM_COLORS } from '@/constants/platforms'

/**
 * 平台检测正则表达式
 */
const PLATFORM_PATTERNS = {
  bilibili: /bilibili\.com|b23\.tv|bili/i,
  douyin: /douyin\.com|iesdouyin\.com|v\.douyin/i,
  xiaohongshu: /xiaohongshu\.com|xhslink\.com|小红书/i,
  kuaishou: /kuaishou\.com|v\.kuaishou/i
}

/**
 * 检测 URL 所属平台
 * @param {string} url - 视频链接或分享文本
 * @returns {string} 平台标识，未识别返回 'unknown'
 */
export function detectPlatform(url) {
  if (!url || typeof url !== 'string') return 'unknown'
  
  for (const [platform, pattern] of Object.entries(PLATFORM_PATTERNS)) {
    if (pattern.test(url)) {
      return platform
    }
  }
  return 'unknown'
}

/**
 * 检查是否为有效的视频链接
 * @param {string} url - 链接
 * @returns {boolean}
 */
export function isValidVideoUrl(url) {
  return detectPlatform(url) !== 'unknown'
}

/**
 * 获取平台显示名称
 * @param {string} platform - 平台标识
 * @returns {string} 平台显示名称
 */
export function getPlatformName(platform) {
  return PLATFORM_NAMES[platform] || platform || '未知平台'
}

/**
 * 获取平台主题颜色
 * @param {string} platform - 平台标识
 * @returns {string} 平台颜色值
 */
export function getPlatformColor(platform) {
  return PLATFORM_COLORS[platform] || '#4a9eff'
}

/**
 * 获取所有支持的平台
 * @returns {string[]} 平台标识列表
 */
export function getSupportedPlatforms() {
  return Object.keys(PLATFORM_PATTERNS)
}

/**
 * 从分享文本中提取 URL
 * @param {string} text - 分享文本
 * @returns {string|null} 提取的 URL
 */
export function extractUrlFromShareText(text) {
  if (!text) return null
  
  // 匹配常见的 URL 模式
  const urlPattern = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi
  const matches = text.match(urlPattern)
  
  if (!matches) return null
  
  // 优先返回视频平台的 URL
  for (const url of matches) {
    if (isValidVideoUrl(url)) {
      return url
    }
  }
  
  // 如果没有识别到平台，返回第一个 URL
  return matches[0] || null
}

/**
 * 获取平台图标（用于 UI 显示）
 * @param {string} platform - 平台标识
 * @returns {string} 图标类名或 SVG
 */
export function getPlatformIcon(platform) {
  const icons = {
    bilibili: 'icon-bilibili',
    douyin: 'icon-douyin',
    xiaohongshu: 'icon-xiaohongshu',
    kuaishou: 'icon-kuaishou'
  }
  return icons[platform] || 'icon-video'
}

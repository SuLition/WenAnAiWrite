/**
 * 统一 API 入口
 * 提供平台自动识别和统一调用接口
 */

import { bilibiliApi, douyinApi, xiaohongshuApi } from '@/services/api'

/**
 * 平台检测正则
 */
const PLATFORM_PATTERNS = {
  bilibili: /bilibili\.com|b23\.tv|bili/i,
  douyin: /douyin\.com|iesdouyin\.com|v\.douyin/i,
  xiaohongshu: /xiaohongshu\.com|xhslink\.com|小红书/i
}

/**
 * 平台 API 映射
 */
const PLATFORM_APIS = {
  bilibili: bilibiliApi,
  douyin: douyinApi,
  xiaohongshu: xiaohongshuApi
}

/**
 * 检测 URL 所属平台
 * @param {string} url - 视频链接
 * @returns {string} 平台标识
 */
export function detectPlatform(url) {
  if (!url) return 'unknown'
  
  for (const [platform, pattern] of Object.entries(PLATFORM_PATTERNS)) {
    if (pattern.test(url)) {
      return platform
    }
  }
  return 'unknown'
}

/**
 * 统一解析视频
 * @param {string} url - 视频链接
 * @param {string} platform - 平台（可选，默认自动识别）
 * @returns {Promise<object>} 解析结果
 */
export async function parseVideo(url, platform = 'auto') {
  // 自动检测平台
  const detectedPlatform = platform === 'auto' ? detectPlatform(url) : platform
  
  if (detectedPlatform === 'unknown') {
    throw new Error('无法识别的视频链接，请检查链接格式')
  }
  
  const api = PLATFORM_APIS[detectedPlatform]
  if (!api) {
    throw new Error(`不支持的平台: ${detectedPlatform}`)
  }
  
  // 调用对应平台的解析方法
  const result = await api.parseVideo(url)
  
  return {
    platform: detectedPlatform,
    ...result
  }
}

/**
 * 检查解析服务是否可用
 * @param {string} platform - 平台（可选，不传则检查所有）
 * @returns {Promise<boolean|object>}
 */
export async function checkServiceHealth(platform) {
  if (platform) {
    const api = PLATFORM_APIS[platform]
    return api?.checkServiceHealth?.() ?? false
  }
  
  // 检查所有平台
  const results = {}
  for (const [name, api] of Object.entries(PLATFORM_APIS)) {
    results[name] = await (api?.checkServiceHealth?.() ?? false)
  }
  return results
}

/**
 * 获取支持的平台列表
 * @returns {string[]}
 */
export function getSupportedPlatforms() {
  return Object.keys(PLATFORM_APIS)
}

// 导出各平台 API（保持兼容）
export { bilibiliApi, douyinApi, xiaohongshuApi }

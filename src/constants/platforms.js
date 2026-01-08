/**
 * 平台相关常量配置
 */

// 平台名称映射
export const PLATFORM_NAMES = {
  bilibili: 'Bilibili',
  douyin: '抖音',
  xiaohongshu: '小红书'
}

// 平台颜色配置
export const PLATFORM_COLORS = {
  bilibili: '#00a1d6',
  douyin: '#000000',
  xiaohongshu: '#ff2442'
}

/**
 * 获取平台显示名称
 * @param {string} platform - 平台标识
 * @returns {string} 平台显示名称
 */
export function getPlatformName(platform) {
  return PLATFORM_NAMES[platform] || platform
}

/**
 * 获取平台主题颜色
 * @param {string} platform - 平台标识
 * @returns {string} 平台颜色值
 */
export function getPlatformColor(platform) {
  return PLATFORM_COLORS[platform] || '#4a9eff'
}

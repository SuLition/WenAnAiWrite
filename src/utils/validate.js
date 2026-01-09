/**
 * 验证工具函数
 * 提供各类输入验证功能
 */

/**
 * 验证 URL 格式
 * @param {string} url - URL 字符串
 * @returns {boolean}
 */
export function isValidUrl(url) {
  if (!url || typeof url !== 'string') return false
  
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

/**
 * 验证是否为 HTTP/HTTPS URL
 * @param {string} url - URL 字符串
 * @returns {boolean}
 */
export function isHttpUrl(url) {
  if (!isValidUrl(url)) return false
  const parsed = new URL(url)
  return parsed.protocol === 'http:' || parsed.protocol === 'https:'
}

/**
 * 清理文件名（移除非法字符）
 * @param {string} filename - 原始文件名
 * @param {string} replacement - 替换字符，默认为 '_'
 * @returns {string} 清理后的文件名
 */
export function sanitizeFilename(filename, replacement = '_') {
  if (!filename || typeof filename !== 'string') return 'untitled'
  
  // Windows 非法字符: < > : " / \ | ? *
  // 同时移除控制字符
  return filename
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, replacement)
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200) // 限制长度
}

/**
 * 验证文件大小是否在范围内
 * @param {number} size - 文件大小（字节）
 * @param {number} maxSize - 最大大小（字节）
 * @returns {boolean}
 */
export function isValidFileSize(size, maxSize) {
  return typeof size === 'number' && size > 0 && size <= maxSize
}

/**
 * 验证是否为空字符串
 * @param {string} str - 字符串
 * @returns {boolean}
 */
export function isEmpty(str) {
  return !str || (typeof str === 'string' && str.trim() === '')
}

/**
 * 验证是否为非空字符串
 * @param {string} str - 字符串
 * @returns {boolean}
 */
export function isNotEmpty(str) {
  return !isEmpty(str)
}

/**
 * 验证数字是否在范围内
 * @param {number} value - 数值
 * @param {number} min - 最小值
 * @param {number} max - 最大值
 * @returns {boolean}
 */
export function isInRange(value, min, max) {
  return typeof value === 'number' && !isNaN(value) && value >= min && value <= max
}

/**
 * 验证是否为正整数
 * @param {*} value - 待验证值
 * @returns {boolean}
 */
export function isPositiveInteger(value) {
  return Number.isInteger(value) && value > 0
}

/**
 * 验证邮箱格式
 * @param {string} email - 邮箱地址
 * @returns {boolean}
 */
export function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false
  const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return pattern.test(email)
}

/**
 * 验证视频 ID 格式（B站 BV 号）
 * @param {string} bvid - BV 号
 * @returns {boolean}
 */
export function isValidBvid(bvid) {
  if (!bvid || typeof bvid !== 'string') return false
  return /^BV[a-zA-Z0-9]{10}$/.test(bvid)
}

/**
 * 验证视频 ID 格式（B站 AV 号）
 * @param {*} avid - AV 号
 * @returns {boolean}
 */
export function isValidAvid(avid) {
  const num = Number(avid)
  return Number.isInteger(num) && num > 0
}

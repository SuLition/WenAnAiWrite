/**
 * 小红书视频解析 API 服务
 * 调用本地 Python 解析服务获取小红书视频信息
 * 注：仅支持短链接（xhslink.com）
 */

import { SERVICE_URL } from './config.js'
import { fetchWithRetry } from '@/utils/request.js'

/**
 * 检查解析服务是否可用
 */
export async function checkServiceHealth() {
  try {
    const response = await fetchWithRetry(`${SERVICE_URL}/health`, {
      method: 'GET'
    }, { timeout: 5000, retries: 2 })
    return response.ok
  } catch (error) {
    console.error('[xiaohongshuApi] Service health check failed:', error)
    return false
  }
}

/**
 * 解析小红书视频链接
 * @param {string} url - 小红书视频链接或分享文本
 * @returns {Promise<object>} 视频信息
 */
export async function parseXiaohongshuVideo(url) {
  // 先检查服务是否可用
  const isHealthy = await checkServiceHealth()
  if (!isHealthy) {
    throw new Error('解析服务未启动，请稍后重试')
  }

  const response = await fetchWithRetry(`${SERVICE_URL}/parse/xiaohongshu`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url })
  }, { timeout: 60000 }) // 小红书解析可能较慢

  if (!response.ok) {
    throw new Error(`解析请求失败: HTTP ${response.status}`)
  }

  const result = await response.json()

  if (!result.success) {
    throw new Error(result.message || '解析失败')
  }

  return result.data
}

/**
 * 格式化小红书视频信息为统一格式
 * @param {object} data - 原始解析数据
 * @returns {object} 格式化后的视频信息
 */
export function formatXiaohongshuVideoInfo(data) {
  return {
    // 基础信息
    title: data.title || '未知标题',
    desc: data.desc || '',
    author: data.author || '未知作者',
    authorId: data.authorId || '',
    authorAvatar: data.authorAvatar || '',
    cover: data.cover || '',
    duration: formatDuration(data.duration || 0),
    durationRaw: data.duration || 0,
    platform: 'xiaohongshu',
    
    // 视频/图文信息
    noteId: data.noteId || '',
    videoUrl: data.videoUrl || '',
    isNote: data.isNote || false,
    isVideo: data.isVideo || false,
    images: data.images || [],
    
    // 视频流和音频流
    videoStreams: data.videoStreams || [],
    audioStream: data.audioStream || null,
    
    // 统计数据
    likes: data.likes || '0',
    comments: data.comments || '0',
    collects: data.collects || '0',
    shares: data.shares || '0',
    
    // 详细信息
    createTime: data.createTime || '',
    hashtags: data.hashtags || [],
    
    // 原始数据
    rawData: data
  }
}

/**
 * 格式化时长
 * @param {number} seconds - 秒数
 * @returns {string} 格式化的时长字符串
 */
function formatDuration(seconds) {
  if (!seconds || seconds === 0) return '00:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

/**
 * 一键解析小红书视频（包含格式化）
 * @param {string} url - 小红书视频链接
 * @returns {Promise<object>} 格式化后的视频信息
 */
export async function parseVideo(url) {
  const rawData = await parseXiaohongshuVideo(url)
  return formatXiaohongshuVideoInfo(rawData)
}

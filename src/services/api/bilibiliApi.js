/**
 * B站 API 服务
 * 通过后端解析服务实现视频解析
 */

import { getAuthCookie, isLoggedIn } from '../auth/bilibiliAuth.js'
import { SERVICE_URL } from './config.js'

/**
 * 带超时的 fetch
 * @param {string} url - 请求地址
 * @param {object} options - fetch 选项
 * @param {number} timeout - 超时时间(毫秒)
 */
async function fetchWithTimeout(url, options = {}, timeout = 30000) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    })
    clearTimeout(timeoutId)
    return response
  } catch (error) {
    clearTimeout(timeoutId)
    if (error.name === 'AbortError') {
      throw new Error('请求超时，请稍后重试')
    }
    throw error
  }
}

/**
 * 检查解析服务是否可用
 */
export async function checkServiceHealth() {
  try {
    const response = await fetchWithTimeout(`${SERVICE_URL}/health`, {
      method: 'GET'
    }, 5000)
    return response.ok
  } catch (error) {
    console.error('[bilibiliApi] Service health check failed:', error)
    return false
  }
}

/**
 * 解析B站视频链接
 * @param {string} url - B站视频链接或分享文本
 * @param {string} cookie - 可选的 Cookie（如果不传则自动从登录系统获取）
 * @returns {Promise<object>} 视频信息
 */
export async function parseBilibiliVideo(url, cookie = null) {
  // 先检查服务是否可用
  const isHealthy = await checkServiceHealth()
  if (!isHealthy) {
    throw new Error('B站解析服务未启动，请稍后重试')
  }

  // 如果没有传入cookie，尝试从登录系统获取
  let authCookie = cookie || ''
  if (!authCookie) {
    const loggedIn = await isLoggedIn()
    if (loggedIn) {
      authCookie = await getAuthCookie()
    }
  }
  
  console.log('='+'='.repeat(59))
  console.log('[bilibiliApi] B站解析请求')
  console.log('='+'='.repeat(59))
  console.log('[bilibiliApi] URL:', url)
  console.log('[bilibiliApi] isLoggedIn():', isLoggedIn())
  console.log('[bilibiliApi] Cookie长度:', authCookie ? authCookie.length : 0)
  console.log('[bilibiliApi] Cookie预览:', authCookie ? authCookie.substring(0, 100) + '...' : '无')
  
  // 检查 Cookie 关键字段
  if (authCookie) {
    console.log('[bilibiliApi] Cookie包含 SESSDATA:', authCookie.includes('SESSDATA'))
    console.log('[bilibiliApi] Cookie包含 bili_jct:', authCookie.includes('bili_jct'))
    console.log('[bilibiliApi] Cookie包含 DedeUserID:', authCookie.includes('DedeUserID'))
  }

  const response = await fetchWithTimeout(`${SERVICE_URL}/parse/bilibili`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ 
      url,
      cookie: authCookie  // 传递 cookie 给后端
    })
  }, 30000)  // 30 秒超时

  if (!response.ok) {
    throw new Error(`解析请求失败: HTTP ${response.status}`)
  }

  const result = await response.json()

  console.log('[bilibiliApi] 解析结果:')
  console.log('[bilibiliApi] - success:', result.success)
  console.log('[bilibiliApi] - message:', result.message)
  
  if (!result.success) {
    throw new Error(result.message || '解析失败')
  }

  // 打印详细的视频流信息
  const data = result.data
  console.log('[bilibiliApi] 视频信息:')
  console.log('[bilibiliApi] - 标题:', data.title)
  console.log('[bilibiliApi] - 登录状态(API):', data.acceptDescription?.length > 2 ? '已登录' : '未登录')
  console.log('[bilibiliApi] - 支持清晰度:', data.acceptDescription)
  console.log('[bilibiliApi] - 视频流数量:', data.videoStreams?.length || 0)
  console.log('[bilibiliApi] - 音频流:', data.audioStream ? '有' : '无')
  
  // 打印每个视频流
  if (data.videoStreams) {
    data.videoStreams.forEach((stream, i) => {
      console.log(`[bilibiliApi] - 视频流[${i}]: ${stream.short} ${stream.name} (${stream.width}x${stream.height})`)
    })
  }

  return data
}

/**
 * 格式化B站视频信息为统一格式
 * @param {object} data - 原始解析数据
 * @returns {object} 格式化后的视频信息
 */
export function formatBilibiliVideoInfo(data) {
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
    platform: 'bilibili',
    
    // 视频信息
    bvid: data.bvid || '',
    aid: data.aid || 0,
    cid: data.cid || 0,
    videoUrl: data.videoUrl || '',
    audioUrl: data.audioUrl || '',
    
    // 视频流和音频流
    videoStreams: data.videoStreams || [],
    audioStream: data.audioStream || null,
    
    // 统计数据
    views: data.views || '0',
    likes: data.likes || '0',
    comments: data.comments || '0',
    danmaku: data.danmaku || '0',
    coin: data.coin || '0',
    favorite: data.favorite || '0',
    shares: data.shares || '0',
    
    // 详细信息
    createTime: data.createTime || '',
    pubdate: data.pubdate || 0,
    
    // 下载需要的 headers（解决403问题）
    downloadHeaders: data.downloadHeaders || {
      'Referer': 'https://www.bilibili.com/',
      'Origin': 'https://www.bilibili.com',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    },
    
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
 * 完整的视频解析流程
 * @param {string} url - B站视频链接
 * @returns {Promise<object>} 包含视频信息和播放链接
 */
export async function parseVideo(url) {
  console.log('[B站解析] 开始解析:', url)
  
  const rawData = await parseBilibiliVideo(url)
  const formattedData = formatBilibiliVideoInfo(rawData)
  
  // 转换为前端需要的格式（兼容旧格式）
  return {
    videoInfo: {
      title: formattedData.title,
      owner: {
        name: formattedData.author,
        mid: formattedData.authorId,
        face: formattedData.authorAvatar
      },
      pic: formattedData.cover,
      bvid: formattedData.bvid,
      aid: formattedData.aid,
      cid: formattedData.cid,
      duration: formattedData.durationRaw,
      desc: formattedData.desc,
      pubdate: formattedData.pubdate,
      stat: {
        view: formattedData.views,
        like: formattedData.likes,
        reply: formattedData.comments,
        danmaku: formattedData.danmaku,
        favorite: formattedData.favorite
      }
    },
    playData: {
      dash: {
        video: formattedData.videoStreams.map(stream => ({
          id: stream.id,
          baseUrl: stream.url,
          backupUrl: stream.backupUrls || [],
          bandwidth: stream.bitrate,
          width: stream.width,
          height: stream.height,
          codecs: stream.codecs || 'avc1.640028'
        })),
        audio: formattedData.audioStream ? [{
          baseUrl: formattedData.audioStream.url,
          backupUrl: formattedData.audioStream.backupUrls || [],
          bandwidth: formattedData.audioStream.bitrate || 128000
        }] : []
      },
      timelength: formattedData.durationRaw * 1000
    },
    // 扩展信息
    formatted: formattedData,
    // 下载 headers
    downloadHeaders: formattedData.downloadHeaders
  }
}

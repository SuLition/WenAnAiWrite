/**
 * 下载服务模块
 * 处理B站等平台的视频/音频下载
 * 仅支持 Tauri 环境
 */

import { getSessData } from '../auth/bilibiliAuth'
import { tauriDownloadBilibili, tauriFetchBilibiliAudio, tauriDownloadDouyin, tauriFetchDouyinAudio, tauriDownloadXiaohongshu, tauriFetchXiaohongshuAudio, isTauri } from './tauriDownload'
import { fetchWithRetry } from '@/utils/request.js'

/**
 * 格式化文件大小
 */
function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + sizes[i]
}

/**
 * B站CDN镜像列表 - 按稳定性排序
 */
const BILIBILI_MIRRORS = [
  'upos-sz-mirrorali.bilivideo.com',   // 阿里云镜像
  'upos-sz-mirrorcos.bilivideo.com',   // 腾讯云镜像
  'upos-sz-mirrorhw.bilivideo.com',    // 华为云镜像
  'upos-sz-mirrorbd.bilivideo.com',    // 百度云镜像
]

/**
 * 过滤并优化B站视频URL列表
 * 根据文档说明，过滤PCDN节点并替换为稳定镜像
 * @param {string[]} urls - 原始URL列表
 * @returns {string[]} 优化后的URL列表
 */
export function filterBilibiliUrls(urls) {
  if (!urls || urls.length === 0) return urls
  
  const mirror = []
  const upos = []
  const bcache = []
  const others = []
  
  for (const v of urls) {
    try {
      const url = new URL(v)
      const host = url.hostname
      const os = url.searchParams.get('os') ?? ''
      
      // 分类URL
      if (host.includes('mirror') && os.endsWith('bv')) {
        mirror.push({ url, original: v })
      } else if (os === 'upos') {
        upos.push({ url, original: v })
      } else if (host.startsWith('cn') && os === 'bcache') {
        bcache.push({ url, original: v })
      } else {
        others.push({ url, original: v })
      }
    } catch (e) {
      others.push({ url: null, original: v })
    }
  }
  
  // 优先使用已有镜像节点
  if (mirror.length > 0) {
    if (mirror.length < 2 && upos.length > 0) {
      return [...mirror.map(m => m.original), ...upos.map(u => u.original)]
    }
    return mirror.map(m => m.original)
  }
  
  // 替换为阿里云/腾讯云镜像
  if (upos.length > 0 || bcache.length > 0) {
    const sourceUrls = upos.length > 0 ? upos : bcache
    return sourceUrls.map((item, i) => {
      if (!item.url) return item.original
      const newHost = BILIBILI_MIRRORS[i % BILIBILI_MIRRORS.length]
      item.url.hostname = newHost
      return item.url.toString()
    })
  }
  
  return urls
}

/**
 * B站视频下载 - 使用 Tauri 原生下载
 * @param {string} url - B站视频/音频链接
 * @param {string} fileName - 保存的文件名
 * @param {function} onProgress - 进度回调
 * @param {object} options - 可选配置
 * @param {string[]} options.backupUrls - 备用下载链接列表
 * @returns {Promise<boolean>} 下载是否成功
 */
export async function downloadBilibili(url, fileName, onProgress, options = {}) {
  const { backupUrls = [] } = options
  
  // 构建URL列表：主 URL + 备用 URL
  let urlList = [url]
  if (backupUrls && backupUrls.length > 0) {
    urlList = [url, ...backupUrls]
  }
  
  // 过滤和优化URL列表（PCDN过滤 + 镜像替换）
  urlList = filterBilibiliUrls(urlList)
  
  console.log('[B站下载] 使用 Tauri 原生下载')
  try {
    await tauriDownloadBilibili(urlList[0], fileName, onProgress)
    return true
  } catch (error) {
    console.error('[B站下载] 下载失败:', error)
    throw error
  }
}

/**
 * 抖音视频下载 - 使用 Tauri 原生下载
 * @param {string} url - 抖音视频链接
 * @param {string} fileName - 保存的文件名
 * @param {function} onProgress - 进度回调
 * @param {object} options - 可选配置
 * @param {string[]} options.backupUrls - 备用下载链接列表
 * @returns {Promise<boolean>} 下载是否成功
 */
export async function downloadDouyin(url, fileName, onProgress, options = {}) {
  const { backupUrls = [] } = options
  
  console.log('[抖音下载] 使用 Tauri 原生下载')
  
  // 尝试主 URL
  try {
    await tauriDownloadDouyin(url, fileName, onProgress)
    return true
  } catch (error) {
    console.error('[抖音下载] 主URL下载失败:', error)
    
    // 尝试备用 URL
    for (let i = 0; i < backupUrls.length; i++) {
      try {
        console.log(`[抖音下载] 尝试备用URL ${i + 1}/${backupUrls.length}`)
        await tauriDownloadDouyin(backupUrls[i], fileName, onProgress)
        return true
      } catch (backupError) {
        console.error(`[抖音下载] 备用URL ${i + 1} 失败:`, backupError)
      }
    }
    
    throw error
  }
}

/**
 * 小红书视频下载 - 使用 Tauri 原生下载
 * @param {string} url - 小红书视频链接
 * @param {string} fileName - 保存的文件名
 * @param {function} onProgress - 进度回调
 * @param {object} options - 可选配置
 * @param {string[]} options.backupUrls - 备用下载链接列表
 * @returns {Promise<boolean>} 下载是否成功
 */
export async function downloadXiaohongshu(url, fileName, onProgress, options = {}) {
  const { backupUrls = [] } = options
  
  console.log('[小红书下载] 使用 Tauri 原生下载')
  
  // 尝试主 URL
  try {
    await tauriDownloadXiaohongshu(url, fileName, onProgress)
    return true
  } catch (error) {
    console.error('[小红书下载] 主URL下载失败:', error)
    
    // 尝试备用 URL
    for (let i = 0; i < backupUrls.length; i++) {
      try {
        console.log(`[小红书下载] 尝试备用URL ${i + 1}/${backupUrls.length}`)
        await tauriDownloadXiaohongshu(backupUrls[i], fileName, onProgress)
        return true
      } catch (backupError) {
        console.error(`[小红书下载] 备用URL ${i + 1} 失败:`, backupError)
      }
    }
    
    throw error
  }
}

/**
 * 下载音频数据到 ArrayBuffer（用于语音识别等场景）
 * @param {string} url - 音频链接
 * @param {string} platform - 平台类型: 'bilibili' | 'douyin' | 'none'
 * @param {function} onProgress - 进度回调
 * @returns {Promise<Uint8Array>} 音频二进制数据
 */
export async function downloadAudioData(url, platform = 'none', onProgress) {
  // B站使用 Tauri 原生下载
  if (platform === 'bilibili' && isTauri()) {
    // 优化 URL（过滤 PCDN，替换为稳定镜像）
    const optimizedUrls = filterBilibiliUrls([url])
    const finalUrl = optimizedUrls[0] || url
    
    console.log('[downloadAudioData] B站使用 Tauri 原生下载:', finalUrl)
    
    return await tauriFetchBilibiliAudio(finalUrl, (progress, status) => {
      if (onProgress) {
        onProgress(progress, status)
      }
    })
  }
  
  // 抖音使用 Tauri 原生下载
  if (platform === 'douyin' && isTauri()) {
    console.log('[downloadAudioData] 抖音使用 Tauri 原生下载:', url)
    
    return await tauriFetchDouyinAudio(url, (progress, status) => {
      if (onProgress) {
        onProgress(progress, status)
      }
    })
  }
  
  // 小红书使用 Tauri 原生下载
  if (platform === 'xiaohongshu' && isTauri()) {
    console.log('[downloadAudioData] 小红书使用 Tauri 原生下载:', url)
    
    return await tauriFetchXiaohongshuAudio(url, (progress, status) => {
      if (onProgress) {
        onProgress(progress, status)
      }
    })
  }
  
  // 其他平台使用 fetch（带重试机制）
  console.log('[downloadAudioData] 开始下载音频:', { url, platform })
  
  const response = await fetchWithRetry(url, {
    headers: { 'Accept': '*/*' }
  }, { timeout: 60000 })
  
  if (!response.ok) {
    console.error('[downloadAudioData] 下载失败:', response.status, response.statusText)
    throw new Error(`音频下载失败: ${response.status} ${response.statusText}`)
  }
  
  const contentLength = response.headers.get('content-length')
  const total = contentLength ? parseInt(contentLength, 10) : 0
  
  if (total > 0 && onProgress) {
    const reader = response.body.getReader()
    const chunks = []
    let receivedLength = 0
    
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      
      chunks.push(value)
      receivedLength += value.length
      const progress = Math.round((receivedLength / total) * 100)
      onProgress(progress, `已下载 ${formatFileSize(receivedLength)} / ${formatFileSize(total)}`)
    }
    
    const audioData = new Uint8Array(receivedLength)
    let position = 0
    for (const chunk of chunks) {
      audioData.set(chunk, position)
      position += chunk.length
    }
    
    return audioData
  } else {
    const blob = await response.blob()
    const arrayBuffer = await blob.arrayBuffer()
    return new Uint8Array(arrayBuffer)
  }
}

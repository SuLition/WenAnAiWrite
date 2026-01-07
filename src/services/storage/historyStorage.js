/**
 * 历史记录存储服务
 * 管理下载历史的持久化存储（使用本地文件存储）
 */

import { readJsonFile, writeJsonFile, removeFile, FILE_NAMES, migrateDownloadHistoryData } from './fileStorage'
import { HISTORY_CONFIG } from '@/constants/storage'

// 内存缓存
let historyCache = null
let cacheLoaded = false

/**
 * 获取所有历史记录
 * @returns {Promise<Array>} 历史记录数组
 */
export async function getHistory() {
  if (cacheLoaded && historyCache !== null) {
    return historyCache
  }
  
  // 先尝试迁移旧数据
  await migrateDownloadHistoryData()
  
  const data = await readJsonFile(FILE_NAMES.DOWNLOAD_HISTORY, [])
  historyCache = data
  cacheLoaded = true
  return data
}

/**
 * 保存历史记录到文件
 */
async function saveHistory(history) {
  historyCache = history
  return await writeJsonFile(FILE_NAMES.DOWNLOAD_HISTORY, history)
}

/**
 * 添加历史记录
 * @param {Object} record - 历史记录对象
 * @param {string} record.title - 视频标题
 * @param {string} record.platform - 平台标识
 * @param {string} record.url - 视频链接
 * @param {string} record.size - 文件大小
 * @param {string} record.savePath - 保存路径
 * @returns {Promise<boolean>} 是否成功
 */
export async function addHistory(record) {
  const history = await getHistory()
  
  // 生成唯一 ID 和时间戳
  const newRecord = {
    id: Date.now(),
    ...record,
    downloadTime: new Date().toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).replace(/\//g, '-'),
    status: 'completed'
  }
  
  // 添加到列表开头
  history.unshift(newRecord)
  
  // 限制最大条数
  if (history.length > HISTORY_CONFIG.MAX_RECORDS) {
    history.splice(HISTORY_CONFIG.MAX_RECORDS)
  }
  
  return await saveHistory(history)
}

/**
 * 删除指定历史记录
 * @param {number} id - 记录 ID
 * @returns {Promise<boolean>} 是否成功
 */
export async function deleteHistory(id) {
  const history = await getHistory()
  const filtered = history.filter(item => item.id !== id)
  return await saveHistory(filtered)
}

/**
 * 清空所有历史记录
 * @returns {Promise<boolean>} 是否成功
 */
export async function clearHistory() {
  historyCache = []
  cacheLoaded = true
  return await removeFile(FILE_NAMES.DOWNLOAD_HISTORY)
}

/**
 * 更新历史记录状态
 * @param {number} id - 记录 ID
 * @param {Object} updates - 要更新的字段
 * @returns {Promise<boolean>} 是否成功
 */
export async function updateHistory(id, updates) {
  const history = await getHistory()
  const index = history.findIndex(item => item.id === id)
  
  if (index === -1) return false
  
  history[index] = { ...history[index], ...updates }
  return await saveHistory(history)
}

export default {
  getHistory,
  addHistory,
  deleteHistory,
  clearHistory,
  updateHistory
}

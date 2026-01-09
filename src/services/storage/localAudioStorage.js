/**
 * 本地音频文件存储服务
 * 管理本地音频文件的复制、存储和检查
 */

import { copyFile, exists, mkdir, remove } from '@tauri-apps/plugin-fs'
import { appDataDir, join } from '@tauri-apps/api/path'

const AUDIO_DIR = 'audio'

/**
 * 确保音频目录存在
 */
export async function ensureAudioDir() {
  try {
    const appDir = await appDataDir()
    const audioDir = await join(appDir, AUDIO_DIR)
    const dirExists = await exists(audioDir)
    if (!dirExists) {
      await mkdir(audioDir, { recursive: true })
    }
    return audioDir
  } catch (error) {
    console.error('[LocalAudioStorage] 创建音频目录失败:', error)
    throw error
  }
}

/**
 * 复制音频文件到应用数据目录
 * @param {string} sourcePath - 源文件路径
 * @param {string} originalFileName - 原始文件名
 * @returns {Promise<{relativePath: string, absolutePath: string, fileName: string}>}
 */
export async function copyAudioToAppData(sourcePath, originalFileName) {
  try {
    const audioDir = await ensureAudioDir()
    
    // 生成唯一文件名: timestamp_原文件名
    const timestamp = Date.now()
    const ext = originalFileName.substring(originalFileName.lastIndexOf('.'))
    const baseName = originalFileName.substring(0, originalFileName.lastIndexOf('.'))
    const safeBaseName = baseName.replace(/[\\/:*?"<>|]/g, '_')
    const newFileName = `${timestamp}_${safeBaseName}${ext}`
    
    const destPath = await join(audioDir, newFileName)
    
    // 复制文件
    await copyFile(sourcePath, destPath)
    
    // 返回相对路径和绝对路径
    const relativePath = `${AUDIO_DIR}/${newFileName}`
    
    return {
      relativePath,
      absolutePath: destPath,
      fileName: newFileName
    }
  } catch (error) {
    console.error('[LocalAudioStorage] 复制音频文件失败:', error)
    throw error
  }
}

/**
 * 检查音频文件是否存在
 * @param {string} relativePath - 相对路径 (audio/xxx.mp3)
 * @returns {Promise<boolean>}
 */
export async function checkAudioExists(relativePath) {
  try {
    if (!relativePath) return false
    const appDir = await appDataDir()
    const fullPath = await join(appDir, relativePath)
    return await exists(fullPath)
  } catch (error) {
    console.error('[LocalAudioStorage] 检查音频文件失败:', error)
    return false
  }
}

/**
 * 获取音频文件的绝对路径
 * @param {string} relativePath - 相对路径
 * @returns {Promise<string|null>}
 */
export async function getAudioAbsolutePath(relativePath) {
  if (!relativePath) return null
  const appDir = await appDataDir()
  return await join(appDir, relativePath)
}

/**
 * 删除音频文件
 * @param {string} relativePath - 相对路径
 */
export async function deleteAudio(relativePath) {
  try {
    if (!relativePath) return
    const appDir = await appDataDir()
    const fullPath = await join(appDir, relativePath)
    const fileExists = await exists(fullPath)
    if (fileExists) {
      await remove(fullPath)
    }
  } catch (error) {
    console.error('[LocalAudioStorage] 删除音频文件失败:', error)
  }
}

/**
 * 判断文件是音频还是视频
 * @param {string} fileName - 文件名
 * @returns {'audio' | 'video' | 'unknown'}
 */
export function detectFileType(fileName) {
  const ext = fileName.toLowerCase().split('.').pop()
  const audioExts = ['mp3', 'wav', 'm4a', 'aac', 'flac', 'ogg', 'wma']
  const videoExts = ['mp4', 'mkv', 'avi', 'mov', 'wmv', 'flv', 'webm']
  
  if (audioExts.includes(ext)) return 'audio'
  if (videoExts.includes(ext)) return 'video'
  return 'unknown'
}

/**
 * 获取支持的文件扩展名
 * @returns {string[]}
 */
export function getSupportedExtensions() {
  return ['mp3', 'wav', 'm4a', 'aac', 'flac', 'ogg', 'wma', 'mp4', 'mkv', 'avi', 'mov', 'wmv', 'flv', 'webm']
}

export default {
  ensureAudioDir,
  copyAudioToAppData,
  checkAudioExists,
  getAudioAbsolutePath,
  deleteAudio,
  detectFileType,
  getSupportedExtensions
}

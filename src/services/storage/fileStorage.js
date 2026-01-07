/**
 * 本地文件存储服务
 * 使用 Tauri 文件系统 API 将数据存储到 AppData 目录
 */

import { readTextFile, writeTextFile, exists, mkdir, remove, BaseDirectory } from '@tauri-apps/plugin-fs'
import { appDataDir } from '@tauri-apps/api/path'

// 存储文件名常量
export const FILE_NAMES = {
  CONFIG: 'config.json',
  THEME: 'theme.json',
  BILIBILI_AUTH: 'bilibili_auth.json',
  DOWNLOAD_HISTORY: 'download_history.json',
  PARSE_HISTORY: 'parse_history.json'
}

// localStorage 键名（用于迁移）
const LEGACY_KEYS = {
  CONFIG: 'wenan_app_config',
  THEME: 'wenan_theme',
  WINDOW_EFFECT: 'wenan_window_effect',
  ACCENT_COLOR: 'wenan_accent_color',
  BILIBILI_AUTH: 'bilibili_auth',
  DOWNLOAD_HISTORY: 'wenan_download_history'
}

/**
 * 确保 AppData 目录存在
 */
export async function ensureAppDataDir() {
  try {
    const appDir = await appDataDir()
    const dirExists = await exists(appDir)
    if (!dirExists) {
      await mkdir(appDir, { recursive: true })
    }
    return true
  } catch (error) {
    console.error('[FileStorage] 创建 AppData 目录失败:', error)
    return false
  }
}

/**
 * 读取 JSON 文件
 * @param {string} filename - 文件名
 * @param {any} defaultValue - 默认值
 * @returns {Promise<any>}
 */
export async function readJsonFile(filename, defaultValue = null) {
  try {
    const fileExists = await exists(filename, { baseDir: BaseDirectory.AppData })
    if (!fileExists) {
      return defaultValue
    }
    const content = await readTextFile(filename, { baseDir: BaseDirectory.AppData })
    return JSON.parse(content)
  } catch (error) {
    console.error(`[FileStorage] 读取文件 ${filename} 失败:`, error)
    return defaultValue
  }
}

/**
 * 写入 JSON 文件
 * @param {string} filename - 文件名
 * @param {any} data - 要写入的数据
 * @returns {Promise<boolean>}
 */
export async function writeJsonFile(filename, data) {
  try {
    await ensureAppDataDir()
    await writeTextFile(filename, JSON.stringify(data, null, 2), {
      baseDir: BaseDirectory.AppData
    })
    return true
  } catch (error) {
    console.error(`[FileStorage] 写入文件 ${filename} 失败:`, error)
    return false
  }
}

/**
 * 删除文件
 * @param {string} filename - 文件名
 * @returns {Promise<boolean>}
 */
export async function removeFile(filename) {
  try {
    const fileExists = await exists(filename, { baseDir: BaseDirectory.AppData })
    if (fileExists) {
      await remove(filename, { baseDir: BaseDirectory.AppData })
    }
    return true
  } catch (error) {
    console.error(`[FileStorage] 删除文件 ${filename} 失败:`, error)
    return false
  }
}

/**
 * 检查文件是否存在
 * @param {string} filename - 文件名
 * @returns {Promise<boolean>}
 */
export async function fileExists(filename) {
  try {
    return await exists(filename, { baseDir: BaseDirectory.AppData })
  } catch {
    return false
  }
}

/**
 * 从 localStorage 迁移数据到文件存储
 * @param {string} legacyKey - localStorage 键名
 * @param {string} filename - 目标文件名
 * @param {Function} transform - 可选的数据转换函数
 * @returns {Promise<any>} 迁移的数据，如果没有数据则返回 null
 */
export async function migrateFromLocalStorage(legacyKey, filename, transform = null) {
  try {
    const stored = localStorage.getItem(legacyKey)
    if (!stored) {
      return null
    }

    let data = JSON.parse(stored)
    
    // 如果有转换函数，应用转换
    if (transform) {
      data = transform(data)
    }

    // 写入文件
    const success = await writeJsonFile(filename, data)
    
    if (success) {
      // 迁移成功后删除 localStorage 数据
      localStorage.removeItem(legacyKey)
      console.log(`[FileStorage] 成功迁移 ${legacyKey} 到 ${filename}`)
    }

    return data
  } catch (error) {
    console.error(`[FileStorage] 迁移 ${legacyKey} 失败:`, error)
    return null
  }
}

/**
 * 迁移配置数据
 * 从 localStorage 迁移到文件存储
 */
export async function migrateConfigData() {
  // 检查文件是否已存在，如果存在说明已经迁移过
  const configExists = await fileExists(FILE_NAMES.CONFIG)
  if (configExists) {
    return false // 已迁移
  }

  const migrated = await migrateFromLocalStorage(LEGACY_KEYS.CONFIG, FILE_NAMES.CONFIG)
  return migrated !== null
}

/**
 * 迁移主题数据
 * 将多个 localStorage 键合并为一个文件
 */
export async function migrateThemeData() {
  const themeExists = await fileExists(FILE_NAMES.THEME)
  if (themeExists) {
    return false // 已迁移
  }

  try {
    const mode = localStorage.getItem(LEGACY_KEYS.THEME)
    const windowEffect = localStorage.getItem(LEGACY_KEYS.WINDOW_EFFECT)
    const accentColor = localStorage.getItem(LEGACY_KEYS.ACCENT_COLOR)

    // 如果所有都为空，不需要迁移
    if (!mode && !windowEffect && !accentColor) {
      return false
    }

    const themeData = {
      mode: mode ? JSON.parse(mode) : 'dark',
      windowEffect: windowEffect ? JSON.parse(windowEffect) : 'none',
      accentColor: accentColor ? JSON.parse(accentColor) : 'blue'
    }

    const success = await writeJsonFile(FILE_NAMES.THEME, themeData)

    if (success) {
      localStorage.removeItem(LEGACY_KEYS.THEME)
      localStorage.removeItem(LEGACY_KEYS.WINDOW_EFFECT)
      localStorage.removeItem(LEGACY_KEYS.ACCENT_COLOR)
      console.log('[FileStorage] 成功迁移主题数据')
    }

    return success
  } catch (error) {
    console.error('[FileStorage] 迁移主题数据失败:', error)
    return false
  }
}

/**
 * 迁移 B站认证数据
 */
export async function migrateBilibiliAuthData() {
  const authExists = await fileExists(FILE_NAMES.BILIBILI_AUTH)
  if (authExists) {
    return false
  }

  const migrated = await migrateFromLocalStorage(LEGACY_KEYS.BILIBILI_AUTH, FILE_NAMES.BILIBILI_AUTH)
  return migrated !== null
}

/**
 * 迁移下载历史数据
 */
export async function migrateDownloadHistoryData() {
  const historyExists = await fileExists(FILE_NAMES.DOWNLOAD_HISTORY)
  if (historyExists) {
    return false
  }

  const migrated = await migrateFromLocalStorage(LEGACY_KEYS.DOWNLOAD_HISTORY, FILE_NAMES.DOWNLOAD_HISTORY)
  return migrated !== null
}

/**
 * 执行所有数据迁移
 */
export async function migrateAllData() {
  console.log('[FileStorage] 开始检查数据迁移...')
  
  const results = await Promise.all([
    migrateConfigData(),
    migrateThemeData(),
    migrateBilibiliAuthData(),
    migrateDownloadHistoryData()
  ])

  const migrated = results.some(r => r === true)
  
  if (migrated) {
    console.log('[FileStorage] 数据迁移完成')
  } else {
    console.log('[FileStorage] 无需迁移数据')
  }

  return migrated
}

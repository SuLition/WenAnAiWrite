/**
 * 小红书登录授权服务
 * 使用 Tauri 原生 WebView 窗口进行登录，自动获取 Cookie（包括 HttpOnly）
 */

import { invoke } from '@tauri-apps/api/core'
import { readJsonFile, writeJsonFile, removeFile, FILE_NAMES } from '../storage/fileStorage.js'
import { SERVICE_URL } from '../api/config.js'

// 内存缓存
let authCache = null
let cacheLoaded = false

// localStorage 缓存 key
const XHS_CACHE_KEY = 'catparse_xhs_auth_cache'

/**
 * 打开小红书登录窗口
 * 用户登录成功后自动获取 Cookie 并返回
 * @returns {Promise<string>} Cookie 字符串
 */
export async function openXhsLoginWindow() {
  try {
    // 调用 Tauri 命令打开登录窗口
    const cookieStr = await invoke('open_xhs_login')
    return cookieStr
  } catch (error) {
    console.error('[xiaohongshuAuth] 登录窗口错误:', error)
    throw error
  }
}

/**
 * 检查 Cookie 是否有效
 * @param {string} cookie - Cookie 字符串
 * @returns {Promise<boolean>}
 */
export async function checkXhsCookie(cookie) {
  try {
    return await invoke('check_xhs_cookie', { cookie })
  } catch (error) {
    console.error('[xiaohongshuAuth] 检查 Cookie 失败:', error)
    return false
  }
}

/**
 * 保存小红书登录信息
 * @param {object} authData - 登录信息 { cookie: string }
 */
export async function saveXhsAuth(authData) {
  try {
    const data = {
      ...authData,
      savedAt: Date.now()
    }
    const success = await writeJsonFile(FILE_NAMES.XHS_AUTH, data)
    if (success) {
      authCache = data
      cacheLoaded = true
      
      // 同步写入 localStorage 缓存
      try {
        localStorage.setItem(XHS_CACHE_KEY, JSON.stringify(data))
      } catch (e) {
        // 忽略
      }
      
      // 同步到 Python 后端服务
      await syncCookieToBackend(authData.cookie)
    }
    return success
  } catch (e) {
    console.error('[xiaohongshuAuth] 保存登录信息失败:', e)
    return false
  }
}

/**
 * 加载小红书登录信息
 * @returns {Promise<object|null>} 登录信息
 */
export async function loadXhsAuth() {
  try {
    // 如果有内存缓存，直接返回
    if (cacheLoaded && authCache !== null) {
      return authCache
    }
    
    // 从文件读取
    const data = await readJsonFile(FILE_NAMES.XHS_AUTH)
    authCache = data
    cacheLoaded = true
    
    // 同步更新 localStorage 缓存
    if (data) {
      try {
        localStorage.setItem(XHS_CACHE_KEY, JSON.stringify(data))
      } catch (e) {
        // 忽略
      }
    }
    
    // 如果有有效的 Cookie，同步到后端
    if (data?.cookie) {
      await syncCookieToBackend(data.cookie)
    }
    
    return data
  } catch (e) {
    console.error('[xiaohongshuAuth] 加载登录信息失败:', e)
    return null
  }
}

/**
 * 同步从 localStorage 读取缓存（用于初始化，避免闪烁）
 * @returns {object|null}
 */
export function loadXhsAuthSync() {
  try {
    const cached = localStorage.getItem(XHS_CACHE_KEY)
    if (cached) {
      const data = JSON.parse(cached)
      authCache = data
      cacheLoaded = true
      return data
    }
  } catch (e) {
    // 忽略
  }
  return null
}

/**
 * 清除小红书登录信息
 */
export async function clearXhsAuth() {
  await removeFile(FILE_NAMES.XHS_AUTH)
  authCache = null
  cacheLoaded = true
  
  // 清除 localStorage 缓存
  try {
    localStorage.removeItem(XHS_CACHE_KEY)
  } catch (e) {
    // 忽略
  }
  
  // 清除后端的 Cookie
  await syncCookieToBackend('')
}

/**
 * 检查是否已登录
 * @returns {Promise<boolean>}
 */
export async function isXhsLoggedIn() {
  const auth = await loadXhsAuth()
  return !!(auth && auth.cookie)
}

/**
 * 获取 Cookie 字符串
 * @returns {Promise<string>}
 */
export async function getXhsCookie() {
  const auth = await loadXhsAuth()
  return auth?.cookie || ''
}

/**
 * 同步 Cookie 到 Python 后端服务
 * @param {string} cookie - Cookie 字符串
 */
async function syncCookieToBackend(cookie) {
  try {
    const response = await fetch(`${SERVICE_URL}/config/xhs-cookie`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ cookie })
    })
    
    if (!response.ok) {
      console.warn('[xiaohongshuAuth] 同步 Cookie 到后端失败:', response.status)
    }
  } catch (e) {
    // 后端服务可能未启动，忽略错误
    console.warn('[xiaohongshuAuth] 同步 Cookie 到后端失败:', e.message)
  }
}

/**
 * 执行登录流程
 * 打开登录窗口，登录成功后保存 Cookie
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function performLogin() {
  try {
    const cookieStr = await openXhsLoginWindow()
    
    if (!cookieStr) {
      return { success: false, message: '未获取到 Cookie' }
    }
    
    // 保存 Cookie
    await saveXhsAuth({ cookie: cookieStr })
    
    return { success: true, message: '登录成功' }
  } catch (error) {
    return { success: false, message: error.toString() }
  }
}

export default {
  openXhsLoginWindow,
  checkXhsCookie,
  saveXhsAuth,
  loadXhsAuth,
  loadXhsAuthSync,
  clearXhsAuth,
  isXhsLoggedIn,
  getXhsCookie,
  performLogin
}

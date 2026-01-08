/**
 * 通用请求工具
 * 带重试机制的 fetch 封装
 */

/**
 * 判断是否为可重试的错误
 * @param {Error} error - 错误对象
 * @returns {boolean}
 */
function isRetryableError(error) {
  const message = error.message || ''
  return (
    message.includes('SSL') ||
    message.includes('network') ||
    message.includes('ECONNRESET') ||
    message.includes('ETIMEDOUT') ||
    message.includes('ENOTFOUND') ||
    message.includes('fetch failed') ||
    message.includes('Failed to fetch') ||
    message.includes('Network request failed') ||
    message.includes('AbortError') ||
    error.name === 'TypeError'
  )
}

/**
 * 延迟函数
 * @param {number} ms - 毫秒数
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * 带重试机制的 fetch
 * @param {string} url - 请求地址
 * @param {object} options - fetch 选项
 * @param {object} retryOptions - 重试选项
 * @param {number} retryOptions.retries - 最大重试次数，默认 3
 * @param {number} retryOptions.retryDelay - 重试间隔基数(ms)，默认 1000
 * @param {number} retryOptions.timeout - 请求超时时间(ms)，默认 30000
 * @returns {Promise<Response>}
 */
export async function fetchWithRetry(url, options = {}, retryOptions = {}) {
  const {
    retries = 3,
    retryDelay = 1000,
    timeout = 30000
  } = retryOptions

  let lastError

  for (let attempt = 1; attempt <= retries; attempt++) {
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
      lastError = error

      // 判断是否应该重试
      const shouldRetry = isRetryableError(error) && attempt < retries

      if (shouldRetry) {
        const waitTime = retryDelay * attempt
        console.log(`[Request] 请求失败，${waitTime}ms 后重试 (${attempt}/${retries}):`, error.message)
        await delay(waitTime)
        continue
      }

      // 超时错误特殊处理
      if (error.name === 'AbortError') {
        throw new Error('请求超时，请稍后重试')
      }

      throw error
    }
  }

  throw lastError
}

/**
 * 带重试的 JSON 请求
 * @param {string} url - 请求地址
 * @param {object} options - fetch 选项
 * @param {object} retryOptions - 重试选项
 * @returns {Promise<any>} JSON 响应数据
 */
export async function fetchJsonWithRetry(url, options = {}, retryOptions = {}) {
  const response = await fetchWithRetry(url, options, retryOptions)

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }

  return response.json()
}

export default {
  fetchWithRetry,
  fetchJsonWithRetry
}

/**
 * 腾讯云语音识别服务
 * 文档: https://cloud.tencent.com/document/product/1093
 */

import CryptoJS from 'crypto-js'
import { useConfigStore } from '@/stores'
import { SERVICE_URL } from './api/config.js'
import { fetchWithRetry } from '@/utils/request.js'

// 获取配置
function getConfig() {
  const configStore = useConfigStore()
  const config = configStore.config.tencentAsr || {}
  console.log('[TencentASR] 读取配置:', { secretId: config.secretId ? '已配置' : '未配置', secretKey: config.secretKey ? '已配置' : '未配置' })
  return {
    secretId: config.secretId || '',
    secretKey: config.secretKey || '',
    service: 'asr',
    host: 'asr.tencentcloudapi.com',
    region: 'ap-shanghai'
  }
}

/**
 * 生成腾讯云 TC3 签名
 */
function generateSign(payload, action, timestamp) {
  const config = getConfig()
  const date = new Date(timestamp * 1000).toISOString().split('T')[0]
  const algorithm = 'TC3-HMAC-SHA256'
  
  // 1. 拼接规范请求串
  const httpRequestMethod = 'POST'
  const canonicalUri = '/'
  const canonicalQueryString = ''
  const contentType = 'application/json; charset=utf-8'
  const canonicalHeaders = `content-type:${contentType}\nhost:${config.host}\nx-tc-action:${action.toLowerCase()}\n`
  const signedHeaders = 'content-type;host;x-tc-action'
  const hashedRequestPayload = CryptoJS.SHA256(payload).toString(CryptoJS.enc.Hex)
  const canonicalRequest = `${httpRequestMethod}
${canonicalUri}
${canonicalQueryString}
${canonicalHeaders}
${signedHeaders}
${hashedRequestPayload}`
  
  // 2. 拼接待签名字符串
  const credentialScope = `${date}/${config.service}/tc3_request`
  const hashedCanonicalRequest = CryptoJS.SHA256(canonicalRequest).toString(CryptoJS.enc.Hex)
  const stringToSign = `${algorithm}\n${timestamp}\n${credentialScope}\n${hashedCanonicalRequest}`
  
  // 3. 计算签名
  const secretDate = CryptoJS.HmacSHA256(date, 'TC3' + config.secretKey)
  const secretService = CryptoJS.HmacSHA256(config.service, secretDate)
  const secretSigning = CryptoJS.HmacSHA256('tc3_request', secretService)
  const signature = CryptoJS.HmacSHA256(stringToSign, secretSigning).toString(CryptoJS.enc.Hex)
  
  // 4. 拼接 Authorization
  const authorization = `${algorithm} Credential=${config.secretId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`
  
  return authorization
}

/**
 * 调用腾讯云 API
 */
async function callTencentApi(action, params) {
  const config = getConfig()
  
  if (!config.secretId || !config.secretKey) {
    throw new Error('请先配置腾讯云 SecretId 和 SecretKey')
  }
  
  const timestamp = Math.floor(Date.now() / 1000)
  const payload = JSON.stringify(params)
  const authorization = generateSign(payload, action, timestamp)
  
  // 使用后端代理（带重试机制）
  const response = await fetchWithRetry(`${SERVICE_URL}/proxy/tencent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: 'https://asr.tencentcloudapi.com',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Host': config.host,
        'X-TC-Action': action,
        'X-TC-Version': '2019-06-14',
        'X-TC-Timestamp': timestamp.toString(),
        'X-TC-Region': config.region,
        'Authorization': authorization
      },
      body: payload
    })
  }, { timeout: 30000, retries: 3, retryDelay: 1000 })
  
  const proxyResult = await response.json()
  if (!proxyResult.success) {
    throw new Error(proxyResult.message || '代理请求失败')
  }
  
  const result = proxyResult.data
  
  if (result.Response?.Error) {
    throw new Error(`${result.Response.Error.Code}: ${result.Response.Error.Message}`)
  }
  
  return result.Response
}

/**
 * 创建录音文件识别任务
 * @param {string} url - 音频文件URL
 * @param {string} format - 音频格式 (mp3, wav, m4a等)
 */
export async function createRecognitionTask(url, format = 'mp3') {
  const engineType = '16k_zh' // 中文普通话
  
  const params = {
    EngineModelType: engineType,
    ChannelNum: 1,
    ResTextFormat: 0, // 返回纯文本
    SourceType: 0, // URL方式
    Url: url
  }
  
  const result = await callTencentApi('CreateRecTask', params)
  return result.Data?.TaskId
}

/**
 * 创建录音文件识别任务 - Base64方式
 * @param {string} base64Data - 音频文件Base64数据
 * @param {string} format - 音频格式 (mp3, wav, m4a等)
 */
export async function createRecognitionTaskWithData(base64Data, format = 'm4a') {
  const engineType = '16k_zh' // 中文普通话
  
  const params = {
    EngineModelType: engineType,
    ChannelNum: 1,
    ResTextFormat: 0, // 返回纯文本
    SourceType: 1, // 本地数据方式
    Data: base64Data,
    DataLen: base64Data.length
  }
  
  const result = await callTencentApi('CreateRecTask', params)
  return result.Data?.TaskId
}

/**
 * 查询识别任务状态
 * @param {number} taskId - 任务ID
 */
export async function getTaskStatus(taskId) {
  const params = {
    TaskId: taskId
  }
  
  const result = await callTencentApi('DescribeTaskStatus', params)
  return result.Data
}

/**
 * 轮询等待识别完成
 * @param {number} taskId - 任务ID
 * @param {function} onProgress - 进度回调
 */
export async function waitForResult(taskId, onProgress) {
  const maxRetries = 60 // 最多等待60次，每次2秒
  let retries = 0
  
  while (retries < maxRetries) {
    const status = await getTaskStatus(taskId)
    
    // 状态: 0-任务等待，1-任务执行中，2-任务成功，3-任务失败
    if (status.Status === 2) {
      return status.Result
    } else if (status.Status === 3) {
      throw new Error(status.ErrorMsg || '识别失败')
    }
    
    if (onProgress) {
      onProgress(status.Status, retries, maxRetries)
    }
    
    // 等待2秒后重试
    await new Promise(resolve => setTimeout(resolve, 2000))
    retries++
  }
  
  throw new Error('识别超时，请稍后重试')
}

/**
 * 完整的语音识别流程
 * @param {string} audioUrl - 音频URL
 * @param {function} onProgress - 进度回调
 */
export async function recognizeAudio(audioUrl, onProgress) {
  // 1. 创建识别任务
  if (onProgress) onProgress('creating', '正在创建识别任务...')
  const taskId = await createRecognitionTask(audioUrl)
  
  if (!taskId) {
    throw new Error('创建识别任务失败')
  }
  
  // 2. 等待识别完成
  if (onProgress) onProgress('processing', '正在识别中...')
  const result = await waitForResult(taskId, (status, current, total) => {
    if (onProgress) {
      const percent = Math.round((current / total) * 100)
      onProgress('processing', `识别中... ${percent}%`)
    }
  })
  
  if (onProgress) onProgress('done', '识别完成')
  return result
}

/**
 * 完整的语音识别流程 - Base64方式
 * @param {string} base64Data - 音频Base64数据
 * @param {function} onProgress - 进度回调
 */
export async function recognizeAudioWithData(base64Data, onProgress) {
  // 1. 创建识别任务
  if (onProgress) onProgress('creating', '正在创建识别任务...')
  const taskId = await createRecognitionTaskWithData(base64Data)
  
  if (!taskId) {
    throw new Error('创建识别任务失败')
  }
  
  // 2. 等待识别完成
  if (onProgress) onProgress('processing', '正在识别中...')
  const result = await waitForResult(taskId, (status, current, total) => {
    if (onProgress) {
      const percent = Math.round((current / total) * 100)
      onProgress('processing', `识别中... ${percent}%`)
    }
  })
  
  if (onProgress) onProgress('done', '识别完成')
  return result
}

export default {
  recognizeAudio,
  recognizeAudioWithData,
  createRecognitionTask,
  createRecognitionTaskWithData,
  getTaskStatus,
  waitForResult
}

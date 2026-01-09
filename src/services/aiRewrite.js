/**
 * AI文案改写服务
 */

import { useConfigStore } from '@/stores'
import { SERVICE_URL } from './api/config.js'
import { DEFAULT_PROMPTS } from '@/constants'
import { fetchWithRetry } from '@/utils/request.js'

/**
 * 获取提示词
 */
function getPrompt(style) {
  const configStore = useConfigStore()
  const prompts = configStore.config.prompts || {}
  return prompts[style] || DEFAULT_PROMPTS[style] || DEFAULT_PROMPTS.professional
}

/**
 * 豆包AI改写
 * @param {string} text - 原始文案
 * @param {string} style - 改写风格
 * @param {string} customPrompt - 自定义提示词（追加到默认提示词之后）
 * @returns {Promise<string>} - 改写后的文案
 */
export async function rewriteWithDoubao(text, style = 'professional', customPrompt = '') {
  const configStore = useConfigStore()
  const config = configStore.config.doubao || {}
  console.log('[AIRewrite] 读取豆包配置:', { apiKey: config.apiKey ? '已配置' : '未配置', model: config.model })
  
  if (!config.apiKey) {
    throw new Error('请先配置豆包 API Key')
  }
  
  let prompt = getPrompt(style)
  
  // 追加自定义提示词
  if (customPrompt && customPrompt.trim()) {
    prompt = prompt + '\n\n额外要求: ' + customPrompt.trim()
  }
  
  const requestBody = JSON.stringify({
    model: config.model || 'doubao-seed-1-6-251015',
    messages: [
      {
        role: 'system',
        content: '你是一个专业的文案改写助手，擅长将视频文案改写成不同风格。请直接输出改写后的文案，不要添加任何解释或前缀。'
      },
      {
        role: 'user',
        content: `${prompt}\n\n${text}`
      }
    ],
    max_tokens: 2000,
    temperature: 0.7
  })

  // 使用后端代理（带重试机制）
  const response = await fetchWithRetry(`${SERVICE_URL}/proxy/doubao`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
      body: requestBody
    })
  }, { timeout: 60000 }) // AI请求超时时间设为60秒

  const proxyResult = await response.json()
  console.log('[AIRewrite] 代理响应:', proxyResult)
  
  if (!proxyResult.success) {
    console.error('豆包API代理错误:', proxyResult.message)
    throw new Error('AI改写请求失败')
  }

  const data = proxyResult.data
  console.log('[AIRewrite] API返回数据:', data)
  
  const content = data.choices?.[0]?.message?.content
  console.log('[AIRewrite] 提取的内容:', content)
  
  if (!content) {
    throw new Error('改写结果为空，请重试')
  }
  
  return content
}

/**
 * 通用AI改写接口
 * @param {string} text - 原始文案
 * @param {string} style - 改写风格
 * @param {string} model - AI模型
 * @param {string} customPrompt - 自定义提示词
 * @returns {Promise<string>} - 改写后的文案
 */
export async function rewriteText(text, style = 'professional', model = 'doubao', customPrompt = '') {
  if (!text || !text.trim()) {
    throw new Error('请输入要改写的文案')
  }

  switch (model) {
    case 'doubao':
      return rewriteWithDoubao(text, style, customPrompt)
    case 'deepseek':
      throw new Error('DeepSeek模型暂未配置')
    case 'qianwen':
      throw new Error('千问模型暂未配置')
    case 'hunyuan':
      throw new Error('元宝模型暂未配置')
    default:
      return rewriteWithDoubao(text, style, customPrompt)
  }
}

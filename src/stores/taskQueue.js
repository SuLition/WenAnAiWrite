/**
 * 任务队列 Store
 * 管理后台任务（文案提取、文案改写）
 * 每个任务只有一种类型和一个状态
 */

import { defineStore } from 'pinia'
import { toast } from 'vue-sonner'
import { useConfigStore } from './config'
import { useHistoryStore } from './history'
import { fetchWithRetry } from '@/utils/request.js'

// 任务状态常量
export const TASK_STATUS = {
  QUEUED: 'queued',       // 排队中
  RUNNING: 'running',     // 执行中
  SUCCESS: 'success',     // 完成
  ERROR: 'error'          // 失败
}

// 任务类型常量
export const TASK_TYPE = {
  EXTRACT: 'extract',     // 文案提取
  REWRITE: 'rewrite'      // 文案改写
}

// 默认最大并行任务数
const DEFAULT_MAX_CONCURRENT = 3

export const useTaskQueueStore = defineStore('taskQueue', {
  state: () => ({
    tasks: [],
    runningCount: 0
  }),

  getters: {
    totalCount: (state) => state.tasks.length,
    
    pendingTasks: (state) => state.tasks.filter(t => t.status === TASK_STATUS.QUEUED),
    
    runningTasks: (state) => state.tasks.filter(t => t.status === TASK_STATUS.RUNNING),
    
    hasPendingTasks: (state) => state.tasks.some(t => 
      t.status === TASK_STATUS.QUEUED || t.status === TASK_STATUS.RUNNING
    ),
    
    maxConcurrent: () => {
      try {
        const configStore = useConfigStore()
        return configStore.config.taskQueue?.maxConcurrent || DEFAULT_MAX_CONCURRENT
      } catch {
        return DEFAULT_MAX_CONCURRENT
      }
    }
  },

  actions: {
    /**
     * 添加任务
     * @param {Object} taskData - 任务数据
     * @param {string} taskData.type - 任务类型 (extract/rewrite)
     * @param {number} taskData.historyId - 关联的历史记录ID
     * @param {Object} taskData.videoInfo - 完整视频信息
     * @param {Object} taskData.params - 任务参数
     */
    addTask(taskData) {
      const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const videoInfo = taskData.videoInfo || {}
      
      const task = {
        id: taskId,
        type: taskData.type, // 'extract' 或 'rewrite'
        historyId: taskData.historyId,
        cover: videoInfo.cover || '',
        title: videoInfo.title || '未命名任务',
        platform: videoInfo.platform || '',
        videoInfo: videoInfo,
        params: taskData.params || {},
        status: TASK_STATUS.QUEUED,
        error: null,
        createdAt: Date.now()
      }
      
      this.tasks.unshift(task)
      this._scheduleNext()
      
      return taskId
    },

    removeTask(taskId) {
      const index = this.tasks.findIndex(t => t.id === taskId)
      if (index !== -1) {
        this.tasks.splice(index, 1)
      }
    },

    clearCompleted() {
      this.tasks = this.tasks.filter(t => 
        t.status === TASK_STATUS.QUEUED || t.status === TASK_STATUS.RUNNING
      )
    },

    retryTask(taskId) {
      const task = this.tasks.find(t => t.id === taskId)
      if (task && task.status === TASK_STATUS.ERROR) {
        task.status = TASK_STATUS.QUEUED
        task.error = null
        this._scheduleNext()
      }
    },

    _scheduleNext() {
      const maxConcurrent = this.maxConcurrent
      if (this.runningCount >= maxConcurrent) return
      
      for (const task of this.tasks) {
        if (this.runningCount >= maxConcurrent) break
        
        if (task.status === TASK_STATUS.QUEUED) {
          if (task.type === TASK_TYPE.EXTRACT) {
            this._executeExtract(task)
          } else if (task.type === TASK_TYPE.REWRITE) {
            this._executeRewrite(task)
          }
        }
      }
    },

    async _executeExtract(task) {
      task.status = TASK_STATUS.RUNNING
      this.runningCount++
      
      try {
        const { recognizeAudioWithData } = await import('@/services/tencentAsr.js')
        const { downloadAudioData } = await import('@/services/download/downloadService.js')
        
        const videoInfo = task.videoInfo
        let result = ''
        
        if (videoInfo.platform === 'bilibili') {
          const audioStream = videoInfo.audioStream
          let audioUrl = audioStream?.url
          const backupUrls = audioStream?.backupUrl || []
          
          const isPcdn = audioUrl && (audioUrl.includes('mcdn.bilivideo') || audioUrl.includes('.szbdyd.com'))
          if (isPcdn && backupUrls.length > 0) {
            audioUrl = backupUrls[0]
          }
          
          if (!audioUrl) throw new Error('未获取到B站音频链接')
          
          const audioData = await downloadAudioData(audioUrl, 'bilibili', () => {})
          const MAX_SIZE = 5 * 1024 * 1024
          const finalData = audioData.length > MAX_SIZE ? audioData.slice(0, MAX_SIZE) : audioData
          
          const chunkSize = 32768
          let binary = ''
          for (let i = 0; i < finalData.length; i += chunkSize) {
            const chunk = finalData.subarray(i, Math.min(i + chunkSize, finalData.length))
            binary += String.fromCharCode.apply(null, chunk)
          }
          result = await recognizeAudioWithData(btoa(binary), () => {})
          
        } else if (videoInfo.platform === 'douyin') {
          const audioStream = videoInfo.audioStream
          let audioUrl = audioStream?.url
          const isVideoAudio = audioStream?.isVideoAudio || false
          
          if (!audioUrl) throw new Error('未获取到抖音音频链接')
          
          let base64Data = ''
          if (isVideoAudio) {
            const extractResponse = await fetchWithRetry('http://127.0.0.1:3721/extract-audio', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ video_url: audioUrl, platform: 'douyin' })
            }, { timeout: 120000 }) // 音频提取可能较慢
            const extractResult = await extractResponse.json()
            if (!extractResult.success) throw new Error(extractResult.message || '音频提取失败')
            base64Data = extractResult.audio_base64
          } else {
            const audioData = await downloadAudioData(audioUrl, 'douyin', () => {})
            const MAX_SIZE = 5 * 1024 * 1024
            const finalData = audioData.length > MAX_SIZE ? audioData.slice(0, MAX_SIZE) : audioData
            const chunkSize = 32768
            let binary = ''
            for (let i = 0; i < finalData.length; i += chunkSize) {
              const chunk = finalData.subarray(i, Math.min(i + chunkSize, finalData.length))
              binary += String.fromCharCode.apply(null, chunk)
            }
            base64Data = btoa(binary)
          }
          result = await recognizeAudioWithData(base64Data, () => {})
          
        } else if (videoInfo.platform === 'xiaohongshu') {
          if (!videoInfo.isVideo) throw new Error('图文笔记不支持文案提取')
          
          const videoUrl = videoInfo.audioStream?.url || videoInfo.videoUrl
          if (!videoUrl) throw new Error('未获取到小红书视频链接')
          
          const extractResponse = await fetchWithRetry('http://127.0.0.1:3721/extract-audio', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ video_url: videoUrl, platform: 'xiaohongshu' })
          }, { timeout: 120000 }) // 音频提取可能较慢
          const extractResult = await extractResponse.json()
          if (!extractResult.success) throw new Error(extractResult.message || '音频提取失败')
          result = await recognizeAudioWithData(extractResult.audio_base64, () => {})
          
        } else {
          throw new Error('该平台文案提取服务开发中')
        }
        
        const historyStore = useHistoryStore()
        await historyStore.update(task.historyId, { originalText: result || '未识别到语音内容' })
        
        task.status = TASK_STATUS.SUCCESS
        toast.success(`「${task.title}」文案提取完成`)
        
        // 完成后自动删除
        setTimeout(() => this.removeTask(task.id), 1500)
        
      } catch (error) {
        console.error('文案提取失败:', error)
        task.status = TASK_STATUS.ERROR
        task.error = error.message
        toast.error(`「${task.title}」提取失败: ${error.message}`)
      } finally {
        this.runningCount--
        this._scheduleNext()
      }
    },

    async _executeRewrite(task) {
      task.status = TASK_STATUS.RUNNING
      this.runningCount++
      
      try {
        const { rewriteText } = await import('@/services/aiRewrite.js')
        const historyStore = useHistoryStore()
        
        const history = historyStore.list.find(h => h.id === task.historyId)
        const originalText = history?.originalText
        
        if (!originalText) {
          throw new Error('请先提取文案')
        }
        
        const { rewriteStyle, aiModel } = task.params
        const result = await rewriteText(originalText, rewriteStyle || 'professional', aiModel || 'doubao')
        
        await historyStore.update(task.historyId, { rewrittenText: result })
        
        task.status = TASK_STATUS.SUCCESS
        toast.success(`「${task.title}」文案改写完成`)
        
        // 完成后自动删除
        setTimeout(() => this.removeTask(task.id), 1500)
        
      } catch (error) {
        console.error('文案改写失败:', error)
        task.status = TASK_STATUS.ERROR
        task.error = error.message
        toast.error(`「${task.title}」改写失败: ${error.message}`)
      } finally {
        this.runningCount--
        this._scheduleNext()
      }
    }
  }
})

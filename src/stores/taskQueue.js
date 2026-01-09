/**
 * 任务队列 Store
 * 管理后台任务（文案提取、文案改写、视频下载）
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
  REWRITE: 'rewrite',     // 文案改写
  DOWNLOAD: 'download'    // 视频下载
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
     * @param {string} taskData.type - 任务类型 (extract/rewrite/download)
     * @param {string} taskData.title - 任务标题
     * @param {string} taskData.cover - 封面图
     * @param {string} taskData.platform - 平台
     * @param {number} taskData.historyId - 关联的历史记录ID
     * @param {Object} taskData.videoInfo - 完整视频信息
     * @param {Object} taskData.params - 任务参数
     * @param {Object} taskData.data - 本地任务数据
     */
    addTask(taskData) {
      const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const videoInfo = taskData.videoInfo || {}
      
      const task = {
        id: taskId,
        type: taskData.type, // 'extract' / 'rewrite' / 'download'
        historyId: taskData.historyId,
        cover: taskData.cover || videoInfo.cover || '',
        title: taskData.title || videoInfo.title || '未命名任务',
        platform: taskData.platform || videoInfo.platform || '',
        videoInfo: videoInfo,
        params: taskData.params || {},
        data: taskData.data || {}, // 本地任务扩展数据
        status: TASK_STATUS.QUEUED,
        error: null,
        createdAt: Date.now(),
        // 下载任务特有字段
        progress: 0,
        progressText: ''
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
        // 下载任务重置进度
        if (task.type === TASK_TYPE.DOWNLOAD) {
          task.progress = 0
          task.progressText = ''
        }
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
          } else if (task.type === TASK_TYPE.DOWNLOAD) {
            this._executeDownload(task)
          }
        }
      }
    },

    async _executeExtract(task) {
      task.status = TASK_STATUS.RUNNING
      this.runningCount++
      
      try {
        const { recognizeAudioWithData } = await import('@/services/tencentAsr.js')
        const historyStore = useHistoryStore()
        
        // 本地音频识别
        if (task.data?.isLocal && task.data?.localType === 'audio') {
          const { getAudioAbsolutePath, checkAudioExists } = await import('@/services/storage/localAudioStorage.js')
          const { readFile } = await import('@tauri-apps/plugin-fs')
          
          const audioPath = task.data.localAudioPath
          const exists = await checkAudioExists(audioPath)
          if (!exists) {
            throw new Error('找不到音频文件')
          }
          
          const absolutePath = await getAudioAbsolutePath(audioPath)
          const audioData = await readFile(absolutePath)
          
          const MAX_SIZE = 5 * 1024 * 1024
          const finalData = audioData.length > MAX_SIZE ? audioData.slice(0, MAX_SIZE) : audioData
          
          const chunkSize = 32768
          let binary = ''
          for (let i = 0; i < finalData.length; i += chunkSize) {
            const chunk = finalData.subarray(i, Math.min(i + chunkSize, finalData.length))
            binary += String.fromCharCode.apply(null, chunk)
          }
          const result = await recognizeAudioWithData(btoa(binary), () => {})
          
          // 创建历史记录
          const historyId = await historyStore.add({
            title: task.title,
            platform: 'local',
            originalText: result || '未识别到语音内容',
            isLocal: true,
            localType: 'audio',
            localAudioPath: audioPath,
            localSourceType: task.data.localSourceType
          })
          
          task.historyId = historyId
          task.status = TASK_STATUS.SUCCESS
          toast.success(`「${task.title}」文案提取完成`)
          
          setTimeout(() => this.removeTask(task.id), 1500)
          return
        }
        
        // 网络视频文案提取（原有逻辑）
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
        
        // 本地文案改写
        if (task.data?.isLocal && task.data?.localType === 'text') {
          const originalText = task.data.originalText
          if (!originalText) {
            throw new Error('文案内容不能为空')
          }
          
          const model = task.data.model || 'doubao'
          const style = task.data.style || 'normal'
          const customPrompt = task.data.customPrompt || ''
          
          const result = await rewriteText(originalText, style, model, customPrompt)
          
          // 创建历史记录
          const historyId = await historyStore.add({
            title: task.title,
            platform: 'local',
            originalText: originalText,
            rewrittenText: result,
            isLocal: true,
            localType: 'text'
          })
          
          task.historyId = historyId
          task.status = TASK_STATUS.SUCCESS
          toast.success(`「${task.title}」文案改写完成`)
          
          setTimeout(() => this.removeTask(task.id), 1500)
          return
        }
        
        // 网络视频文案改写（原有逻辑）
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
    },

    async _executeDownload(task) {
      task.status = TASK_STATUS.RUNNING
      task.progress = 0
      task.progressText = '准备下载...'
      this.runningCount++
      
      try {
        const { downloadBilibili, downloadDouyin, downloadXiaohongshu } = 
          await import('@/services/download/downloadService.js')
        
        const { downloadParams } = task.params
        const platform = task.platform
        
        const onProgress = (progress) => {
          task.progress = Math.min(Math.max(progress, 0), 100)
          task.progressText = `${task.progress}%`
        }
        
        if (platform === 'bilibili') {
          await downloadBilibili(
            downloadParams.url,
            downloadParams.fileName,
            onProgress,
            { backupUrls: downloadParams.backupUrls || [] }
          )
        } else if (platform === 'douyin') {
          await downloadDouyin(
            downloadParams.url,
            downloadParams.fileName,
            onProgress,
            { backupUrls: downloadParams.backupUrls || [] }
          )
        } else if (platform === 'xiaohongshu') {
          await downloadXiaohongshu(
            downloadParams.url,
            downloadParams.fileName,
            onProgress,
            { backupUrls: downloadParams.backupUrls || [] }
          )
        } else {
          throw new Error('不支持的平台')
        }
        
        task.status = TASK_STATUS.SUCCESS
        task.progress = 100
        task.progressText = '完成'
        toast.success(`「${task.title}」下载完成`)
        
        // 完成后自动删除
        setTimeout(() => this.removeTask(task.id), 1500)
        
      } catch (error) {
        console.error('视频下载失败:', error)
        task.status = TASK_STATUS.ERROR
        task.error = error.message
        toast.error(`「${task.title}」下载失败: ${error.message}`)
      } finally {
        this.runningCount--
        this._scheduleNext()
      }
    }
  }
})

/**
 * 历史记录 Store
 * 管理解析历史记录
 */

import { defineStore } from 'pinia'
import { readTextFile, writeTextFile, exists, mkdir, BaseDirectory } from '@tauri-apps/plugin-fs'
import { appDataDir } from '@tauri-apps/api/path'
import { useConfigStore } from './config'

const HISTORY_FILE = 'parse_history.json'
const DEFAULT_MAX_RECORDS = 100

export const useHistoryStore = defineStore('history', {
  state: () => ({
    // 历史记录列表
    list: [],
    // 加载状态
    loading: false
  }),

  getters: {
    // 记录数量
    count: (state) => state.list.length,
    // 是否为空
    isEmpty: (state) => state.list.length === 0,
    // 根据ID获取记录
    getById: (state) => (id) => state.list.find(item => item.id === id)
  },

  actions: {
    /**
     * 获取最大记录数量配置
     */
    _getMaxRecords() {
      try {
        const configStore = useConfigStore()
        return configStore.config.history?.maxRecords || DEFAULT_MAX_RECORDS
      } catch {
        return DEFAULT_MAX_RECORDS
      }
    },

    /**
     * 确保 AppData 目录存在
     */
    async _ensureAppDataDir() {
      try {
        const appDir = await appDataDir()
        const dirExists = await exists(appDir)
        if (!dirExists) {
          await mkdir(appDir, { recursive: true })
        }
      } catch (error) {
        console.error('创建 AppData 目录失败:', error)
        throw error
      }
    },

    /**
     * 保存历史记录到文件
     */
    async _save() {
      try {
        await this._ensureAppDataDir()
        await writeTextFile(HISTORY_FILE, JSON.stringify(this.list, null, 2), {
          baseDir: BaseDirectory.AppData
        })
        return true
      } catch (error) {
        console.error('保存解析历史失败:', error)
        return false
      }
    },

    /**
     * 加载历史记录
     */
    async load() {
      this.loading = true
      try {
        const fileExists = await exists(HISTORY_FILE, { baseDir: BaseDirectory.AppData })
        if (!fileExists) {
          this.list = []
          return []
        }
        const content = await readTextFile(HISTORY_FILE, { baseDir: BaseDirectory.AppData })
        this.list = JSON.parse(content)
        return this.list
      } catch (error) {
        console.error('读取解析历史失败:', error)
        this.list = []
        return []
      } finally {
        this.loading = false
      }
    },

    /**
     * 添加历史记录
     * @param {Object} record - 历史记录对象
     * @param {string} record.cover - 封面图
     * @param {string} record.title - 标题
     * @param {string} record.platform - 平台
     * @param {string} record.originalUrl - 原始链接
     * @param {string} record.videoId - 视频ID
     * @param {string} record.originalText - 原始文案
     * @param {string} record.rewrittenText - 改写文案
     * @param {Object} record.videoInfo - 完整视频信息（新增）
     * @param {Array} record.qualityOptions - 画质选项（新增）
     */
    async add(record) {
      // 根据 videoId 和 platform 去重
      if (record.videoId) {
        this.list = this.list.filter(item =>
          !(item.videoId === record.videoId && item.platform === record.platform)
        )
      }

      const id = Date.now()
      const newRecord = {
        id,
        ...record,
        createTime: new Date().toLocaleString('zh-CN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        }).replace(/\//g, '-')
      }

      // 添加到列表开头
      this.list.unshift(newRecord)

      // 限制最大条数
      const maxRecords = this._getMaxRecords()
      if (this.list.length > maxRecords) {
        this.list.splice(maxRecords)
      }

      const success = await this._save()
      return success ? id : null
    },

    /**
     * 删除历史记录
     */
    async delete(id) {
      this.list = this.list.filter(item => item.id !== id)
      return await this._save()
    },

    /**
     * 清空所有历史记录
     */
    async clear() {
      this.list = []
      return await this._save()
    },

    /**
     * 更新历史记录
     */
    async update(id, updates) {
      const index = this.list.findIndex(item => item.id === id)
      if (index === -1) return false

      this.list[index] = { 
        ...this.list[index], 
        ...updates,
        updatedAt: Date.now()
      }
      return await this._save()
    },

    /**
     * 根据ID查找记录
     */
    findById(id) {
      return this.list.find(item => item.id === id)
    }
  }
})

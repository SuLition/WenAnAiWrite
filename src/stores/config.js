/**
 * 配置 Store
 * 管理应用配置（使用本地文件存储）
 */

import { defineStore } from 'pinia'
import { readJsonFile, writeJsonFile, removeFile, FILE_NAMES, migrateConfigData } from '@/services/storage/fileStorage'
import { defaultConfig } from '@/services/config/defaultConfig'

/**
 * 深度合并对象
 */
function deepMerge(target, source) {
  const result = { ...target }
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(target[key] || {}, source[key])
    } else {
      result[key] = source[key]
    }
  }
  return result
}

export const useConfigStore = defineStore('config', {
  state: () => ({
    // 配置数据
    config: { ...defaultConfig }
  }),

  getters: {
    // 外观配置
    appearance: (state) => state.config.appearance || {},
    // 下载配置
    download: (state) => state.config.download || {},
    // 历史记录配置
    history: (state) => state.config.history || {},
    // AI 服务配置状态
    serviceStatus: (state) => ({
      tencentAsr: !!(state.config.tencentAsr?.secretId && state.config.tencentAsr?.secretKey),
      doubao: !!state.config.doubao?.apiKey,
      deepseek: !!state.config.deepseek?.apiKey,
      qianwen: !!state.config.qianwen?.apiKey,
      hunyuan: !!(state.config.hunyuan?.secretId && state.config.hunyuan?.secretKey)
    })
  },

  actions: {
    /**
     * 加载配置（异步）
     */
    async load() {
      try {
        // 先尝试迁移旧数据
        await migrateConfigData()
        
        // 从文件读取配置
        const stored = await readJsonFile(FILE_NAMES.CONFIG)
        if (stored) {
          this.config = deepMerge(defaultConfig, stored)
        } else {
          this.config = { ...defaultConfig }
        }
      } catch (e) {
        console.error('加载配置失败:', e)
        this.config = { ...defaultConfig }
      }
      return this.config
    },

    /**
     * 保存配置（异步）
     */
    async save(config) {
      this.config = JSON.parse(JSON.stringify(config))
      return await writeJsonFile(FILE_NAMES.CONFIG, config)
    },

    /**
     * 获取指定服务的配置
     */
    getServiceConfig(service) {
      return this.config[service] || {}
    },

    /**
     * 更新指定服务的配置
     */
    async updateServiceConfig(service, serviceConfig) {
      this.config[service] = { ...this.config[service], ...serviceConfig }
      return await this.save(this.config)
    },

    /**
     * 更新配置项
     */
    async update(path, value) {
      const keys = path.split('.')
      let obj = this.config
      for (let i = 0; i < keys.length - 1; i++) {
        if (!obj[keys[i]]) obj[keys[i]] = {}
        obj = obj[keys[i]]
      }
      obj[keys[keys.length - 1]] = value
      return await this.save(this.config)
    },

    /**
     * 重置配置为默认值
     */
    async reset() {
      this.config = { ...defaultConfig }
      await removeFile(FILE_NAMES.CONFIG)
      return this.config
    }
  }
})

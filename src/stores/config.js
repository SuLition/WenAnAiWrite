/**
 * 配置 Store
 * 管理应用配置（使用本地文件存储）
 */

import { defineStore } from 'pinia'
import { readJsonFile, writeJsonFile, removeFile, FILE_NAMES } from '@/services/storage/fileStorage'
import { defaultConfig } from '@/services/config/defaultConfig'
import { applyAnimationVars } from '@/constants'

// localStorage 缓存 key
const CACHE_KEY = 'catparse_config_cache'

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
    // 动画速率
    animationSpeed: (state) => state.config.appearance?.animationSpeed || 'normal',
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
     * 优化：先从 localStorage 快速读取缓存，再异步从文件更新
     */
    async load() {
      // 1. 先从 localStorage 快速读取缓存（同步，毫秒级）
      try {
        const cached = localStorage.getItem(CACHE_KEY)
        if (cached) {
          this.config = deepMerge(defaultConfig, JSON.parse(cached))
        }
      } catch (e) {
        // 缓存读取失败，忽略
      }

      // 2. 异步从文件读取最新配置
      try {
        const stored = await readJsonFile(FILE_NAMES.CONFIG)
        if (stored) {
          this.config = deepMerge(defaultConfig, stored)
          // 同步更新缓存
          localStorage.setItem(CACHE_KEY, JSON.stringify(this.config))
        } else if (!localStorage.getItem(CACHE_KEY)) {
          // 文件和缓存都没有，使用默认配置
          this.config = { ...defaultConfig }
        }
      } catch (e) {
        console.error('加载配置失败:', e)
        if (!localStorage.getItem(CACHE_KEY)) {
          this.config = { ...defaultConfig }
        }
      }
      return this.config
    },

    /**
     * 保存配置（异步）
     * 同时写入 localStorage 缓存和文件
     */
    async save(config) {
      this.config = JSON.parse(JSON.stringify(config))
      // 同时写入 localStorage 缓存
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(config))
      } catch (e) {
        console.warn('写入配置缓存失败:', e)
      }
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
      // 清除 localStorage 缓存
      try {
        localStorage.removeItem(CACHE_KEY)
      } catch (e) {
        // 忽略
      }
      await removeFile(FILE_NAMES.CONFIG)
      return this.config
    },

    /**
     * 设置动画速率
     */
    async setAnimationSpeed(speed) {
      await this.update('appearance.animationSpeed', speed)
      applyAnimationVars(speed)
    },

    /**
     * 初始化动画速率（应用启动时调用）
     */
    initAnimationSpeed() {
      const speed = this.config.appearance?.animationSpeed || 'normal'
      applyAnimationVars(speed)
    }
  }
})

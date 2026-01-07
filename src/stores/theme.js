/**
 * 主题 Store
 * 管理应用的主题、主题色、窗口效果（使用本地文件存储）
 */

import { defineStore } from 'pinia'
import { readJsonFile, writeJsonFile, FILE_NAMES, migrateThemeData } from '@/services/storage/fileStorage'
import { THEME_MODES, DARK_THEME, LIGHT_THEME, ACCENT_COLORS } from '@/constants/theme'
import { invoke } from '@tauri-apps/api/core'

export const useThemeStore = defineStore('theme', {
  state: () => ({
    // 主题模式 (light / dark / system)
    mode: THEME_MODES.DARK,
    // 实际应用的主题 (light / dark)
    appliedTheme: THEME_MODES.DARK,
    // 主题色
    accentColor: 'blue',
    // 窗口效果 (none / mica / acrylic)
    windowEffect: 'none',
    // 系统主题媒体查询
    _systemThemeQuery: null
  }),

  getters: {
    isDark: (state) => state.appliedTheme === THEME_MODES.DARK
  },

  actions: {
    /**
     * 保存主题数据到文件
     */
    async _saveThemeData() {
      const data = {
        mode: this.mode,
        windowEffect: this.windowEffect,
        accentColor: this.accentColor
      }
      await writeJsonFile(FILE_NAMES.THEME, data)
    },

    /**
     * 初始化主题
     */
    async init() {
      // 先尝试迁移旧数据
      await migrateThemeData()
      
      // 从文件加载设置
      const themeData = await readJsonFile(FILE_NAMES.THEME, {
        mode: THEME_MODES.DARK,
        windowEffect: 'none',
        accentColor: 'blue'
      })
      
      this.mode = themeData.mode || THEME_MODES.DARK
      this.windowEffect = themeData.windowEffect || 'none'
      this.accentColor = themeData.accentColor || 'blue'

      // 计算实际主题
      const actualTheme = this.mode === THEME_MODES.SYSTEM
        ? this._getSystemTheme()
        : this.mode

      // 应用主题
      await this._applyThemeToDOM(actualTheme)

      // 监听系统主题变化
      if (typeof window !== 'undefined' && window.matchMedia) {
        this._systemThemeQuery = window.matchMedia('(prefers-color-scheme: dark)')
        this._systemThemeQuery.addEventListener('change', (e) => {
          if (this.mode === THEME_MODES.SYSTEM) {
            this._applyThemeToDOM(e.matches ? THEME_MODES.DARK : THEME_MODES.LIGHT)
          }
        })
      }
    },

    /**
     * 设置主题模式
     */
    async setTheme(mode) {
      this.mode = mode
      await this._saveThemeData()

      const actualTheme = mode === THEME_MODES.SYSTEM
        ? this._getSystemTheme()
        : mode

      await this._applyThemeToDOM(actualTheme)
    },

    /**
     * 切换主题（在亮色和暗色之间切换）
     */
    async toggleTheme() {
      const newTheme = this.appliedTheme === THEME_MODES.DARK
        ? THEME_MODES.LIGHT
        : THEME_MODES.DARK

      await this.setTheme(newTheme)
    },

    /**
     * 设置主题色
     */
    async setAccentColor(colorKey) {
      if (!ACCENT_COLORS[colorKey]) {
        console.warn('[Theme] 无效的主题色:', colorKey)
        return
      }
      this.accentColor = colorKey
      await this._saveThemeData()
      this._applyAccentColorToDOM(colorKey)
    },

    /**
     * 设置窗口效果
     */
    async setWindowEffect(effect) {
      this.windowEffect = effect
      await this._saveThemeData()
      await this._applyWindowEffect(effect, this.appliedTheme === THEME_MODES.DARK)
    },

    /**
     * 获取系统主题偏好
     */
    _getSystemTheme() {
      if (typeof window !== 'undefined' && window.matchMedia) {
        return window.matchMedia('(prefers-color-scheme: dark)').matches
          ? THEME_MODES.DARK
          : THEME_MODES.LIGHT
      }
      return THEME_MODES.DARK
    },

    /**
     * 应用主题到 DOM
     */
    async _applyThemeToDOM(theme) {
      const root = document.documentElement
      const themeVars = theme === THEME_MODES.LIGHT ? LIGHT_THEME : DARK_THEME

      // 设置 CSS 变量
      Object.entries(themeVars).forEach(([key, value]) => {
        root.style.setProperty(key, value)
      })

      // 设置 html class
      root.classList.remove('light', 'dark')
      root.classList.add(theme)

      // 更新实际应用的主题
      this.appliedTheme = theme

      // 应用主题色
      this._applyAccentColorToDOM(this.accentColor)

      // 应用窗口效果
      await this._applyWindowEffect(this.windowEffect, theme === THEME_MODES.DARK)
    },

    /**
     * 应用主题色到 DOM
     */
    _applyAccentColorToDOM(colorKey) {
      const color = ACCENT_COLORS[colorKey] || ACCENT_COLORS.blue
      const root = document.documentElement

      root.style.setProperty('--accent-color', color.color)
      root.style.setProperty('--accent-hover', color.hover)
      root.style.setProperty('--accent-light', color.light)
      root.style.setProperty('--accent-border', color.border)
      root.style.setProperty('--scrollbar-hover', color.color)
    },

    /**
     * 应用窗口效果
     */
    async _applyWindowEffect(effect, isDark) {
      try {
        const result = await invoke('set_window_effect', {
          effect: effect,
          isDark: isDark
        })
        console.log('[WindowEffect]', result)

        const root = document.documentElement
        if (effect === 'none') {
          root.classList.remove('window-effect-enabled')
        } else {
          root.classList.add('window-effect-enabled')
        }
      } catch (error) {
        console.warn('[窗口效果] 设置失败:', error)
      }
    }
  }
})

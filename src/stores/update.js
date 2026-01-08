/**
 * 更新 Store
 * 管理应用更新检查和下载
 */

import { defineStore } from 'pinia'
import { check } from '@tauri-apps/plugin-updater'
import { relaunch } from '@tauri-apps/plugin-process'
import { invoke } from '@tauri-apps/api/core'
import { toast } from 'vue-sonner'
import { useConfigStore } from './config'

// 将原始 update 对象存储在响应式系统之外，避免 Pinia 代理无法访问私有成员
let rawUpdate = null

export const useUpdateStore = defineStore('update', {
  state: () => ({
    // 弹窗可见性
    visible: false,
    // 更新信息（仅包含显示所需的数据）
    updateInfo: null,
    // 下载中
    downloading: false,
    // 下载进度
    progress: 0
  }),

  getters: {
    // 是否有可用更新
    hasUpdate: (state) => state.updateInfo !== null,
    // 新版本号
    newVersion: (state) => state.updateInfo?.version || ''
  },

  actions: {
    /**
     * 检查更新
     * @param {boolean} showNoUpdate - 是否在无更新时显示提示
     */
    async checkUpdate(showNoUpdate = false) {
      try {
        console.log('[更新] 开始检查更新...')
        const update = await check()

        if (update) {
          console.log('[更新] 发现新版本:', update.version)
          // 保存原始对象到非响应式变量
          rawUpdate = update
          // 只存储显示所需的数据到 Pinia
          this.updateInfo = {
            version: update.version,
            body: update.body,
            date: update.date
          }
          this.visible = true
        } else if (showNoUpdate) {
          toast.success('已是最新版本')
        }
      } catch (e) {
        // 打印完整错误信息以便调试
        console.error('[更新] 检查失败:', e)
        console.error('[更新] 错误详情:', e.message || e.toString())
        if (showNoUpdate) {
          toast.error('检查更新失败，请稍后重试')
        }
      }
    },

    /**
     * 执行更新
     */
    async doUpdate() {
      if (!rawUpdate) return

      this.downloading = true
      let downloaded = 0
      let total = 0

      try {
        // 更新前停止后端服务，避免重装时进程未终止
        console.log('[更新] 停止后端服务...')
        await invoke('stop_backend')
        
        await rawUpdate.downloadAndInstall((event) => {
          if (event.event === 'Started') {
            total = event.data.contentLength || 0
            console.log('[更新] 开始下载，总大小:', total)
          } else if (event.event === 'Progress') {
            downloaded += event.data.chunkLength
            this.progress = total > 0 ? (downloaded / total) * 100 : 0
          } else if (event.event === 'Finished') {
            console.log('[更新] 下载完成')
          }
        })

        toast.success('更新完成，即将重启应用...')
        await relaunch()
      } catch (e) {
        console.error('[更新] 更新失败:', e)
        toast.error('更新失败: ' + e.message)
        this.downloading = false
      }
    },

    /**
     * 关闭更新弹窗
     */
    close() {
      if (!this.downloading) {
        this.visible = false
        this.updateInfo = null
        this.progress = 0
        rawUpdate = null
      }
    },

    /**
     * 自动检查更新（启动时）
     */
    async autoCheck() {
      const configStore = useConfigStore()
      if (configStore.config.update?.autoCheck !== false) {
        // 延迟 2 秒检查，避免影响启动
        setTimeout(() => {
          this.checkUpdate(false)
        }, 2000)
      }
    }
  }
})

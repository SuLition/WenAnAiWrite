<script setup>
import { useUpdateStore } from '@/stores'
import { storeToRefs } from 'pinia'

// Store
const updateStore = useUpdateStore()
const { visible, update, downloading, progress } = storeToRefs(updateStore)
</script>

<template>
  <teleport to="body">
    <transition name="fade">
      <div v-if="visible" class="updater-overlay" @click.self="updateStore.close">
        <div class="updater-dialog">
          <h2 class="updater-title">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            发现新版本
          </h2>
          
          <div class="updater-content">
            <div class="version-info">
              <span class="version-badge">v{{ update?.version }}</span>
              <span v-if="update?.date" class="version-date">
                {{ new Date(update.date).toLocaleDateString() }}
              </span>
            </div>
            
            <div class="changelog" v-if="update?.body">
              <pre>{{ update.body }}</pre>
            </div>
            
            <div v-if="downloading" class="progress-section">
              <div class="progress-bar">
                <div class="progress-fill" :style="{ width: progress + '%' }"></div>
              </div>
              <span class="progress-text">{{ progress.toFixed(1) }}%</span>
            </div>
          </div>
          
          <div class="updater-actions">
            <button 
              class="btn btn-primary" 
              :class="{ 'btn-progress': downloading }" 
              :style="downloading ? { '--progress': progress + '%' } : {}"
              @click="updateStore.doUpdate" 
              :disabled="downloading"
            >
              {{ downloading ? progress.toFixed(0) + '%' : '立即更新' }}
            </button>
            <button class="btn btn-secondary" @click="updateStore.close" :disabled="downloading">
              稍后更新
            </button>
          </div>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<style scoped>
.updater-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.updater-dialog {
  background: var(--bg-secondary, #2b2d30);
  border-radius: 12px;
  padding: 24px;
  width: 520px;
  max-width: 90vw;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  border: 1px solid var(--border-primary, #3d3f43);
}

.updater-title {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary, #fff);
  margin-bottom: 20px;
}

.updater-title svg {
  color: var(--accent-color, #4a9eff);
}

.updater-content {
  margin-bottom: 20px;
}

.version-info {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.version-badge {
  background: var(--accent-color, #4a9eff);
  color: #fff;
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 14px;
  font-weight: 500;
}

.version-date {
  color: var(--text-tertiary, #6c6e73);
  font-size: 13px;
}

.changelog {
  background: var(--bg-primary, #1e1f22);
  border-radius: 8px;
  padding: 12px 16px;
  height: 200px;
  overflow-y: auto;
  border: 1px solid var(--border-primary, #3d3f43);
}

.changelog pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-secondary, #afb1b3);
  font-family: inherit;
}

.progress-section {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 16px;
}

.progress-bar {
  flex: 1;
  height: 6px;
  background: var(--bg-primary, #1e1f22);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--accent-color, #4a9eff);
  transition: width 0.2s ease;
  border-radius: 3px;
}

.progress-text {
  font-size: 13px;
  color: var(--text-secondary, #afb1b3);
  min-width: 50px;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.updater-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
  min-width: 100px;
}

.btn-primary {
  background: var(--accent-color, #4a9eff);
  color: #fff;
}

.btn-primary:hover:not(:disabled) {
  background: #3d8bdb;
}

.btn-secondary {
  background: var(--bg-primary, #1e1f22);
  color: var(--text-primary, #fff);
  border: 1px solid var(--border-primary, #3d3f43);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--border-primary, #3d3f43);
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 过渡动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.fade-enter-active .updater-dialog,
.fade-leave-active .updater-dialog {
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.fade-enter-from .updater-dialog,
.fade-leave-to .updater-dialog {
  transform: scale(0.95);
  opacity: 0;
}
</style>

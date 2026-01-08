<script setup>
import {ref, onMounted} from 'vue'
import {getVersion} from '@tauri-apps/api/app'
import {open} from '@tauri-apps/plugin-shell'

const version = ref('0.0.0')
const GITHUB_URL = 'https://github.com/SuLition/WenAnAiWrite'

onMounted(async () => {
  try {
    version.value = await getVersion()
  } catch (e) {
    console.warn('获取版本失败:', e)
  }
})

const openGitHub = async () => {
  try {
    await open(GITHUB_URL)
  } catch (e) {
    console.error('打开链接失败:', e)
  }
}
</script>

<template>
  <div class="settings-panel">
    <!-- 应用信息 -->
    <div class="about-header">
      <div class="app-logo">
        <span class="logo-text">姜</span>
      </div>
      <div class="app-info">
        <h2 class="app-name">文案助手</h2>
        <span class="app-version">v{{ version }}</span>
      </div>
    </div>

    <!-- 应用描述 -->
    <div class="about-section">
      <p class="app-desc">
        文案助手是一款 AI 驱动的文案写作工具，支持多平台视频解析、文案提取与智能改写，
        帮助创作者快速生成高质量内容。
      </p>
    </div>

    <!-- 功能特性 -->
    <div class="about-section">
      <h3 class="section-title">功能特性</h3>
      <ul class="feature-list">
        <li>
          <svg class="feature-icon" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path d="M5 13l4 4L19 7"/>
          </svg>
          <span>支持抖音、B站、小红书等多平台视频解析</span>
        </li>
        <li>
          <svg class="feature-icon" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path d="M5 13l4 4L19 7"/>
          </svg>
          <span>智能语音识别，自动提取视频文案</span>
        </li>
        <li>
          <svg class="feature-icon" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path d="M5 13l4 4L19 7"/>
          </svg>
          <span>AI 文案改写，支持多种风格</span>
        </li>
        <li>
          <svg class="feature-icon" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path d="M5 13l4 4L19 7"/>
          </svg>
          <span>高速视频下载，支持无水印</span>
        </li>
      </ul>
    </div>

    <!-- 技术栈 -->
    <div class="about-section">
      <h3 class="section-title">技术栈</h3>
      <div class="tech-tags">
        <span class="tech-tag">Vue 3</span>
        <span class="tech-tag">Tauri 2</span>
        <span class="tech-tag">Pinia</span>
        <span class="tech-tag">Python</span>
        <span class="tech-tag">FastAPI</span>
      </div>
    </div>

    <!-- 链接 -->
    <div class="about-section">
      <h3 class="section-title">相关链接</h3>
      <div class="link-list">
        <button class="link-item" @click="openGitHub">
          <svg class="link-icon" fill="currentColor" viewBox="0 0 24 24">
            <path
                d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
          </svg>
          <span>GitHub 开源地址</span>
          <svg class="arrow-icon" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- 版权信息 -->
    <div class="about-footer">
      <p class="copyright">© 2024-2025 文案助手. MIT License.</p>
    </div>
  </div>
</template>

<style scoped>

/* 头部 */
.about-header {
  display: flex;
  align-items: center;
  gap: 20px;
  padding-bottom: 24px;
  margin-bottom: 24px;
  border-bottom: 1px solid var(--border-primary);
}

.app-logo {
  width: 72px;
  height: 72px;
  background: linear-gradient(135deg, var(--accent-color) 0%, #6366f1 100%);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(74, 158, 255, 0.3);
}

.logo-text {
  font-size: 32px;
  font-weight: 700;
  color: #ffffff;
}

.app-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.app-name {
  font-size: 24px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.app-version {
  font-size: 14px;
  color: var(--text-tertiary);
  background: var(--bg-secondary);
  padding: 4px 10px;
  border-radius: 12px;
  width: fit-content;
}

/* 区块 */
.about-section {
  padding-bottom: 20px;
  margin-bottom: 20px;
  border-bottom: 1px solid var(--border-primary);
}

.about-section:last-of-type {
  border-bottom: none;
  margin-bottom: 0;
}

.section-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  margin: 0 0 12px 0;
}

.app-desc {
  font-size: 14px;
  line-height: 1.7;
  color: var(--text-secondary);
  margin: 0;
}

/* 功能列表 */
.feature-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.feature-list li {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  color: var(--text-secondary);
}

.feature-icon {
  width: 16px;
  height: 16px;
  color: var(--accent-color);
  flex-shrink: 0;
}

/* 技术标签 */
.tech-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tech-tag {
  font-size: 12px;
  color: var(--text-secondary);
  background: var(--bg-secondary);
  padding: 6px 12px;
  border-radius: 6px;
  border: 1px solid var(--border-primary);
}

/* 链接列表 */
.link-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.link-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: 8px;
  cursor: pointer;
  transition: all var(--transition-fast, 200ms) var(--easing-ease, ease);
  font-size: 14px;
  color: var(--text-primary);
}

.link-item:hover {
  background: var(--bg-tertiary);
  border-color: var(--accent-color);
}

.link-icon {
  width: 20px;
  height: 20px;
  color: var(--text-secondary);
}

.link-item:hover .link-icon {
  color: var(--accent-color);
}

.arrow-icon {
  width: 16px;
  height: 16px;
  color: var(--text-tertiary);
  margin-left: auto;
}

/* 页脚 */
.about-footer {
  margin-top: 24px;
  padding-top: 16px;
}

.copyright {
  font-size: 12px;
  color: var(--text-tertiary);
  margin: 0;
  text-align: center;
}
</style>

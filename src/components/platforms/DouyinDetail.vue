<template>
  <div class="douyin-detail" v-if="videoInfo">
    <!-- 话题标签 -->
    <div class="hashtag-list" v-if="videoInfo.hashtags && videoInfo.hashtags.length">
      <span class="hashtag-tag" v-for="tag in videoInfo.hashtags" :key="tag.id">
        #{{ tag.name }}
      </span>
    </div>
    
    <!-- 统计数据网格 -->
    <div class="stat-grid">
      <div class="stat-item">
        <div class="stat-left">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M15 12c0 1.66-1.34 3-3 3s-3-1.34-3-3 1.34-3 3-3 3 1.34 3 3Z"/><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2Zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8Z"/></svg>
          <span class="stat-label">播放</span>
        </div>
        <span class="stat-value">{{ videoInfo.views }}</span>
      </div>
      <div class="stat-item">
        <div class="stat-left">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
          <span class="stat-label">点赞</span>
        </div>
        <span class="stat-value">{{ videoInfo.likes }}</span>
      </div>
      <div class="stat-item">
        <div class="stat-left">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M21 6h-2v9H6v2c0 .55.45 1 1 1h11l4 4V7c0-.55-.45-1-1-1zm-4 6V3c0-.55-.45-1-1-1H3c-.55 0-1 .45-1 1v14l4-4h10c.55 0 1-.45 1-1z"/></svg>
          <span class="stat-label">评论</span>
        </div>
        <span class="stat-value">{{ videoInfo.comments }}</span>
      </div>
      <div class="stat-item">
        <div class="stat-left">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/></svg>
          <span class="stat-label">收藏</span>
        </div>
        <span class="stat-value">{{ videoInfo.collects }}</span>
      </div>
    </div>

    <!-- 作者签名 -->
    <div class="author-signature" v-if="videoInfo.authorSignature">
      <div class="signature-header">作者签名</div>
      <div class="signature-content">{{ videoInfo.authorSignature }}</div>
    </div>

    <!-- 视频信息 -->
    <div class="video-meta-detail">
      <div class="meta-row">
        <span class="meta-label">视频ID:</span>
        <span class="meta-value aweme-id">{{ videoInfo.awemeId }}</span>
      </div>
      <div class="meta-row" v-if="videoInfo.duration">
        <span class="meta-label">时长:</span>
        <span class="meta-value">{{ formatDuration(videoInfo.duration) }}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">发布时间:</span>
        <span class="meta-value">{{ videoInfo.createTime }}</span>
      </div>
      <div class="meta-row" v-if="videoInfo.dimension">
        <span class="meta-label">分辨率:</span>
        <span class="meta-value">{{ videoInfo.dimension }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  videoInfo: {
    type: Object,
    default: null
  }
})

// 格式化时长
const formatDuration = (seconds) => {
  if (!seconds) return '00:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}
</script>

<style scoped>
.douyin-detail {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  margin-bottom: 0.7rem;
  flex: 1;
  overflow-y: auto;
  padding-right: 0.3rem;
}

/* 话题标签 */
.hashtag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.hashtag-tag {
  padding: 0.25rem 0.6rem;
  background: linear-gradient(135deg, rgba(254, 44, 85, 0.15) 0%, rgba(37, 244, 238, 0.15) 100%);
  border: 1px solid rgba(254, 44, 85, 0.3);
  border-radius: 12px;
  font-size: 0.55rem;
  font-weight: 500;
  color: #fe2c55;
}

/* 统计数据网格 */
.stat-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.4rem;
}

.stat-item {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0.6rem;
  background: rgba(255,255,255,0.04);
  border-radius: 8px;
  transition: all 0.2s;
}

.stat-item:hover {
  background: rgba(254, 44, 85, 0.1);
}

.stat-left {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.15rem;
}

.stat-item svg {
  width: 16px;
  height: 16px;
  color: #fe2c55;
}

.stat-value {
  font-size: 1.1rem;
  font-weight: 700;
  color: #fff;
}

.stat-label {
  font-size: 0.6rem;
  color: rgba(255,255,255,0.5);
}

/* 作者签名 */
.author-signature {
  background: rgba(0,0,0,0.2);
  border-radius: 8px;
  padding: 0.6rem;
}

.signature-header {
  font-size: 0.7rem;
  font-weight: 600;
  color: rgba(255,255,255,0.6);
  margin-bottom: 0.4rem;
}

.signature-content {
  font-size: 0.75rem;
  line-height: 1.5;
  color: rgba(255,255,255,0.8);
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 120px;
  overflow-y: auto;
}

/* 视频元信息 */
.video-meta-detail {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding: 0.5rem 0.6rem;
  background: rgba(255,255,255,0.03);
  border-radius: 6px;
}

.meta-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.72rem;
}

.meta-label {
  color: rgba(255,255,255,0.5);
  flex-shrink: 0;
}

.meta-value {
  color: rgba(255,255,255,0.85);
}

.meta-value.aweme-id {
  font-family: monospace;
  color: #fe2c55;
  font-weight: 500;
}

/* 游戏信息 */
.game-info {
  background: linear-gradient(135deg, rgba(254, 44, 85, 0.1) 0%, rgba(37, 244, 238, 0.1) 100%);
  border: 1px solid rgba(254, 44, 85, 0.2);
  border-radius: 8px;
  padding: 0.6rem;
}

.game-header {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.8rem;
  font-weight: 600;
  color: #fe2c55;
  margin-bottom: 0.3rem;
}

.game-header svg {
  width: 16px;
  height: 16px;
}

.game-type {
  font-size: 0.7rem;
  color: rgba(255,255,255,0.6);
  padding: 0.2rem 0.5rem;
  background: rgba(255,255,255,0.08);
  border-radius: 4px;
  display: inline-block;
}

/* 合集信息 */
.mix-info {
  background: linear-gradient(135deg, rgba(37, 244, 238, 0.1) 0%, rgba(254, 44, 85, 0.1) 100%);
  border: 1px solid rgba(37, 244, 238, 0.2);
  border-radius: 8px;
  padding: 0.6rem;
}

.mix-header {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.7rem;
  font-weight: 600;
  color: #25f4ee;
  margin-bottom: 0.4rem;
}

.mix-header svg {
  width: 14px;
  height: 14px;
}

.mix-title {
  font-size: 0.8rem;
  font-weight: 500;
  color: rgba(255,255,255,0.9);
  margin-bottom: 0.2rem;
  line-height: 1.3;
}

.mix-desc {
  font-size: 0.7rem;
  color: rgba(255,255,255,0.6);
  margin-bottom: 0.3rem;
  line-height: 1.4;
}

.mix-stat {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.68rem;
  color: rgba(255,255,255,0.5);
}

/* 权限标签 */
.permission-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.perm-tag {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.3rem 0.5rem;
  background: rgba(46, 204, 113, 0.15);
  border: 1px solid rgba(46, 204, 113, 0.3);
  border-radius: 6px;
  font-size: 0.68rem;
  color: #2ecc71;
}

.perm-tag svg {
  width: 12px;
  height: 12px;
}

.perm-tag.disabled {
  background: rgba(255,255,255,0.05);
  border-color: rgba(255,255,255,0.1);
  color: rgba(255,255,255,0.3);
}
</style>

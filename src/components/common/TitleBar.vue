<script setup>
import {getCurrentWindow} from '@tauri-apps/api/window';
import {onMounted, ref} from 'vue';

const maxed = ref(false);
const appWindow = getCurrentWindow();
const isTop = ref(false);

const icons = {
  max: new URL('@/assets/img/titlebar/max.svg', import.meta.url).href,
  unmax: new URL('@/assets/img/titlebar/unmax.svg', import.meta.url).href,
  close: new URL('@/assets/img/titlebar/close.svg', import.meta.url).href,
};


onMounted(() =>
    appWindow.onResized(
        async () => (maxed.value = await appWindow.isMaximized()),
    ),
);
</script>

<template>
  <div
      class="title-bar"
      data-tauri-drag-region
      @dblclick="appWindow.toggleMaximize()"
  >
    <div class="title-bar-buttons title-bar-no-drag">
      <div class="title-bar-button title-bar-button-minimize" @click="appWindow.minimize()">
        <div class="title-bar-minimize-icon"></div>
      </div>
      <div class="title-bar-button title-bar-button-maximize" @click="appWindow.toggleMaximize()">
        <img
            v-if="!maxed"
            :src="icons.max"
            alt="maximize"
            class="title-bar-icon"
        />
        <img
            v-else
            :src="icons.unmax"
            alt="unmaximize"
            class="title-bar-icon"
        />
      </div>
      <div class="title-bar-button title-bar-button-close" @click="appWindow.close()">
        <img
            :src="icons.close"
            alt="close"
            class="title-bar-icon"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.title-bar {
  height: 30px;
  background-color: transparent;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  z-index: 1000000;
  position: relative;
}

.title-bar-drag-area {
  position: absolute;
  top: 0;
  left: 0;
  right: 135px;
  height: 100%;
}

.title-bar-buttons {
  display: flex;
  align-items: center;
}

.title-bar-button {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  transition: all var(--transition-normal) var(--easing-ease);
  width: 45px;
  height: 30px;
  font-size: 12px;
  color: var(--text-secondary);
  cursor: pointer;
}

.title-bar-button:hover {
  background-color: var(--bg-tertiary);
}

.title-bar-button-minimize .title-bar-minimize-icon {
  transform: translateY(0px);
}

.title-bar-button-close:hover {
  background-color: #c42b1c !important;
}

.title-bar-minimize-icon {
  height: 1px;
  width: 10px;
  background-color: currentColor;
}

.title-bar-icon {
  width: 10px;
  height: 10px;
  filter: brightness(0) saturate(100%) invert(75%) sepia(8%) saturate(234%) hue-rotate(169deg) brightness(92%) contrast(86%);
}

.title-bar-no-drag {
  -webkit-app-region: no-drag;
}
</style>
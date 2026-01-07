import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import App from './App.vue'
import router from './router'
import 'vue-sonner/style.css'

// 动态导入字体样式，确保正确解析路径
import './assets/fonts/font-awesome/font.min.css'
import './assets/fonts/bcc-iconfont/font.min.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.mount('#app')

// // Vue 挂载完成后显示窗口
// import { getCurrentWindow } from '@tauri-apps/api/window'
//
// getCurrentWindow().show().then(r => {})

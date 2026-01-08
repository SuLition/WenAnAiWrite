# 文案助手

<p align="center">
  <img src="src-tauri/icons/icon.ico" width="128" height="128" alt="文案助手">
</p>

<p align="center">
  一个基于 Vue 3 和 Tauri 2 构建的视频解析、文案提取与 AI 改写工具
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Tauri-2.x-blue?logo=tauri" alt="Tauri">
  <img src="https://img.shields.io/badge/Vue-3.5-green?logo=vue.js" alt="Vue">
  <img src="https://img.shields.io/badge/Platform-Windows-lightgrey?logo=windows" alt="Platform">
</p>

## 功能特性

### 视频解析
- 支持 **B站**、**抖音**、**小红书** 等主流短视频平台
- 智能链接识别，自动检测平台类型
- 支持多种清晰度选择

### 文案处理
- 语音识别：自动提取视频中的语音内容生成文字稿
- AI 文案改写：支持豆包、DeepSeek、通义千问、混元等多种模型
- 后台任务队列：文案提取和改写在后台执行，不阻塞操作
- 一键复制原文或改写结果

### 个性化设置
- **主题切换**：支持深色/浅色/跟随系统
- **主题色自定义**：7 种预设主题色可选
- **毛玻璃效果**：Windows 11 原生 Mica 效果
- **页面过渡动画**：多种过渡效果可选

### 其他功能
- 应用内自动更新
- 解析历史记录管理
- 历史记录快速恢复解析结果
- 视频 ID 自动去重
- 历史记录数量上限设置

## 技术栈

| 分类 | 技术 |
|------|------|
| 前端框架 | Vue 3.5 + Vite |
| 桌面应用 | Tauri 2.x (Rust) |
| 状态管理 | Pinia |
| 路由 | Vue Router 4 |
| UI 组件 | Arco Design Vue |
| 通知 | vue-sonner |
| 后端服务 | Python FastAPI (parser-service) |
| AI 模型 | 豆包、DeepSeek、通义千问、混元 |

## 快速开始

### 环境要求

- Node.js 18+
- Rust 1.70+
- Python 3.9+ (用于后端服务)

### 安装依赖

```bash
# 安装前端依赖
npm install

# 安装后端依赖 (可选，用于本地开发)
cd parser-service
pip install -r requirements.txt
```

### 开发运行

```bash
# 启动 Tauri 开发模式 (包含前端服务)
npm run tauri:dev

# 或者单独启动前端开发服务器
npm run dev
```

### 构建项目

```bash
# 构建后端服务 (backend_server.exe)
npm run build:backend

# 构建 Tauri 桌面应用
npm run tauri:build

# 一键构建全部
npm run build:all
```

## 项目结构

```
├── src/                          # 前端源码
│   ├── components/               # 公共组件
│   │   ├── common/               # 通用组件 (Sidebar, TitleBar, CustomSelect...)
│   │   └── icons/                # 图标组件
│   ├── views/                    # 页面组件
│   │   ├── parse/                # 解析页面 (模块化拆分)
│   │   ├── history/              # 历史记录页面
│   │   └── settings/             # 设置页面
│   ├── services/                 # 服务层
│   │   ├── api/                  # API 调用
│   │   ├── config/               # 配置管理
│   │   ├── theme/                # 主题服务
│   │   ├── storage/              # 本地存储
│   │   └── ai/                   # AI 模型服务
│   ├── constants/                # 常量定义
│   ├── router/                   # 路由配置
│   └── utils/                    # 工具函数
├── src-tauri/                    # Tauri 后端 (Rust)
│   ├── src/                      # Rust 源码
│   ├── binaries/                 # 打包的后端服务
│   └── icons/                    # 应用图标
├── parser-service/               # 解析后端服务 (Python)
│   ├── app.py                    # Flask 应用入口
│   ├── parsers/                  # 各平台解析器
│   └── build_exe.py              # 打包脚本
└── public/                       # 静态资源
```

## 支持平台

| 平台 | 视频解析 | 视频下载 | 音频提取 |
|------|----------|----------|----------|
| B站 (哔哩哔哩) | ✅ | ✅ | ✅ |
| 抖音 | ✅ | ✅ | ✅ |
| 小红书 | ✅ | ✅ | ✅ |

## 应用更新

应用支持自动检查更新，也可在设置页面手动检查。更新文件托管在 GitHub Releases。

## 开发说明

### 签名配置 (用于打包)

```cmd
set TAURI_SIGNING_PRIVATE_KEY=C:\Users\xxx\.tauri\wenan-helper.key
set TAURI_SIGNING_PRIVATE_KEY_PASSWORD=your_password
npm run tauri:build
```

### 生成签名密钥

```bash
npx tauri signer generate -w ~/.tauri/wenan-helper.key
```

配置文件存储在 `%APPDATA%\com.wenanassistant.app\` 目录下，重装应用不会丢失配置。

## 许可证

MIT License
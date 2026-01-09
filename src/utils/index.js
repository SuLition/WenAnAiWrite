/**
 * 工具函数统一导出
 */

// 平台相关工具
export * from './platform'

// 验证工具
export * from './validate'

// 格式化工具
export * from './format'

// 请求工具
export * from './request'

// URL 解析工具
export * from './urlParser'

// Toaster 配置
export const toasterOptions = {
    closeButton: true,
    expand: false,
    position: 'bottom-right',
    closeButtonPosition: 'top-right',
    richColors: true,
    visibleToasts: 8,
    offset: '32px',
};
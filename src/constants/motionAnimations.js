/**
 * Motion Vue 动画配置
 * 供项目各组件共用
 *
 * duration 会根据设置中的动画速率动态计算
 */

import {ANIMATION_SPEED_MODES} from './animation'

// 基础动画时长配置（秒）
const BASE_DURATION = {
    card: 0.3,      // 卡片动画
    page: 0.2,      // 页面过渡
    dropdown: 0.2,  // 下拉菜单
    modal: 0.2      // 弹窗
}

/**
 * 根据速率模式计算实际 duration
 * @param {number} baseDuration - 基础时长（秒）
 * @param {string} speedMode - 速率模式: disabled, fast, normal, elegant
 * @returns {number} 实际时长（秒）
 */
function calcDuration(baseDuration, speedMode) {
    const multiplier = ANIMATION_SPEED_MODES[speedMode]?.value || 0.5
    // 禁用时返回极小值（让动画瞬间完成）
    if (multiplier === 0) return 0.01
    return baseDuration * multiplier
}

// 卡片动画基础配置（不含 duration）
const cardAnimationBase = {
    fade: {
        initial: {opacity: 0},
        animate: {opacity: 1},
        exit: {opacity: 0},
        ease: [0.16, 1, 0.3, 1]  // easeOutExpo
    },
    'slide-left': {
        initial: {opacity: 0, x: 60},
        animate: {opacity: 1, x: 0},
        exit: {opacity: 0, x: 60},
        ease: [0.34, 1.56, 0.64, 1]  // easeOutBack
    },
    'slide-right': {
        initial: {opacity: 0, x: -60},
        animate: {opacity: 1, x: 0},
        exit: {opacity: 0, x: -60},
        ease: [0.34, 1.56, 0.64, 1]  // easeOutBack
    },
    'slide-up': {
        initial: {opacity: 0, y: 60},
        animate: {opacity: 1, y: 0},
        exit: {opacity: 0, y: 60},
        ease: [0.34, 1.56, 0.64, 1]  // easeOutBack
    },
    zoom: {
        initial: {opacity: 0, scale: 0.85},
        animate: {opacity: 1, scale: 1},
        exit: {opacity: 0, scale: 0.85},
        ease: [0.394, 1.816, 0.516, 0.923]  // 自定义弹性曲线
    },
    none: null
}

// 页面动画基础配置
const pageAnimationBase = {
    fade: {
        initial: {opacity: 0},
        animate: {opacity: 1},
        exit: {opacity: 0},
        ease: 'easeInOut'
    },
    'slide-left': {
        initial: {opacity: 0, x: 30},
        animate: {opacity: 1, x: 0},
        exit: {opacity: 0, x: -30},
        ease: 'easeOut'
    },
    'slide-right': {
        initial: {opacity: 0, x: -30},
        animate: {opacity: 1, x: 0},
        exit: {opacity: 0, x: 30},
        ease: 'easeOut'
    },
    'slide-up': {
        initial: {opacity: 0, y: 30},
        animate: {opacity: 1, y: 0},
        exit: {opacity: 0, y: -30},
        ease: 'easeOut'
    },
    zoom: {
        initial: {opacity: 0, scale: 0.95},
        animate: {opacity: 1, scale: 1},
        exit: {opacity: 0, scale: 0.95},
        ease: 'easeInOut'
    },
    none: null
}

// 下拉菜单基础配置（下滑弹出）
const dropdownAnimationBase = {
    initial: {opacity: 0, y: -8},
    animate: {opacity: 1, y: 0},
    exit: {opacity: 0, y: -8},
    ease: [0.16, 1, 0.3, 1]  // easeOutExpo
}

// 弹窗基础配置（缩放动画）
const modalAnimationBase = {
    overlay: {
        initial: {opacity: 0},
        animate: {opacity: 1},
        exit: {opacity: 0},
        ease: 'easeOut'
    },
    container: {
        initial: {opacity: 0, scale: 0.9},
        animate: {opacity: 1, scale: 1},
        exit: {opacity: 0, scale: 0.9},
        ease: [0.34, 1.56, 0.64, 1]  // easeOutBack 弹性效果
    }
}

/**
 * 获取卡片动画配置
 * @param {string} animationType - 动画类型
 * @param {string} speedMode - 速率模式
 * @returns {object|null} 动画配置对象
 */
export function getCardAnimation(animationType, speedMode = 'normal') {
    const base = cardAnimationBase[animationType] || cardAnimationBase.fade
    if (!base) return null

    const duration = calcDuration(BASE_DURATION.card, speedMode)
    return {
        initial: base.initial,
        animate: base.animate,
        exit: base.exit,
        transition: {duration, ease: base.ease}
    }
}

/**
 * 获取页面过渡动画配置
 * @param {string} animationType - 动画类型
 * @param {string} speedMode - 速率模式
 * @returns {object|null} 动画配置对象
 */
export function getPageAnimation(animationType, speedMode = 'normal') {
    const base = pageAnimationBase[animationType] || pageAnimationBase.fade
    if (!base) return null

    const duration = calcDuration(BASE_DURATION.page, speedMode)
    return {
        initial: base.initial,
        animate: base.animate,
        exit: base.exit,
        transition: {duration, ease: base.ease}
    }
}

/**
 * 获取下拉菜单动画配置
 * @param {string} speedMode - 速率模式
 * @returns {object} 动画配置对象
 */
export function getDropdownAnimation(speedMode = 'normal') {
    const duration = calcDuration(BASE_DURATION.dropdown, speedMode)
    return {
        initial: dropdownAnimationBase.initial,
        animate: dropdownAnimationBase.animate,
        exit: dropdownAnimationBase.exit,
        transition: {duration, ease: dropdownAnimationBase.ease}
    }
}

/**
 * 获取弹窗动画配置
 * @param {string} speedMode - 速率模式
 * @returns {object} 动画配置对象
 */
export function getModalAnimation(speedMode = 'normal') {
    const duration = calcDuration(BASE_DURATION.modal, speedMode)
    return {
        overlay: {
            initial: modalAnimationBase.overlay.initial,
            animate: modalAnimationBase.overlay.animate,
            exit: modalAnimationBase.overlay.exit,
            transition: {duration, ease: modalAnimationBase.overlay.ease}
        },
        container: {
            initial: modalAnimationBase.container.initial,
            animate: modalAnimationBase.container.animate,
            exit: modalAnimationBase.container.exit,
            transition: {duration, ease: modalAnimationBase.container.ease}
        }
    }
}


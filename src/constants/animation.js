/**
 * 动画和过渡时间统一配置
 * 使用 CSS 变量 + calc() 方式实现动画速率控制
 */

// 动画速率模式配置
export const ANIMATION_SPEED_MODES = {
    disabled: {value: 0.0, label: '禁用动画'},
    fast: {value: 0.35, label: '快速'},
    normal: {value: 0.45, label: '标准'},
    elegant: {value: 0.65, label: '优雅'}
}

// 速率选项（用于设置页选择）
export const ANIMATION_SPEED_OPTIONS = Object.entries(ANIMATION_SPEED_MODES).map(([key, config]) => ({
    value: key,
    label: config.label
}))

// 基础过渡时间配置（毫秒，便于 calc 计算）
export const TRANSITION_DURATION = {
    fastest: 300,    // 最快：微小交互反馈
    fast: 400,       // 快速：按钮、开关等小元素
    normal: 500,     // 标准：通用过渡效果
    slow: 600,       // 慢速：复杂元素过渡
}

// 基础动画时间配置（毫秒）
export const ANIMATION_DURATION = {
    bounce: 300,      // 点击反弹效果
    draw: 400,        // SVG 绘制动画（短）
    drawMedium: 500,  // SVG 绘制动画（中）
    drawLong: 600,    // SVG 绘制动画（长）
    drawCircle: 800,  // 圆形绘制动画
    spin: 1000,       // 旋转加载动画
}

// 动画延迟配置（毫秒）
export const ANIMATION_DELAY = {
    none: 0,
    short: 100,
    medium: 150,
    long: 300,
    extraLong: 400,
}

// 缓动函数配置
export const EASING = {
    linear: 'linear',
    ease: 'ease',
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
    smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',  // Material Design
    bounce: 'cubic-bezier(0.8, -0.4, 0.5, 1)',  // 轻微弹跳
}

/**
 * 计算实际动画时间
 * @param {number} baseDuration - 基础时间（毫秒）
 * @param {number} speedMultiplier - 速率倍数
 * @returns {string} CSS 时间值
 */
function calcDuration(baseDuration, speedMultiplier) {
    const duration = Math.max(0, baseDuration * speedMultiplier)
    return `${duration}ms`
}

/**
 * 生成 CSS 变量对象
 * @param {number} speedMultiplier - 速率倍数
 * @returns {object} CSS 变量键值对
 */
export function generateAnimationVars(speedMultiplier = 1.0) {
    return {
        // 速率倍数（供 calc() 使用）
        '--animation-speed': speedMultiplier.toString(),

        // 过渡时间
        '--transition-fastest': calcDuration(TRANSITION_DURATION.fastest, speedMultiplier),
        '--transition-fast': calcDuration(TRANSITION_DURATION.fast, speedMultiplier),
        '--transition-normal': calcDuration(TRANSITION_DURATION.normal, speedMultiplier),
        '--transition-slow': calcDuration(TRANSITION_DURATION.slow, speedMultiplier),

        // 动画时间
        '--animation-bounce': calcDuration(ANIMATION_DURATION.bounce, speedMultiplier),
        '--animation-draw': calcDuration(ANIMATION_DURATION.draw, speedMultiplier),
        '--animation-draw-medium': calcDuration(ANIMATION_DURATION.drawMedium, speedMultiplier),
        '--animation-draw-long': calcDuration(ANIMATION_DURATION.drawLong, speedMultiplier),
        '--animation-draw-circle': calcDuration(ANIMATION_DURATION.drawCircle, speedMultiplier),
        '--animation-spin': calcDuration(ANIMATION_DURATION.spin, speedMultiplier),

        // 动画延迟（也需要跟随速率调整）
        '--animation-delay-none': '0ms',
        '--animation-delay-short': calcDuration(ANIMATION_DELAY.short, speedMultiplier),
        '--animation-delay-medium': calcDuration(ANIMATION_DELAY.medium, speedMultiplier),
        '--animation-delay-long': calcDuration(ANIMATION_DELAY.long, speedMultiplier),
        '--animation-delay-extra-long': calcDuration(ANIMATION_DELAY.extraLong, speedMultiplier),

        // 缓动函数
        '--easing-linear': EASING.linear,
        '--easing-ease': EASING.ease,
        '--easing-ease-in': EASING.easeIn,
        '--easing-ease-out': EASING.easeOut,
        '--easing-ease-in-out': EASING.easeInOut,
        '--easing-smooth': EASING.smooth,
        '--easing-bounce': EASING.bounce,
    }
}

/**
 * 应用动画 CSS 变量到根元素
 * @param {string} speedMode - 速率模式 'disabled' | 'fast' | 'normal' | 'elegant'
 */
export function applyAnimationVars(speedMode = 'normal') {
    const mode = ANIMATION_SPEED_MODES[speedMode] || ANIMATION_SPEED_MODES.normal
    const vars = generateAnimationVars(mode.value)

    const root = document.documentElement
    Object.entries(vars).forEach(([key, value]) => {
        root.style.setProperty(key, value)
    })
}

/**
 * 获取速率模式的倍数值
 * @param {string} speedMode - 速率模式
 * @returns {number} 速率倍数
 */
export function getSpeedMultiplier(speedMode) {
    return ANIMATION_SPEED_MODES[speedMode]?.value || 1.0
}

import {defineConfig} from 'vite'
import vue from '@vitejs/plugin-vue'
import {spawn} from 'child_process'
import path from 'path'
import {fileURLToPath} from 'url'


// ES Module 中获取 __dirname
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 后端服务进程
let backendProcess = null

/**
 * 启动后端解析服务的插件
 */
function startBackendPlugin() {
    return {
        name: 'start-backend',
        configureServer(server) {
            // 异步启动后端，不阻塞 vite
            setTimeout(() => {
                const parserServicePath = path.resolve(__dirname, 'parser-service')

                console.log('\n\x1b[36m[后端服务] 正在启动 parser-service...\x1b[0m')

                backendProcess = spawn('python', ['main.py'], {
                    cwd: parserServicePath,
                    stdio: ['ignore', 'pipe', 'pipe'],
                    shell: true,
                    detached: false  // Windows 下不使用 detached
                })

                backendProcess.stdout.on('data', (data) => {
                    const output = data.toString().trim()
                    if (output) {
                        console.log(`\x1b[33m[parser-service]\x1b[0m ${output}`)
                    }
                })

                backendProcess.stderr.on('data', (data) => {
                    const output = data.toString().trim()
                    // 过滤 Python 警告信息
                    if (output && !output.includes('UserWarning') && !output.includes('pkg_resources')) {
                        console.error(`\x1b[31m[parser-service]\x1b[0m ${output}`)
                    }
                })

                backendProcess.on('close', (code) => {
                    if (code !== 0 && code !== null) {
                        console.error(`\x1b[31m[后端服务] 进程退出，退出码: ${code}\x1b[0m`)
                    }
                    backendProcess = null
                })

                backendProcess.on('error', (err) => {
                    console.error(`\x1b[31m[后端服务] 启动失败: ${err.message}\x1b[0m`)
                    console.error('\x1b[33m请确保已安装 Python 并在 parser-service 目录下执行: pip install -r requirements.txt\x1b[0m')
                })
            }, 100)  // 延迟 100ms 启动，不阻塞 vite

            // 开发服务器关闭时关闭后端
            server.httpServer?.on('close', () => {
                if (backendProcess) {
                    console.log('\n\x1b[36m[后端服务] 正在关闭...\x1b[0m')
                    backendProcess.kill()
                    backendProcess = null
                }
            })
        }
    }
}

// https://vite.dev/config/
export default defineConfig({
    plugins: [
        vue(),
        startBackendPlugin(),
    ],
    resolve: {
        alias: {'@': '/src'},
    },
    clearScreen: false,
    server: {
        port: 15173,  // 使用高位端口避免冲突
        strictPort: true
    },
    build: {
        sourcemap: true,
        rollupOptions: {
            output: {
                sourcemapPathTransform: (rel, src) =>
                    '/' +
                    path
                        .relative(process.cwd(), path.resolve(path.dirname(src), rel))
                        .replace(/\\/g, '/'),
            },
        }
    },
})

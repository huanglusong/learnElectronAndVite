import { ChildProcess } from "child_process";
import { AddressInfo } from "net";
import { Plugin, InlineConfig, mergeConfig, build as viteBuild } from "vite";
import { builtinModules } from 'node:module'
interface MyElectronOption {
    vite: InlineConfig

}

let defaultViteConfig: InlineConfig = {
    configFile: false,
    publicDir: false,
    build: {
        lib: {
            entry: 'electron/main.ts',
            formats: ['cjs'],
            fileName: () => '[name].js'
        },
        outDir: 'dist-electron',
        emptyOutDir: false,
        watch: {},
        minify: false
    },
    plugins: []
}
let electronApp: ChildProcess
// 标识刷新主进程main.js的修改
let refreshFlag: boolean = false
// 标识第一次启动electron
let firstFlag:boolean = true
export default (option: MyElectronOption): Plugin => {
    console.log('electron的vite-plugin开始执行...........')

    return {
        name: 'myElectronPlugin',
        configureServer: (server) => {
            // 监听server的listening事件
            let httpServer = server.httpServer!
            httpServer.once('listening', () => {
                let addressInfo = httpServer.address() as AddressInfo
                let url = `http://${addressInfo.address}:${addressInfo.port}`
                console.log(`vite启动服务的url信息是：${url}`)
                Object.assign(process.env, { VITE_DEV_SERVER_URL: url })
                defaultViteConfig.mode = server.config.mode
                defaultViteConfig.plugins.push({
                    name: 'startElectron',
                    closeBundle: () => {
                        console.log('主进程代码重新构建完毕，开始启动electron应用......')
                        if(firstFlag){
                            firstFlag = false
                        }else{
                            refreshFlag = true
                        }
                        startElectron()
                    }
                })
                let viteConfig: InlineConfig = withExternalBuiltins(mergeConfig(defaultViteConfig, option.vite))
                viteBuild(viteConfig)
            })
        }
    }
}
/**
 * 启动electron应用
 */
const startElectron = async () => {
    if (electronApp) {
        electronApp.kill()
    }
    const { spawn } = await import('node:child_process')
    const electron = await import('electron')
    let electronPath = electron.default + ''
    console.log(`开始启动electron应用！启动命令为：${electronPath}`)
    electronApp = spawn(electronPath, ['.'], { stdio: 'inherit' })
    electronApp.once('exit', () => {
        if (!refreshFlag) {
            process.exit()
        }
        refreshFlag = false
    })
}

const withExternalBuiltins = (config: InlineConfig): InlineConfig => {
    const builtins = builtinModules.filter(e => !e.startsWith('_')); builtins.push('electron', ...builtins.map(m => `node:${m}`))

    config.build ??= {}
    config.build.rollupOptions ??= {}

    let external = config.build.rollupOptions.external
    if (
        Array.isArray(external) ||
        typeof external === 'string' ||
        external instanceof RegExp
    ) {
        external = builtins.concat(external as string[])
    } else if (typeof external === 'function') {
        const original = external
        external = function (source, importer, isResolved) {
            if (builtins.includes(source)) {
                return true
            }
            return original(source, importer, isResolved)
        }
    } else {
        external = builtins
    }
    config.build.rollupOptions.external = external

    return config
}
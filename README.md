# 用vite的方式开发electron应用

`vite`的构建方式让前端人员的编程体验好了太多，最近在学习`electron`应用的开发，就在想能不能使用`vite`的方式开发`electron`应用。看了很多方案，大部分都是基于`webpack`的脚手架。

那么有没有一种方式能够将`vite`结合`electron`，来开发`electron`应用呢？答案当然是有的，作为`electron`与`vite`整合开源方案中最火的项目：[vite-plugin-electron](https://github.com/electron-vite/vite-plugin-electron)  。本文将基于这个项目的实现思路，详细记录如何编写`vite`插件并在最终能够手写一个`vite`插件实现用`vite`的方式开发`electron`应用这么一个小目标。

阅读本文前你需要对`vite`有一个基本的认识，否则你将对一些内容感到一头雾水。如果你对`vite`的插件开发有兴趣的话，请一定耐心阅读完本文，干货满满。

在本文将我将提到以下几点：

- `vite`插件的基础知识与简单应用
- `electron`应用开发的入门
- `vite`整合`electron`应用开发的思路
- 编写`vite`插件实现`vite`与`electron`应用的整合

## vite插件的基础知识与简单应用

`vite`插件的用途简单来说就是帮助我们在`vite`构建的不同生命周期中执行我们需要的业务逻辑，这有时候对我们很重要。`vite`针对这些生命周期暴露出了很多对应的生命周期函数钩子，我们只需要实现这些钩子函数即可。

### vite的生命周期

`vite`的生命周期分为两种：`rollup`的生命周期和`vite`特有的生命周期。

#### 通用钩子

我们知道`vite`项目打包时底层依赖的是`rollup`，而`rollup`打包过程是有自己的一套生命周期的，`vite`为了与其保持一致，故保留了相应的生命周期钩子，这些称作通用钩子。

服务启动时被调用：

- `options`：这是构建阶段的第一个钩子，用于替换或操作传递给 `rollup.rollup` 的选项对象
- `buildStart`：可获取`rollup.rollup` 的选项对象

传入每个模块请求时被调用：

- `resolveId`
- `load`
- `transform`

服务器关闭时被调用：

- `buildEnd`：在 `Rollup` 完成产物但尚未调用 `generate` 或 `write` 之前调用
- `closeBundle`：`bundle.close()`后最后一个触发的钩子，一般可用于清理可能正在运行的任何外部服务

#### vite特用的钩子

##### config

在解析 `vite`配置前调用，它可以返回一个将被深度合并到现有配置中的部分配置对象，或者直接改变配置（如果默认的合并不能达到预期的结果）。

```javascript
// 返回部分配置（推荐）
const partialConfigPlugin = () => ({
  name: 'return-partial',
  config: () => ({
    resolve: {
      alias: {
        foo: 'bar',
      },
    },
  }),
})

// 直接改变配置（应仅在合并不起作用时使用）
const mutateConfigPlugin = () => ({
  name: 'mutate-config',
  config(config, { command }) {
    if (command === 'build') {
      config.root = 'foo'
    }
  },
})
```

##### configResolved

在解析 Vite 配置后调用。使用这个钩子读取和存储最终解析的配置。

```javascript
const examplePlugin = () => {
  let config

  return {
    name: 'read-config',

    configResolved(resolvedConfig) {
      // 存储最终解析的配置
      config = resolvedConfig
    },

    // 在其他钩子中使用存储的配置
    transform(code, id) {
      if (config.command === 'serve') {
        // dev: 由开发服务器调用的插件
      } else {
        // build: 由 Rollup 调用的插件
      }
    },
  }
}
```

##### configureServer

是用于配置开发服务器的钩子，最常见的用例是在内部 [connect](https://github.com/senchalabs/connect) 应用程序中添加自定义中间件。

`connect`应用程序是一个中间件层，可往其中添加很多中间件

中间件可简单理解为一个**函数或拦截器**，请求在进入正式的业务逻辑前，会先被**中间件链（拦截器链）**处理。

```javascript
const myPlugin = () => ({
  name: 'configure-server',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      // 自定义请求处理...
    })
  },
})
```

##### 其余不常用的钩子

- `configurePreviewServer`
- `transformIndexHtml`
- `handleHotUpdate`

### vite的简单应用

首先通过`vite`的官方模板创建一个`vite`项目

```shell
npm create vite@latest
```

编写一个简单的插件，插件的作用只是在各个生命周期钩子被调用时打印内容和参数，代码如下：

```typescript
// 文件名为：vite-plugin-featureTest.ts
import { Plugin } from "vite";
interface FeatureTestOption {

}

export default (option: FeatureTestOption): Plugin => {

    return {
        name: 'featureTest',
        options: (curOpt) => {
            console.log('通用钩子options被调用！参数为：',curOpt)
            console.log('==========================================================')
        },
        buildStart:(curOpt)=>{
            console.log('通用钩子buildStart被调用！参数为：',curOpt)
            console.log('==========================================================')
        },
        buildEnd:()=>{
            console.log('通用钩子buildEnd被调用！')
            console.log('==========================================================')
        },
        closeBundle:()=>{
            console.log('通用钩子closeBundle被调用！')
            console.log('==========================================================')
        },
        config:(cfg,env)=>{
            console.log('vite特有的钩子config被调用！参数config为：',cfg,'参数env为：',env)
            console.log('==========================================================')
        },
        configResolved:(cfg)=>{
            console.log('vite特有的钩子configResolve被调用！参数config为：',cfg)
            console.log('==========================================================')
        },
        configureServer:(server)=>{
            console.log('vite特有的钩子configureServer被调用！参数server：',server)
            console.log('==========================================================')
        }
    }
}
```

我们使用`typesecipt`进行开发来获取更好的代码提示。开发一个插件其实很简单，就是要定义一个类型为`Plugin`的对象，但是为了更好的扩展性，插件约定俗成的写法是通过函数返回`Plugin`类型的对象，同时函数接收一个插件参数对象。

生命周期的钩子在`Plugin`类型对象中都有一一对应的属性，属性值为一个函数，我们的工作就是编写这些函数。

接下来，我们要在`vite`配置中引入我们编写的插件

```typescript
// 文件名：vite.config.ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import myVitePlugin from './plugins/vite-plugin-featureTest'
// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    myVitePlugin({})
  ],
})

```

在`plugins`数组中调用插件暴露的函数即可。

最后观察结果：

```javascript
PS C:\Users\huanghe\others\vscode-projects\learnElectronAndVite\vite-project> npm run dev

> vite-project@0.0.0 dev
> vite

vite特有的钩子config被调用！参数config为： {       
  plugins: [
    {
      name: 'vite:vue',
      api: [Object],
      handleHotUpdate: [Function: handleHotUpdate],
      config: [Function: config],
      configResolved: [Function: configResolved],  
      configureServer: [Function: configureServer],
      buildStart: [Function: buildStart],
      resolveId: [AsyncFunction: resolveId],       
      load: [Function: load],
      transform: [Function: transform]
    },
    ....省略...
} 
参数env为： {
  mode: 'development',
  command: 'serve',
  isSsrBuild: false,
  isPreview: false
}
==========================================================
vite特有的钩子configResolve被调用！参数config为： {
  plugins: [
    {
      name: 'vite:optimized-deps',
      resolveId: [Function: resolveId],
      load: [AsyncFunction: load]
    },
    {
      name: 'vite:watch-package-data',
      buildStart: [Function: buildStart],
      buildEnd: [Function: buildEnd],
      watchChange: [Function: watchChange],
      handleHotUpdate: [Function: handleHotUpdate]
    },
    { name: 'vite:pre-alias', resolveId: [AsyncFunction: resolveId] },
    {
      name: 'alias',
      buildStart: [AsyncFunction: buildStart],
      resolveId: [Function: resolveId]
    },
    {
      name: 'vite:modulepreload-polyfill',
      resolveId: [Function: resolveId],
      load: [Function: load]
    },
    {
      name: 'vite:resolve',
      resolveId: [AsyncFunction: resolveId],
      load: [Function: load]
    },
    {
      name: 'vite:html-inline-proxy',
      resolveId: [Function: resolveId],
      load: [Function: load]
    },
    {
      name: 'vite:css',
      configureServer: [Function: configureServer],
      buildStart: [Function: buildStart],
      transform: [AsyncFunction: transform]
    },
    {
      name: 'vite:esbuild',
      configureServer: [Function: configureServer],
      buildEnd: [Function: buildEnd],
      transform: [AsyncFunction: transform]
    },
    { name: 'vite:json', transform: [Function: transform] },
    {
      name: 'vite:wasm-helper',
      resolveId: [Function: resolveId],
      load: [AsyncFunction: load]
    },
    {
      name: 'vite:worker',
      configureServer: [Function: configureServer],
      buildStart: [Function: buildStart],
      load: [Function: load],
      shouldTransformCachedModule: [Function: shouldTransformCachedModule],
      transform: [AsyncFunction: transform],
      renderChunk: [Function: renderChunk],
      generateBundle: [Function: generateBundle]
    },
    {
      name: 'vite:asset',
      buildStart: [Function: buildStart],
      configureServer: [Function: configureServer],
      resolveId: [Function: resolveId],
      load: [AsyncFunction: load],
      renderChunk: [Function: renderChunk],
      generateBundle: [Function: generateBundle]
    },
    {
      name: 'vite:vue',
      api: [Object],
      handleHotUpdate: [Function: handleHotUpdate],
      config: [Function: config],
      configResolved: [Function: configResolved],
      configureServer: [Function: configureServer],
      buildStart: [Function: buildStart],
      resolveId: [AsyncFunction: resolveId],
      load: [Function: load],
      transform: [Function: transform]
    },
    {
      name: 'featureTest',
      options: [Function: options],
      buildStart: [Function: buildStart],
      buildEnd: [Function: buildEnd],
      closeBundle: [Function: closeBundle],
      config: [Function: config],
      configResolved: [Function: configResolved],
      configureServer: [Function: configureServer]
    },
    { name: 'vite:wasm-fallback', load: [AsyncFunction: load] },
    { name: 'vite:define', transform: [AsyncFunction: transform] },
    {
      name: 'vite:css-post',
      renderStart: [Function: renderStart],
      transform: [AsyncFunction: transform],
      renderChunk: [AsyncFunction: renderChunk],
      augmentChunkHash: [Function: augmentChunkHash],
      generateBundle: [AsyncFunction: generateBundle]
    },
    {
      name: 'vite:worker-import-meta-url',
      shouldTransformCachedModule: [Function: shouldTransformCachedModule],
      transform: [AsyncFunction: transform]
    },
    {
      name: 'vite:asset-import-meta-url',
      transform: [AsyncFunction: transform]
    },
    {
      name: 'vite:dynamic-import-vars',
      resolveId: [Function: resolveId],
      load: [Function: load],
      transform: [AsyncFunction: transform]
    },
    {
      name: 'vite:import-glob',
      configureServer: [Function: configureServer],
      transform: [AsyncFunction: transform]
    },
    {
      name: 'vite:client-inject',
      buildStart: [AsyncFunction: buildStart],
      transform: [AsyncFunction: transform]
    },
    {
      name: 'vite:import-analysis',
      configureServer: [Function: configureServer],
      transform: [AsyncFunction: transform]
    }
  ],
  ....省略....
}
==========================================================
通用钩子options被调用！参数为： {}
==========================================================
vite特有的钩子configureServer被调用！参数server： {
  config: {
    plugins: [
      [Object], [Object], [Object],
      [Object], [Object], [Object],
      [Object], [Object], [Object],
      [Object], [Object], [Object],
      [Object], [Object], [Object],
      [Object], [Object], [Object],
      [Object], [Object], [Object],
      [Object], [Object], [Object]
    ],
    ....省略....
  middlewares: [Function: app] {
    use: [Function: use],
    handle: [Function: handle],
    listen: [Function: listen],
    _events: undefined,
    _eventsCount: 0,
    _maxListeners: undefined,
    setMaxListeners: [Function: setMaxListeners],
    getMaxListeners: [Function: getMaxListeners],
    emit: [Function: emit],
    addListener: [Function: addListener],
    on: [Function: addListener],
    prependListener: [Function: prependListener],
    once: [Function: once],
    prependOnceListener: [Function: prependOnceListener],
    removeListener: [Function: removeListener],
    off: [Function: removeListener],
    removeAllListeners: [Function: removeAllListeners],
    listeners: [Function: listeners],
    rawListeners: [Function: rawListeners],
    listenerCount: [Function: listenerCount],
    eventNames: [Function: eventNames],
    route: '/',
    stack: []
  },
  httpServer: Server {
    maxHeaderSize: undefined,
    insecureHTTPParser: undefined,
    _events: [Object: null prototype] {
      request: [Function],
      connection: [Array],
      upgrade: [Function: hmrServerWsListener],
      clientError: [Function (anonymous)],
      listening: [Array]
    },
    _eventsCount: 5,
    _maxListeners: undefined,
    _connections: 0,
    _handle: null,
    _usingWorkers: false,
    _workers: [],
    _unref: false,
    allowHalfOpen: true,
    pauseOnConnect: false,
    noDelay: false,
    keepAlive: false,
    keepAliveInitialDelay: 0,
    httpAllowHalfOpen: false,
    timeout: 0,
    keepAliveTimeout: 5000,
    maxHeadersCount: null,
    maxRequestsPerSocket: 0,
    headersTimeout: 60000,
    requestTimeout: 0,
    [Symbol(IncomingMessage)]: [Function: IncomingMessage],
    [Symbol(ServerResponse)]: [Function: ServerResponse],
    [Symbol(kCapture)]: false,
    [Symbol(async_id_symbol)]: -1,
    [Symbol(kUniqueHeaders)]: null
  },
  ...省略...
}
==========================================================
通用钩子buildStart被调用！参数为： {}
==========================================================

  VITE v5.0.10  ready in 659 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help
```

从最后的结果中我们可以发现，我们定义的函数分别在`vite`构建过程的不同阶段被调用。

**有个特别的点我专门记录下：**

`configResolved`阶段能获取最终的`config`，从中我们发现了很多不是我们配置的`plugin`，这些是`vite`帮我们注入的。

```javascript
plugins: [
    {
      name: 'vite:optimized-deps',
      resolveId: [Function: resolveId],
      load: [AsyncFunction: load]
    },
    {
      name: 'vite:watch-package-data',
      buildStart: [Function: buildStart],
      buildEnd: [Function: buildEnd],
      watchChange: [Function: watchChange],
      handleHotUpdate: [Function: handleHotUpdate]
    },
    { name: 'vite:pre-alias', resolveId: [AsyncFunction: resolveId] },
    {
      name: 'alias',
      buildStart: [AsyncFunction: buildStart],
      resolveId: [Function: resolveId]
    },
    {
      name: 'vite:modulepreload-polyfill',
      resolveId: [Function: resolveId],
      load: [Function: load]
    },
    {
      name: 'vite:resolve',
      resolveId: [AsyncFunction: resolveId],
      load: [Function: load]
    },
    {
      name: 'vite:html-inline-proxy',
      resolveId: [Function: resolveId],
      load: [Function: load]
    },
    {
      name: 'vite:css',
      configureServer: [Function: configureServer],
      buildStart: [Function: buildStart],
      transform: [AsyncFunction: transform]
    },
    {
      name: 'vite:esbuild',
      configureServer: [Function: configureServer],
      buildEnd: [Function: buildEnd],
      transform: [AsyncFunction: transform]
    },
    { name: 'vite:json', transform: [Function: transform] },
    {
      name: 'vite:wasm-helper',
      resolveId: [Function: resolveId],
      load: [AsyncFunction: load]
    },
    {
      name: 'vite:worker',
      configureServer: [Function: configureServer],
      buildStart: [Function: buildStart],
      load: [Function: load],
      shouldTransformCachedModule: [Function: shouldTransformCachedModule],
      transform: [AsyncFunction: transform],
      renderChunk: [Function: renderChunk],
      generateBundle: [Function: generateBundle]
    },
    {
      name: 'vite:asset',
      buildStart: [Function: buildStart],
      configureServer: [Function: configureServer],
      resolveId: [Function: resolveId],
      load: [AsyncFunction: load],
      renderChunk: [Function: renderChunk],
      generateBundle: [Function: generateBundle]
    },
    {
      name: 'vite:vue',
      api: [Object],
      handleHotUpdate: [Function: handleHotUpdate],
      config: [Function: config],
      configResolved: [Function: configResolved],
      configureServer: [Function: configureServer],
      buildStart: [Function: buildStart],
      resolveId: [AsyncFunction: resolveId],
      load: [Function: load],
      transform: [Function: transform]
    },
    {
      name: 'featureTest',
      options: [Function: options],
      buildStart: [Function: buildStart],
      buildEnd: [Function: buildEnd],
      closeBundle: [Function: closeBundle],
      config: [Function: config],
      configResolved: [Function: configResolved],
      configureServer: [Function: configureServer]
    },
    { name: 'vite:wasm-fallback', load: [AsyncFunction: load] },
    { name: 'vite:define', transform: [AsyncFunction: transform] },
    {
      name: 'vite:css-post',
      renderStart: [Function: renderStart],
      transform: [AsyncFunction: transform],
      renderChunk: [AsyncFunction: renderChunk],
      augmentChunkHash: [Function: augmentChunkHash],
      generateBundle: [AsyncFunction: generateBundle]
    },
    {
      name: 'vite:worker-import-meta-url',
      shouldTransformCachedModule: [Function: shouldTransformCachedModule],
      transform: [AsyncFunction: transform]
    },
    {
      name: 'vite:asset-import-meta-url',
      transform: [AsyncFunction: transform]
    },
    {
      name: 'vite:dynamic-import-vars',
      resolveId: [Function: resolveId],
      load: [Function: load],
      transform: [AsyncFunction: transform]
    },
    {
      name: 'vite:import-glob',
      configureServer: [Function: configureServer],
      transform: [AsyncFunction: transform]
    },
    {
      name: 'vite:client-inject',
      buildStart: [AsyncFunction: buildStart],
      transform: [AsyncFunction: transform]
    },
    {
      name: 'vite:import-analysis',
      configureServer: [Function: configureServer],
      transform: [AsyncFunction: transform]
    }
  ],
```

## electron应用开发的入门

`Electron`是一个使用 `JavaScript`、`HTML` 和 `CSS` 构建桌面应用程序的框架。

`Electron`将`Chromium`和`Node.js`嵌入到应用中，因此可以使用他们的特性，并天然的拥有跨平台的特性。

### electron技术的核心概念

`electron`使用的是多进程架构，分为**主进程**和**渲染进程**。

#### 主进程

主进程在 `Node.js` 环境中运行，这意味着它具有 `require` 模块和使用所有 **Node.js API** 的能力。

`Electron`封装了很多**原生API**，这使得在主进程中有操控原生桌面功能的能力，例如菜单、对话框以及托盘图标。

#### 渲染器进程

每个 `Electron` 应用都会为每个打开的 `BrowserWindow` ( 与每个网页嵌入 ) 生成一个单独的**渲染器进程**。 洽如其名，渲染器负责 *渲染* 网页内容。 所以实际上，运行于渲染器进程中的代码是须遵照网页标准的。因此渲染器进程中运行的代码，与web应用的开发方式是完全一致的。

渲染器进程可以完整的使用`nodejs`的api，但是出于安全考虑，这项特性现在已经被默认禁用。

### electron应用快速入门

我们来编写一个`electron`应用的hello-world案例，了解如何开发`electron`应用。

`electron`是基于`nodejs`的，老生常谈的`nodejs`项目的初始化流程就此跳过了。

---

安装`electron`框架的依赖

```shell
npm install --save-dev electron
```

---

`package.json`中新增一条`script`命令，将`main`属性中指定为`main.js`

```javascript
{
  "name": "electron-helloworld",
  "version": "1.0.0",
  "description": "",
  "main": "main.js",
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1",
    "dev":"electron ."
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "devDependencies": {
    "electron": "^28.0.0"
  }
}

```

我们新增了一条`dev`命令，内容为`electron .`

`electron`应用启动的时候默认会取`main`属性中指定的js文件作为主进程的逻辑

---

编写`main.js`文件，其将在主进程中执行，具有完全的`nodejs` api的能力

```javascript
// main.js

// Modules to control application life and create native browser window
const { app, BrowserWindow } = require('electron')

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
    //   preload: path.join(__dirname, 'preload.js')
    }
  })

  // 加载 index.html
  mainWindow.loadFile('index.html')
}

// 这段程序将会在 Electron 结束初始化
// 和创建浏览器窗口的时候调用
// 部分 API 在 ready 事件触发后才能使用。
app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    // 在 macOS 系统内, 如果没有已开启的应用窗口
    // 点击托盘图标时通常会重新创建一个新窗口
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// 除了 macOS 外，当所有窗口都被关闭的时候退出程序。 因此, 通常
// 对应用程序和它们的菜单栏来说应该时刻保持激活状态, 
// 直到用户使用 Cmd + Q 明确退出
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

```

我们来看一下`main.js`文件的内容：

引入`app`和`BrowserWindow`模块，

- `app`模块负责控制应用程序的事件生命周期
- `BrowserWindow`模块，它创建和管理应用程序 窗口

添加一个`createWindow()`方法来将`index.html`加载进一个新的`BrowserWindow`实例

```javascript
const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
    //   preload: path.join(__dirname, 'preload.js')
    }
  })

  // 加载 index.html
  mainWindow.loadFile('index.html')
}
```

在 `Electron` 中，只有在 `app` 模块的 `ready` 事件被激发后才能创建浏览器窗口。 您可以通过使用 `app.whenReady`() API来监听此事件。 在`whenReady()`成功后调用`createWindow()`。

```javascript
app.whenReady().then(() => {
  createWindow()
})
```

当所有的窗口都关闭，`app`则退出，`electron`相关进程都结束。

---

编写`index.html`，作为浏览器窗口渲染的内容

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>home</title>
</head>
<body>
    <h1>hello electron</h1>
</body>
</html>
```

---

最后，我们启动项目看一看效果

![electron启动界面](https://huanghedidi-img-repository.oss-cn-shenzhen.aliyuncs.com/20231216202125.png)



## vite整合electron开发的思路

在分析整合思路前我们先梳理下`vite`和`electron`各自的开发模式：

`vite`在开发阶段使用`dev-server`预览项目，其会提供一个`url`地址。部署阶段将项目打包成静态资源，包括`html`，`js`和`css`等等。

`electron`主进程中运行的代码是在`Nodejs`环境中，渲染进程运行的代码可以认为在**浏览器环境**中，浏览器窗口中加载的渲染内容可以选择是`html`静态资源也可以是一个`url`地址，如下：

```javascript
//第一种 url方式
win.loadURL(VITE_DEV_SERVER_URL)
// 文件方式
win.loadFile(path.join(process.env.DIST, 'index.html'))
```

那么在分析`vite`整合`electron`进行开发的方案时，我们就可以设想以下的思路：

- 在开发阶段，`electron`渲染进程通过访问`vite`的`dev-server`暴露的`url`来加载内容
- 在部署阶段，`electron`通过`vite`的构建产物加载内容

为了验证这种思路，我们分别基于`vite`和`electron`创建两个项目。

开发阶段：我们启动`vite`项目，`vite`的`dev-server`提供的url是http://localhost:5173/，通过浏览器访问呈现的内容是：**hello vite!!!**

![](https://huanghedidi-img-repository.oss-cn-shenzhen.aliyuncs.com/20231216204319.png)

接着，我们进入`electron`项目，并将这个`url`写入`electron`的主进程代码中，

```javascript
win.loadURL("http://localhost:5173/")
```

随后我们启动`electron`应用，效果如下：

![](https://huanghedidi-img-repository.oss-cn-shenzhen.aliyuncs.com/20231216204610.png)

直接成功了！`electron`中呈现的也是：**hello vite!!!**

部署阶段，过程也是类似，但是因为是两个项目过程较繁琐，我们跳过。

通过上述的实验，可以证明方案是可行的。但通过两个项目的方式开发`electron`应用终究是不优雅的，因此我们要探究一种能将这个思路完美整合到`vite`项目中的方式。

所幸`vite`的插件功能为我们提供了整合的可能性，接下来我们将探寻如何通过`vite`的插件，实现完美的基于`vite`的`electron`开发方案。



## 通过vite插件实现vite与electron的整合

我们通过开发一个`vite`插件的方案来实现`vite`方式开发`electron`应用，我们将分为两种场景分别应对，一个是**开发阶段**，一个是编译阶段。

### 开发阶段

首先是开发阶段，核心的思想就是让`vite`先通过`dev-server`的方式跑起来，并获取其`url`信息，再通过子进程的方式将`electron`应用启动，然后`electron`应用的渲染进程加载`vite`的`dev-server`的内容。

落地到`vite`插件的实现上，我们可以通过`configSever`钩子，获取到`vite`的`dev-server`的配置信息，并从中获取启动的`url`地址，然后保存到环境变量`process.env`中。我们通过监听`dev-server`的`listening`事件，保证在`vite`完全启动后，再使用`spawn`执行`electron .` 命令，启动`electron`应用。

```typescript
import { ChildProcess } from "child_process";
import { AddressInfo } from "net";
import { Plugin } from "vite";
interface MyElectronOption {

}
let electronApp: ChildProcess
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
                startElectron()
            })
        }
    }
}
/**
 * 启动electron应用
 */
const startElectron = async () => {
    const { spawn } = await import('node:child_process')
    const electron = await import('electron')
    let electronPath = electron.default + ''
    console.log(`开始启动electron应用！启动命令为：${electronPath}`)
    electronApp = spawn(electronPath, ['.'], { stdio: 'inherit' })
    electronApp.once('exit', () => {
        process.exit()
    })
}
```

我们在`App.vue`中写了如下要呈现的内容

```html
<script setup lang="ts">
// import HelloWorld from './components/HelloWorld.vue'
</script>

<template>
<h1>hello vite+electron!!!</h1>
</template>

<style scoped>
</style>

```

来看看启动的效果

![](https://huanghedidi-img-repository.oss-cn-shenzhen.aliyuncs.com/20231216232915.png)

看到结果，惊喜万分！！我们已经初步实现了通过`vite`的方式开发`electron`应用！！！并且当我们改变前端内容时，也是支持热加载的。

但是，如果我们改变了`electron`主进程的内容则不支持热加载，并且如果我们希望通过`ts`的方式编写主进程代码也不支持的，那么我们接下来针对这些痛点进行优化。

#### 优化插件

我们通过更改`vite`的配置并手动调用`vite`的`build`方法即可将指定的文件进行预构建。

优化后的代码如下：

```typescript
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
```

我们在`electron/main.ts`中编写`electron`主进程的逻辑，并通过`vite`构建到`dist-electron/main.js`下。因为`electron`识别的是`js`文件，我们还要将`package.json`中的`main`属性调整至：`dist-electron/main.js`

经过这个优化我们实现了以下特性：

- 只要我们调整了`electron/main.ts`的内容，`electron`会自动重启并且不退出`vite`服务
- 只要我们关闭`electron`应用，`vite`服务也会自动退出

### 小结

至此，我们通过`vite`插件的方式，已经基本实现了通过`vite`的方式开发`electron`应用这个目标，也就是我们完全可以按照原先开发**web应用**的方式来开发**electron应用**了。

关于构建场景下vite插件的实现，有空了再来详细记录填坑。

**vite插件的实现方案参考的是[vite-plugin-electron](https://github.com/electron-vite/vite-plugin-electron) ，有兴趣的小伙伴可到他的仓库地址详细阅读源码。**

关于本文中的所有代码，均已上传：[github仓库：learnElectronAndVite](https://github.com/huanglusong/learnElectronAndVite)

欢迎访问的我的个人博客：https://huanglusong.github.io/

欢迎加入我创建的qq技术交流群：**624017389**

## 引用

[vite官方中文文档](https://cn.vitejs.dev/guide/api-plugin)

[Electron官方中文文档](https://www.electronjs.org/zh/docs/latest/)

[vite-plugin-electron](https://github.com/electron-vite/vite-plugin-electron)


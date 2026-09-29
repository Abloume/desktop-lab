# Lesson 02 · IPC 与安全模型

> 自查表述速记。所有结论都能在 `src/main.ts` / `src/preload.ts` / `src/renderer/index.html` 里找到对应代码。

## 一句话结论

**IPC 有且只有三种主流方式——invoke（请求-响应，最常用）、send/on（单向通知）、MessagePort（双向直连）；安全模型是一套纵深防御——nodeIntegration 关、contextIsolation 开、sandbox 开、CSP 收紧，preload 是唯一的桥，只暴露白名单。**

## IPC 三种方式对比（Q3）

| 方式 | API | 语义 | 适用场景 | 数据/性能 |
| --- | --- | --- | --- | --- |
| 请求-响应 | `ipcMain.handle` + `ipcRenderer.invoke` | Promise 化的 RPC | 拿系统数据、读写文件、任何需要返回值 | 结构化克隆；不要传大对象 |
| 单向通知 | `ipcMain.on` + `ipcRenderer.send` | fire-and-forget | 通知类：日志上报、命令下发、主进程广播 | 同上 |
| 双向直连 | `MessageChannelMain` + `MessagePort` | 双向通道，可转移 | **渲染进程间直连**（不经主进程转发）、大数组/流式 | 支持 Transferable（ArrayBuffer 转移而非拷贝） |

要点：
- **invoke 是主选**：语义清晰、可 await、错误能 throw 回来；
- **send 适合广播**：主进程可以主动 `webContents.send` 推给任意窗口；
- **MessagePort 是进阶**：`webContents.postMessage('port', null, [port])` 把端口转移给渲染进程，之后 A ⇄ B 直接通信，主进程只负责搭桥不转发数据；
- 传大数组/文件：不要直接塞 IPC payload——大数组用 MessagePort + Transferable；大文件走「主进程 fs 流式读 + 传文件路径」。

## preload 与 contextBridge 正确姿势（Q4）

```
渲染进程（页面 JS） ←── contextBridge 白名单 ──→ preload ←── ipcRenderer ──→ 主进程
```

- **preload 存在的意义**：安全边界。渲染进程是「不可信环境」（可能被 XSS/注入），所有系统能力必须经白名单流入；
- **为什么不直接开 nodeIntegration**：开着 = 渲染进程有完整 Node 权限，页面一旦被注入就直接拿到系统（RCE），与整个安全模型背道而驰；
- **正确姿势三原则**（对应 `preload.ts`）：
  1. `contextBridge.exposeInMainWorld('api', {...})` 白名单注入；
  2. **不暴露 ipcRenderer 本体**，每个能力包成函数（通道名、参数都被 preload 锁死）；
  3. 事件订阅也封装（`onTick(cb)`），数据流向由 preload 决定；
- contextIsolation 开了之后，页面和 preload 是两个 JS 世界，页面只能碰到白名单。

## 安全模型：纵深防御（Q5）

| 层 | 防什么 | 突破后还剩什么 |
| --- | --- | --- |
| `nodeIntegration: false` | 渲染进程无 Node API | 页面还是"浏览器" |
| `contextIsolation: true` | 页面碰不到 preload/Electron 内部对象 | 只能调白名单 |
| `sandbox: true` | 渲染进程系统调用被沙箱限制 | 即使 RCE 也拿不到系统权限 |
| CSP（meta/http 头） | 禁止加载外来源脚本/内联执行 | XSS 注入被内容层拦截 |

- **remote 模块为什么被移除**：它让渲染进程能 `require` 主进程模块并**同步调用**，等于绕过 IPC 边界、穿透进程隔离——加上同步 RPC 卡顿 UI，Electron 12 移出、14 彻底移除；
- 一句话收口：**纵深防御 = 层层设防，单点被突破不意味着系统失守**。这是安全题的加分句。

## 自查题 + 参考表述（demo 对应位置）

**Q3：主进程 ⇄ 渲染进程有哪几种通信方式？** → `main.ts` 三块对应注释
> "三种：invoke/handle 请求-响应最常用，适合拿数据；send/on 单向通知，适合广播和命令下发；MessagePort 双向直连，适合渲染进程间通信和大数据转移。大文件不塞 IPC payload，走主进程流式读 + 传路径；大数组用 MessagePort 的 Transferable 转移。"

**Q4：preload 存在的意义？为什么不直接开 nodeIntegration？** → `preload.ts` 头注释
> "渲染进程是不可信环境，系统能力必须经白名单进入。开 nodeIntegration 等于页面有完整 Node 权限，被 XSS 注入就直接 RCE。正确姿势是 contextBridge.exposeInMainWorld 只暴露封装方法，不交 ipcRenderer 本体，事件订阅也封装，数据流向由 preload 决定。"

**Q5：contextIsolation / sandbox / CSP 各防什么？remote 为什么移除？** → `main.ts` webPreferences + `index.html` CSP meta
> "这是纵深防御：nodeIntegration 关掉让渲染进程没有 Node；contextIsolation 让页面和 preload 隔离，页面只能碰白名单；sandbox 限制渲染进程的系统调用，被攻破也拿不到系统权限；CSP 限制页面能加载执行的资源，防注入。remote 被移除是因为它让渲染进程绕过 IPC 边界同步调主进程模块，破坏隔离模型。"

## 坑清单（自查易错点）

- ❌ 把 `ipcRenderer` 本体通过 contextBridge 暴露出去——白名单形同虚设
- ❌ 渲染进程来的参数不校验直接进 `fs` / `shell`——这是远程代码执行的经典入口
- ❌ 只开 `contextIsolation` 忘了 `sandbox`——单层防御，纵深断裂
- ❌ CSP 写成 `*` 或留空——注入防护失效
- ❌ `ipcRenderer.on` 每次加载重复注册不清理——监听器泄漏（内存问题，呼应 Lesson 01）
- ❌ 大对象直接塞 invoke——结构化克隆有成本，卡 UI
- ⚠️ preload 里也用 `process.versions` 这类信息时注意：sandbox 下 preload 能用的 API 有限（`require('electron')` 子集）

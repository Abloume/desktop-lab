# Lesson 01 · 进程模型与生命周期

> 自查表述速记。所有结论都能在 `src/main.ts` 里找到对应代码。

## 一句话结论

**Electron 应用 = 1 个主进程（Node，总控）+ N 个渲染进程（Chromium，页面）+ 若干辅助进程；多进程是为了「隔离、安全、稳定」；生命周期由一系列 app 事件驱动，平台差异集中在 macOS。**

## 为什么是多进程（Q1 核心）

| 动机 | 说明 | 类比 |
| --- | --- | --- |
| 隔离 | 一个渲染进程崩溃/卡死，不影响其他窗口和主进程 | 浏览器多标签页，但 Electron 页面是本地文件 |
| 安全 | 渲染进程权限最小化、可沙箱化，页面被攻破也只拿到「浏览器」 | 浏览器沙箱模型 |
| 稳定 | 主进程职责最小化（生命周期 + 系统 API），是应用的最后防线 | 操作系统内核与用户态 |

补充：实际进程还包括 **GPU 进程**（合成渲染）、**utility 进程**（特定系统任务）。Electron 的 `app` 是唯一的「主进程」，对应到浏览器就是「浏览器进程」。

## 进程分工

| 进程 | 环境 | 职责 | 能否用 Node |
| --- | --- | --- | --- |
| 主进程 Main | Node.js | 窗口生命周期、菜单/托盘/通知、系统 API（fs/net/child_process） | ✅ 全部 |
| 渲染进程 Renderer | Chromium | 页面 UI 与交互 | ❌ 默认关闭（nodeIntegration: false） |
| GPU / Utility | 特殊运行时 | 合成、媒体等系统任务 | 视情况 |

**渲染进程需要系统能力时**：不能直连，只能通过 preload（contextBridge）暴露的白名单 IPC 方法，向主进程请求。

## 生命周期时序

```
启动
 └─ ready（whenReady）───────────── 创建窗口的唯一时机
      ├─ 窗口创建/加载（did-finish-load）
      ├─ 窗口关闭 ……
      └─ window-all-closed（所有窗口关闭）
           ├─ macOS：不退出，等 activate 重建
           └─ Win/Linux：app.quit()
                ├─ before-quit（可拦截取消）
                ├─ will-quit（清理资源最后时机）
                └─ quit（已退出）
```

| 事件 | 触发时机 | 平台 |
| --- | --- | --- |
| `ready` | 应用初始化完成 | 所有 |
| `window-all-closed` | 所有窗口关闭后 | 所有 |
| `activate` | 应用被激活（点 Dock / 切回前台） | **macOS 专属** |
| `before-quit` | 即将退出（可阻止） | 所有 |
| `will-quit` | 所有窗口已关闭，退出流程不可逆 | 所有 |
| `quit` | 应用已退出 | 所有 |

## 崩溃处理（Q3）

- 监听 `webContents.on('render-process-gone')`（旧 `crashed` 已废弃）
- `details.reason`：`clean-exit` / `abnormal-exit` / `killed` / `crashed` / `oom` 等
- 恢复方式：重新 `loadURL` / `reload`（Electron 会拉起新渲染进程）；更稳的做法是先检查 `webContents.isCrashed()` 再决定
- **主进程崩溃 = 应用整体退出**（没有"重建主进程"一说，所以主进程代码要尽量简单可靠）

## 自查题 + 参考表述（demo 对应位置）

**Q1：主进程/渲染进程怎么分工？为什么多进程？** → `main.ts` 开头 + `createWindow`
> "主进程是 Node 环境，负责窗口生命周期和系统 API；渲染进程是 Chromium，负责页面。一个应用只有一个主进程、多个渲染进程。多进程有三个动机：一是隔离，单个页面崩溃不影响其他窗口；二是安全，渲染进程权限最小化、可以沙箱，页面被攻破也拿不到系统能力；三是稳定，主进程职责最小，是最后防线。这个模型和浏览器一致。"

**Q2：ready / window-all-closed / activate 的时机？macOS 差异？** → `main.ts` 三处事件
> "ready 是应用初始化完成的时机，窗口必须等它之后创建。window-all-closed 是所有窗口关闭后触发。activate 是 macOS 专属，点 Dock 图标或切回应用时触发。平台差异的核心：macOS 上关掉所有窗口应用不退出，所以要在 window-all-closed 里判断 platform 决定是否 quit，并在 activate 里重建窗口；Windows/Linux 是关完窗口直接退出。"

**Q3：渲染进程崩溃怎么办？** → `main.ts` 的 `render-process-gone`
> "用 webContents 的 render-process-gone 事件监听，details.reason 能区分崩溃原因（crash / oom / killed 等）。恢复是重新加载页面，渲染进程会重新拉起。要注意两点：第一，崩溃的是渲染进程可以恢复，主进程崩溃应用就没了，所以主进程代码要最小化；第二，回调是异步的，执行时窗口可能已被关闭，操作窗口前必须先查 `isDestroyed()`，否则会抛 'Object has been destroyed'——这是 Electron 里经典的防御性编程考点。"

**追问：为什么崩溃后还要判断 `!win.isDestroyed()`？** → `main.ts` 对应注释
> "崩溃 ≠ 销毁。崩溃的是页面进程，窗口（BrowserWindow 壳）可能还活着；reload() 作用在窗口上，前提是窗口还在。回调是异步的，窗口可能在这期间被关闭，所以要先确认窗口存活。类比前端操作 DOM 前的 el.isConnected 检查。"

## 崩溃排查四步法

| 步骤 | 手段 | 结论 |
| --- | --- | --- |
| ① 事件拿现场 | `render-process-gone` 的 `details.reason` + `child-process-gone`（覆盖所有子进程） | 判断崩溃类型：oom/killed 查内存，crashed 查 native 层 |
| ② 日志看过程 | `--enable-logging`、监听 `console-message` | 拿到崩溃前最后一条 JS 错误 |
| ③ 崩溃转储看死因 | `crashReporter.start()` + minidump + `minidump_stackwalk` | 定位到原生栈具体函数 |
| ④ 排除法复现 | `--disable-gpu` 测 GPU、二分注释代码 | 缩小到具体模块/操作 |

reason 值速查：`clean-exit` 正常退出（非崩溃）；`abnormal-exit` 非零退出码；`killed` 被系统/主进程杀（查内存 OOM killer）；`crashed` 信号崩溃（查 native 层）；`oom` Chromium 内存耗尽；`launch-failed` 启动失败；`integrity-failure` 完整性校验失败。

自查表述：
> "崩溃排查四步：先看 reason 分类型——oom/killed 查内存、crashed 查 native 层，配合 child-process-gone 确认是不是 GPU 进程；再开 --enable-logging 并转发渲染进程 console，拿崩溃前最后一条错误；然后 crashReporter 收集 minidump，用 stackwalk 定位原生栈；最后稳定复现后用二分法缩小范围。生产环境把崩溃上报接 Sentry 聚合。"

## 坑清单（自查易错点）

- ❌ 在 `ready` 之前调用 `BrowserWindow` 相关 API（部分可用但行为不可靠，标准姿势是 `whenReady().then`）
- ❌ 把 `activate` 理解成「窗口激活」——它是 **app 级**、macOS 专属事件，窗口焦点是 `browser-window-focus`
- ❌ 渲染进程里 `require('fs')`——nodeIntegration 关闭时直接报错，正确姿势是走 preload + IPC
- ❌ 以为渲染进程崩溃会自动恢复——必须自己监听并重建
- ⚠️ 异步回调（render-process-gone、IPC 等）里操作窗口对象前**不查 `isDestroyed()`**——窗口可能已关闭，直接抛 "Object has been destroyed"
- ⚠️ 用旧版 `crashed` 事件——已被 `render-process-gone` 取代

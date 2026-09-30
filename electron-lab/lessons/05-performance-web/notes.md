# Lesson 05 · 性能优化与 Web 差异

> 自查表述速记。demo 对应位置：`src/main.ts`（先建后显 + getAppMetrics）、`src/renderer/`（file:// 实测）。

## 一句话结论

**内存高的根因是「每个窗口一个完整 Chromium 渲染进程 + Node 主进程 + GPU 进程」，多窗口线性叠加；启动优化最有效的一招是 show: false + ready-to-show；渲染进程是「半浏览器」——本地资源无跨域、fetch/ES module 受 file:// 限制，系统能力必须走 preload + IPC。**

## 为什么 Electron 内存高（Q8 ①）

| 构成 | 说明 |
| --- | --- |
| 渲染进程 × N | 每个窗口一个完整 Chromium 渲染进程（≈ 一个浏览器标签页的内存） |
| 主进程 | Node 运行时 + Electron 核心 |
| GPU / utility | 合成、媒体等辅助进程 |
| 叠加效应 | 多窗口内存线性增长（demo ① 用 getAppMetrics 实测） |

对照 Tauri：系统 WebView 进程共享，无独立 Chromium，所以低一个数量级。

## 启动优化（Q8 ②）

| 优化项 | 做法 | 收益 |
| --- | --- | --- |
| **先建后显** | `show: false` + `ready-to-show` 再 `show()` | 无白屏，感知启动最快（demo 已用） |
| 窗口懒加载 | 不启动建全部窗口，按需创建 | 少建一个窗口省一整套渲染进程 |
| 主进程轻启动 | 启动阶段避免重 IO / 同步大任务 | 更快到 ready |
| 渲染层瘦身 | bundle 瘦身、路由懒加载、首屏最小化 | 更快 did-finish-load |
| 后台节流 | 隐藏窗口 backgroundThrottling、定时器清理 | 降低后台占用（呼应内存泄漏） |
| 单实例 | `requestSingleInstanceLock` | 防多开重复消耗 |

## file:// 与 Web 差异（Q9）

| 能力 | file:// 下表现 | 原因/对策 |
| --- | --- | --- |
| 跨域 | **本地资源间无 CORS**（img/script/css 可加载本地文件） | 同源策略主要约束远程 http(s) 源 |
| `fetch('file://…')` | ❌ 被拒 | fetch 协议白名单不含 file；读文件走 preload + Node fs |
| `<script type="module">` / `import()` | ❌ CORS 拦截 | module 跨 file 源被 Chrome 拦 → 渲染层必须打包器（vite/webpack） |
| Service Worker | ❌ 无法注册 | 需 https / localhost |
| localStorage | ✅ 可用（按 file 隔离） | — |
| 远程内容 | ⚠️ CORS 仍生效 | `webSecurity` 默认开着，别为省事关掉 |

一句话：**渲染进程能直接用的只有本地静态资源；一切系统能力（fs、网络、剪贴板…）走 preload 白名单 + IPC。**

## 自查题 + 参考表述（demo 对应位置）

**Q8：为什么内存高？启动怎么优化？** → `main.ts` + 渲染层实验台
> "内存高是因为每个窗口都是一个完整 Chromium 渲染进程，加 Node 主进程和 GPU 进程，多窗口线性叠加。启动优化最有效的是 show: false 加 ready-to-show 先建后显，避免白屏；再配合窗口懒加载、主进程轻启动、渲染层瘦身、隐藏窗口节流和单实例锁。"

**Q9：为什么没跨域？file:// 限制？为什么不能直接 import module？** → 渲染层实验台四个按钮
> "渲染进程加载的是本地 file:// 资源，同源策略主要约束远程源，所以本地资源加载无跨域。但 file:// 下 fetch 被拒、ES module 被 CORS 拦，Service Worker 也注册不了，所以渲染层必须用打包器，系统能力全走 preload 加 IPC。加载远程内容时 CORS 仍然生效，webSecurity 不能关。"

## 坑清单（自查易错点）

- ❌ 为了省事关 `webSecurity`——远程内容注入直接放大攻击面
- ❌ 渲染层直接 `import` 本地模块不打包——file:// 下必然 CORS 报错
- ❌ 启动时同步读大文件 / 大 IO——卡在 ready 之前
- ❌ 隐藏窗口还跑重定时器 / 动画——内存与 CPU 后台持续占用
- ❌ 忽略多窗口叠加——每开一个窗口就是整套渲染进程的成本

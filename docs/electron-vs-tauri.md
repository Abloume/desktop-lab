# Electron vs Tauri：核心差异对比

> 面向前端工程师的速查表。两个框架都在回答「如何用 Web 技术写桌面应用」，但底层选择完全不同，导致体积、性能、安全模型、开发体验全线分叉。

## 一句话概括

- **Electron** = Chromium + Node.js 整体打包进应用。你的前端代码跑在一个「完整浏览器」里，主进程还能用 Node 的全部能力。
- **Tauri** = 用系统自带的 WebView 渲染前端，Rust 进程做后端。前端代码跑在系统浏览器引擎里，跨平台能力通过 Rust 侧暴露给前端。

## 总览对比

| 维度 | Electron | Tauri（v2） |
| --- | --- | --- |
| 后端语言 | JavaScript / TypeScript（Node.js） | Rust |
| 渲染引擎 | 打包的 Chromium（版本固定，约 100–200MB） | 系统 WebView（macOS WKWebView / Windows WebView2 / Linux WebKitGTK） |
| 安装包体积 | 80–200MB+（Chromium 大头） | 3–10MB（前端资源为主） |
| 运行时内存 | 高（每个窗口一个渲染进程 + Node） | 低（共享系统 WebView 进程） |
| 前端技术栈 | 任意 Web 技术（React/Vue/Svelte/原生） | 任意 Web 技术（官方模板用 Vite + TS） |
| IPC | 主进程 ⇄ 渲染进程，事件驱动（ipcMain/ipcRenderer） | 前端 invoke Rust Command，类型经 Tauri 生成 |
| 安全模型 | contextIsolation / sandbox / CSP 需手动配置 | Capabilities 权限白名单，默认较严 |
| 生态成熟度 | 极成熟（2013 至今，VS Code/Slack/Discord） | 快速成长中（2022 起，1.0 → 2.x） |
| 学习曲线 | 低（纯 JS/TS，Node 能力直接可用） | 中（需学 Rust 基础 + Tauri 概念） |
| 跨平台 | Win / macOS / Linux（打包的 Chromium 保证一致） | 同三平台，但 WebView 行为随系统版本有差异 |
| 移动端支持 | 无官方支持（社区方案不成熟） | Tauri v2 官方支持 iOS / Android（实验性到稳定中） |
| 自动更新 | electron-updater 等成熟方案 | tauri-plugin-updater（2.x 稳定） |
| 系统能力接入 | Node 生态直接可用（fs/net/child_process…） | 通过 Rust crate + 插件系统（插件生态在补齐） |

## 进程 / 线程模型

```
Electron                          Tauri
┌──────────────────────┐         ┌──────────────────────┐
│ 主进程 Main（Node）   │         │ 核心进程（Rust）       │
│  - 窗口生命周期       │         │  - 窗口生命周期        │
│  - 系统能力（菜单/托盘）│         │  - Command（被前端调用）│
│  - 直接访问 fs/net   │         │  - fs/网络等 Rust crate │
│        │ IPC               │         │        │ invoke        │
│        ▼                    │         │        ▼             │
│ Preload（contextBridge）   │         │  （无 preload 概念， │
│        │                    │         │   Tauri 自动做桥接）  │
│        ▼                    │         │        │             │
│ 渲染进程 × N（Chromium）    │         │        ▼             │
│  - 一个标签页 = 一个进程    │         │ WebView（系统引擎）   │
└──────────────────────┘         └──────────────────────┘
```

要点：
- Electron 里「前端」和「Node 后端」是两套运行时；Tauri 里「前端」和「Rust 后端」也是两套，但 Tauri 把桥接做成了类型安全的 `invoke`。
- Electron 的 preload 是安全边界的关键角色（contextBridge 只暴露白名单 API）；Tauri 的等价物是 Capabilities 配置，权限在 `tauri.conf.json` / capability 文件里声明。

## IPC 对照

### Electron（事件驱动）

```ts
// 主进程 main.ts
ipcMain.handle('read-file', async (_e, path: string) => fs.readFile(path, 'utf-8'))

// preload.ts —— 安全边界：只暴露白名单方法
contextBridge.exposeInMainWorld('api', {
  readFile: (p: string) => ipcRenderer.invoke('read-file', p),
})

// renderer —— 通过 window.api 调用
const content = await window.api.readFile('/tmp/a.txt')
```

### Tauri（invoke Command，类型安全）

```rust
// src-tauri/src/lib.rs —— Rust 侧定义 Command
#[tauri::command]
fn read_file(path: String) -> Result<String, String> {
    std::fs::read_to_string(&path).map_err(|e| e.to_string())
}
// 注册：tauri::Builder::default().invoke_handler(tauri::generate_handler![read_file])
```

```ts
// 前端 —— 直接 invoke（路径由 Tauri 生成，类型可从 Rust 推导）
import { invoke } from '@tauri-apps/api/core'
const content = await invoke<string>('read_file', { path: '/tmp/a.txt' })
```

差异小结：
- Electron：字符串通道名 + 手动在 preload 里做白名单，安全靠自觉。
- Tauri：Command 名和参数经 Rust 宏 + 前端生成代码串联，类型不匹配编译期/运行时就报错；权限靠 Capabilities 声明。

## 安全模型对照

| 安全项 | Electron | Tauri |
| --- | --- | --- |
| 渲染层隔离 | contextIsolation: true（必开） | 内置，无 JS 层面暴露面 |
| 沙箱 | sandbox: true + 关 nodeIntegration | 前端天然无 Node 能力 |
| 能力白名单 | 手写 preload 逐方法暴露 | Capabilities JSON 声明 |
| CSP | 需自行配置 | 模板默认带 CSP |
| 已知风险点 | 远程内容 + 开着 nodeIntegration = RCE | 滥用 shell / fs 插件 = 越权 |

## 体积与性能实测口径

- 空应用安装包：Electron 一般 80MB 起步；Tauri 通常 < 10MB（主要看前端资源）。
- 内存占用：Electron 一个空窗口约 100–200MB；Tauri 空窗口通常 30–60MB，且多个窗口共享 WebView 进程。
- 首屏启动：Tauri 通常更快（无需拉起完整 Chromium）；但受系统 WebView 版本影响，macOS 与 Windows 表现不同。
- 注意：以上为经验值，随版本浮动，结论应以自己机器实测为准（roadmap 阶段 2 有对比实验项）。

## 选型速查

| 场景 | 推荐 | 理由 |
| --- | --- | --- |
| 快速交付、团队只会 JS/TS | Electron | 零新语言成本，生态全 |
| 对安装包体积 / 内存敏感 | Tauri | 体积小一个数量级 |
| 需要深度系统集成（驱动、底层设备） | Tauri | Rust 直连系统层 |
| 需要 Chromium 级渲染一致性 | Electron | WebView 兼容性坑更少 |
| 个人工具、学习 Rust | Tauri | 顺带学系统级语言 |
| 需要 iOS/Android 复用的跨端 | Tauri v2 | 官方移动端支持 |

## 官方文档

- Electron: https://www.electronjs.org/docs/latest/
- Tauri v2: https://v2.tauri.app/
- Rust 入门（官方书）: https://doc.rust-lang.org/book/

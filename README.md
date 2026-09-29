# desktop-lab

桌面端应用学习仓库：**Electron** 与 **Tauri** 双轨对比学习。

> 背景：前端工程师（TS / React / Node），已有 Electron 实战经验，正在系统化重建桌面端知识体系并向 Rust/Tauri 拓展。Electron 与 Tauri 双轨对照，同一套心智模型两边印证，学习效率最高。

## 仓库结构

```
desktop-lab/
├── README.md              # 本文件：仓库说明
├── docs/
│   ├── learning-roadmap.md   # 学习路线（阶段拆解）
│   ├── electron-vs-tauri.md  # Electron vs Tauri 核心差异对比
│   ├── skill-check.md        # 能力自测清单（含「题目⇄练习」绑定约定）
│   └── TODO.md               # 待办（Rust 工具链安装）
├── electron-lab/          # Electron 学习项目（TS）
│   ├── src/               # 基础示例：主进程 / preload / 渲染进程
│   └── lessons/           # 主题课：每个主题 = demo + notes.md
│       └── 01-process-lifecycle/
└── tauri-lab/             # Tauri 学习项目（前端 + Rust）
    ├── src/               # 前端（WebView 侧）
    └── src-tauri/         # Rust 后端（Tauri 侧）
```

## 主题课（lessons）约定

每个主题一个目录，绑定三件套：**可运行 demo + `notes.md`（自查题/参考表述/坑）+ 一个 commit**。

```bash
cd electron-lab
npm run lesson:01   # 进程模型与生命周期：看终端 [lifecycle]/[crash] 日志 + 操作窗口
```

笔记与代码一一对应：`notes.md` 里每道自查题都标注了 demo 里的代码位置。

## 当前状态

| 项目 | 语言栈 | 状态 |
| --- | --- | --- |
| `electron-lab` | TypeScript / Node | 基础示例可运行；主题课 lessons/01（进程模型与生命周期）已完成 |
| `tauri-lab` | TS 前端 + Rust 后端 | 骨架已就绪，待安装 Rust 工具链后运行（见 docs/TODO.md） |

## 快速开始

### electron-lab

```bash
cd electron-lab
npm install
npm run dev   # 启动开发模式
```

### tauri-lab

```bash
# 前置：安装 Rust 工具链（https://rustup.rs）
cd tauri-lab
npm install
npm run tauri dev   # 首次构建需编译 Rust 依赖，较慢
```

## 学习主线（详见 docs/learning-roadmap.md）

1. **能力盘点**：学习自测清单，定位薄弱主题
2. **主题式重建**：每个薄弱主题 = demo + 自查表述（进程/IPC/安全/打包/性能）
3. **Tauri 双轨对比**：同一功能两边实现，实测对比，补 Rust 基础
4. **自查演练**：高频问题 + 手写题 + 项目深挖 STAR 表述

## Git 约定

- 默认分支：`main`
- 不自动 commit、不自动 push；只有明确指示「提交并推送」时才执行 git 操作

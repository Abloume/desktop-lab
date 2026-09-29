/**
 * 主进程（Main Process）入口
 *
 * Electron 的进程模型：
 * - 主进程：唯一，负责窗口生命周期、系统能力（菜单/托盘/通知）、Node 全套能力（fs/net/child_process）
 * - 渲染进程：每个窗口一个，跑的是浏览器环境（Chromium），没有 Node 能力
 * - 主进程与渲染进程之间通过 IPC 通信（见 preload 里的 contextBridge）
 */
import { app, BrowserWindow } from 'electron'
import path from 'node:path'

function createWindow(): void {
  const win = new BrowserWindow({
    width: 900,
    height: 600,
    title: 'electron-lab',
    webPreferences: {
      // 安全三件套（必开）：
      // 1. contextIsolation: true —— 渲染进程的 JS 上下文与 preload 隔离
      // 2. nodeIntegration: false —— 渲染进程禁用 Node
      // 3. sandbox: true —— 渲染进程跑在沙箱里
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  // 加载渲染进程页面（本地文件）
  win.loadFile(path.join(__dirname, '../renderer/index.html'))
}

// app 就绪后再创建窗口（macOS 上 app 的 ready 时机与 window-all-closed 行为都特殊）
app.whenReady().then(() => {
  createWindow()

  // macOS 习惯：点击 Dock 图标且无窗口时，重新创建窗口
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// 非 macOS 平台：所有窗口关闭即退出应用
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

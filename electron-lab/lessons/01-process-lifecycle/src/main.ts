/**
 * Lesson 01 · 进程模型与生命周期
 *
 * 自查题（本 demo 对应验证）：
 *  Q1 主进程/渲染进程怎么分工？为什么 Electron 要多进程？
 *  Q2 ready / window-all-closed / activate / will-quit 各在什么时机触发？
 *  Q3 渲染进程崩溃了怎么处理？
 *
 * 跑法：在 electron-lab 目录执行  npm run lesson:01
 * 看窗口：页面显示进程类型/版本，按钮可「打开新窗口」「模拟崩溃」
 * 看日志：终端里带 [lifecycle] / [crash] 前缀的输出 = 生命周期事件与崩溃处理
 */
import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'node:path'

// Q1：主进程是 Node 环境，process.type === 'browser'，是应用唯一的"总控"
console.log(`[main] 主进程启动 type=${process.type} pid=${process.pid}`)

function logLifecycle(name: string, detail = ''): void {
  console.log(`[lifecycle] ${new Date().toISOString()} ${name}${detail ? ' — ' + detail : ''}`)
}

// 跟踪所有窗口，用于崩溃重建与关闭清理
const windows = new Set<BrowserWindow>()

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 900,
    height: 620,
    title: 'lesson-01 进程模型与生命周期',
    webPreferences: {
      // 安全三件套（与 hello world 保持一致）
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  win.loadFile(path.join(__dirname, 'renderer/index.html'))
  windows.add(win)
  win.on('closed', () => windows.delete(win))

  // Q3：监听渲染进程崩溃。render-process-gone 是官方推荐的事件
  //（旧版 crashed 事件已废弃），details 里带崩溃原因 reason 与退出码
  win.webContents.on('render-process-gone', (_event, details) => {
    const fromWindow = win.id
    console.log(
      `[crash] 渲染进程崩溃 window=${fromWindow} reason=${details.reason} exitCode=${details.exitCode}`,
    )
    // 崩溃 ≠ 销毁：崩的是「页面进程」，窗口（BrowserWindow 壳）可能还活着；
    // 重建动作 reload() 作用在窗口上，所以前提是窗口还在。
    // 回调是异步的，真正执行时窗口可能已被用户关闭 → 对已销毁对象调用
    // 方法会抛 Electron 经典错误 "Object has been destroyed"。
    // 所以任何异步回调里操作窗口对象前，先查 isDestroyed()，
    // 类比前端 DOM 的操作前检查 el.isConnected。
    if (!win.isDestroyed()) {
      logLifecycle('auto-recreate', `为窗口 ${fromWindow} 重建渲染进程`)
      win.reload()
    }
  })

  return win
}

// Q2：ready —— 应用初始化完成的唯一时机，窗口必须等它之后再创建
app.whenReady().then(() => {
  logLifecycle('ready')
  createWindow()

  // Q2：activate —— macOS 专属：点击 Dock 图标/切换回应用时触发。
  // 标准姿势：没有窗口就重建（配合 window-all-closed 里 macOS 不退出的设定）
  app.on('activate', () => {
    logLifecycle('activate', 'macOS 应用激活（点击 Dock / 切换前台）')
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Q2：window-all-closed —— 所有窗口都关闭后触发。
// macOS 习惯是"关窗不退出"，其余平台直接退出
app.on('window-all-closed', () => {
  logLifecycle('window-all-closed', `剩余窗口=${BrowserWindow.getAllWindows().length}`)
  if (process.platform !== 'darwin') app.quit()
})

// Q2：退出链路 before-quit → will-quit → quit
app.on('before-quit', () => logLifecycle('before-quit', '准备退出（可在此拦截）'))
app.on('will-quit', () => logLifecycle('will-quit', '即将退出（清理资源的最后时机）'))
app.on('quit', () => logLifecycle('quit', '已退出'))

// ---- IPC：渲染进程的白名单请求 ----
ipcMain.on('open-new-window', () => {
  logLifecycle('new-window', '通过 IPC 打开第二个渲染进程')
  createWindow()
})

ipcMain.on('crash-current-window', (event) => {
  // 强制崩溃当前窗口的渲染进程（仅演示用），触发上面的 render-process-gone
  const win = BrowserWindow.fromWebContents(event.sender)
  console.log(`[crash] 手动触发渲染进程崩溃 window=${win?.id}`)
  event.sender.forcefullyCrashRenderer()
})

/**
 * Lesson 03 · 窗口管理
 *
 * 自查题（本 demo 对应验证）：
 *  Q6 无边框窗口怎么实现拖拽？多窗口之间怎么通信？父子窗口是什么场景用？
 *
 * 跑法：在 electron-lab 目录执行  npm run lesson:03
 * 三个演示区：
 *  ① 无边框窗口（frame: false + CSS -webkit-app-region: drag 拖拽）
 *  ② 父子窗口（parent / modal：子随父最小化关闭、模态锁定父窗口）
 *  ③ 多窗口通信（主进程转发方式：广播给其他所有窗口）
 */
import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'node:path'

const windows = new Set<BrowserWindow>()

interface WindowOptions {
  frame?: boolean
  parent?: BrowserWindow | null
  modal?: boolean
  title?: string
}

function createWindow(opts: WindowOptions = {}): BrowserWindow {
  const win = new BrowserWindow({
    width: opts.frame === false ? 520 : 980,
    height: opts.frame === false ? 380 : 760,
    title: opts.title ?? 'lesson-03 窗口管理',
    // Q6：frame: false = 无边框窗口（去掉系统标题栏/边框）
    frame: opts.frame ?? true,
    // Q6：parent —— 子窗口随父窗口最小化/关闭，永远浮在父窗口之上
    parent: opts.parent ?? undefined,
    // Q6：modal: true —— 模态子窗口，父窗口被锁定不可交互
    modal: opts.modal ?? false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  // 无边框窗口用专用页面（带自定义标题栏）
  if (opts.frame === false) {
    win.loadFile(path.join(__dirname, 'renderer/frameless.html'))
  } else {
    win.loadFile(path.join(__dirname, 'renderer/index.html'))
  }

  windows.add(win)
  win.on('closed', () => windows.delete(win))
  return win
}

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// ─────────────────────────────────────────────
// ① 无边框窗口：自定义标题栏按钮（无系统按钮，需自实现）
// ─────────────────────────────────────────────
ipcMain.on('win-close', (event) => BrowserWindow.fromWebContents(event.sender)?.close())
ipcMain.on('win-minimize', (event) => BrowserWindow.fromWebContents(event.sender)?.minimize())

ipcMain.on('open-frameless', () => {
  createWindow({ frame: false, title: '无边框窗口（自定义标题栏拖拽）' })
})

// ─────────────────────────────────────────────
// ② 父子窗口：parent / modal 演示
// ─────────────────────────────────────────────
ipcMain.on('open-child', (event) => {
  const parent = BrowserWindow.fromWebContents(event.sender)
  if (!parent) return
  // parent 子窗口：随父最小化/关闭，浮在父之上
  createWindow({ parent, title: '子窗口（parent，随父窗口联动）' })
})

ipcMain.on('open-modal', (event) => {
  const parent = BrowserWindow.fromWebContents(event.sender)
  if (!parent) return
  // 模态子窗口：父窗口被锁定，必须先关闭它才能回到父窗口
  createWindow({ parent, modal: true, title: '模态子窗口（modal，锁定父窗口）' })
})

// ─────────────────────────────────────────────
// ③ 多窗口通信：主进程转发（最常用方式）
// 窗口 A 发消息 → 主进程 → 转发给其他所有窗口
// ─────────────────────────────────────────────
ipcMain.on('broadcast', (event, msg: unknown) => {
  if (typeof msg !== 'string') return
  const from = BrowserWindow.fromWebContents(event.sender)
  console.log(`[window] 广播来自窗口 ${from?.id}：${msg}`)
  for (const w of windows) {
    if (w !== from && !w.isDestroyed()) {
      w.webContents.send('broadcast-msg', { from: from?.id ?? '?', msg })
    }
  }
})

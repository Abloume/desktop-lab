/**
 * Lesson 02 · IPC 与安全模型
 *
 * 自查题（本 demo 对应验证）：
 *  Q3 主进程 ⇄ 渲染进程有哪几种通信方式？各自适用场景？
 *  Q4 preload 存在的意义？为什么不直接开 nodeIntegration？暴露 API 的正确姿势？
 *  Q5 contextIsolation / sandbox / CSP 分别防什么？remote 模块为什么被移除？
 *
 * 跑法：在 electron-lab 目录执行  npm run lesson:02
 * 窗口布局：① 安全边界演示  ② invoke 请求-响应  ③ send 单向 + 主进程推送  ④ MessagePort 渲染进程直连
 */
import { app, BrowserWindow, ipcMain, MessageChannelMain } from 'electron'
import path from 'node:path'

const windows = new Set<BrowserWindow>()

// Q5：安全三件套 + CSP（CSP 在 renderer/index.html 的 meta 里）
// 这是 Electron 推荐的最小安全基线：nodeIntegration 关 / contextIsolation 开 / sandbox 开
function createWindow(title = 'lesson-02 IPC 与安全模型'): BrowserWindow {
  const win = new BrowserWindow({
    width: 980,
    height: 760,
    title,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, // Q5：页面 JS 世界与 preload JS 世界隔离
      nodeIntegration: false, // Q5：渲染进程禁用 Node（防 RCE）
      sandbox: true,          // Q5：渲染进程进程级沙箱（防系统调用）
    },
  })
  win.loadFile(path.join(__dirname, 'renderer/index.html'))
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
// IPC 方式一：handle / invoke —— 请求-响应（最常用）
// Q3：invoke 是 promise 化的 RPC；参数经结构化克隆序列化。
// 安全注意：渲染进程来的输入一律不可信，必须校验（本题演示）
// ─────────────────────────────────────────────
ipcMain.handle('echo', (_event, text: unknown) => {
  if (typeof text !== 'string' || text.trim() === '') {
    return { ok: false, error: '参数必须是非空字符串' } // 参数校验
  }
  return { ok: true, data: `主进程收到：${text}（长度 ${text.length}）` }
})

// ─────────────────────────────────────────────
// IPC 方式二：send / on —— 单向 fire-and-forget
// Q3：适合通知类场景；渲染进程发完即走，不等待返回。
// ─────────────────────────────────────────────
ipcMain.on('ping', (event) => {
  const from = BrowserWindow.fromWebContents(event.sender)?.id
  console.log(`[ipc] 收到单向消息 ping，来自窗口 ${from}`)
})

// 主进程主动推送演示：定时向窗口推时间戳
// 注意清理定时器 —— 这是内存泄漏高频坑（呼应 Lesson 01 崩溃排查四步法）
const tickTimers = new Map<number, NodeJS.Timeout>()

function stopTick(wcId: number): void {
  const t = tickTimers.get(wcId)
  if (t) {
    clearInterval(t)
    tickTimers.delete(wcId)
  }
}

ipcMain.on('toggle-tick', (event) => {
  const wc = event.sender
  if (tickTimers.has(wc.id)) {
    stopTick(wc.id)
    wc.send('tick-state', '已停止')
    return
  }
  wc.send('tick-state', '已启动')
  tickTimers.set(
    wc.id,
    setInterval(() => {
      // Lesson 01 学过的防御点：异步回调里操作对象前先查 isDestroyed
      if (wc.isDestroyed()) {
        stopTick(wc.id)
        return
      }
      wc.send('tick', new Date().toLocaleTimeString())
    }, 1000),
  )
})

// ─────────────────────────────────────────────
// IPC 方式三：MessagePort —— 渲染进程间直连
// Q3：MessageChannelMain 建立通道，把 port 分发给两个窗口；
//     之后两个渲染进程直接通信，不再经过主进程转发。
// ─────────────────────────────────────────────
ipcMain.on('open-peer', (event) => {
  const from = BrowserWindow.fromWebContents(event.sender)
  if (!from) return
  if (windows.size < 2) createWindow('lesson-02 · 对等窗口 B')
  const other = [...windows].find((w) => w !== from)
  if (!other) return

  const { port1, port2 } = new MessageChannelMain()
  // postMessage 的第三个参数把 MessagePort 转移给目标渲染进程
  from.webContents.postMessage('peer-port', null, [port1])
  other.webContents.postMessage('peer-port', null, [port2])
  console.log('[ipc] 已建立渲染进程间直连通道（A ⇄ B，不经主进程转发）')
})

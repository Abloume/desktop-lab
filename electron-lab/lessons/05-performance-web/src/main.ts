/**
 * Lesson 05 · 性能优化与 Web 差异
 *
 * 自查题（本 demo 对应验证）：
 *  Q8 为什么 Electron 内存高？启动怎么优化？
 *  Q9 渲染进程为什么没有跨域问题？file:// 协议有什么限制？为什么不能直接 import ES module？
 *
 * 两个演示区：
 *  ① 内存构成实测：app.getAppMetrics() 实时展示各进程内存（Q8 的证据）
 *  ② file:// 能力实测：fetch / import / script / localStorage 逐个实验（Q9 的证据）
 */
import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'node:path'

// Q8 启动优化点①：show: false 先建窗口，渲染完成（ready-to-show）再显示，
// 用户看到的是「直接可用」而不是白屏 —— 启动感知优化的最大头
function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 980,
    height: 840,
    title: 'lesson-05 性能优化与 Web 差异',
    show: false, // Q8：先隐藏，避免白屏闪烁
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })
  win.loadFile(path.join(__dirname, 'renderer/index.html'))
  // Q8：渲染完成后再显示
  win.once('ready-to-show', () => win.show())
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

// Q8：内存构成实测 —— getAppMetrics 返回所有进程（主/渲染/GPU/utility）
// 注意：workingSetSize 单位是 KB
ipcMain.handle('get-metrics', () => {
  return app.getAppMetrics().map((m) => ({
    type: m.type,
    pid: m.pid,
    memoryKB: m.memory.workingSetSize,
    cpuPercent: Math.round(m.cpu.percentCPUUsage * 100) / 100,
  }))
})

// ── 其他启动优化要点（知识卡，见 renderer）──
// - 窗口懒加载：不要启动时建全部窗口，按需创建
// - 主进程启动阶段避免重 IO / 同步大任务
// - 渲染层：bundle 瘦身、路由懒加载、首屏只渲染必要
// - 隐藏窗口 backgroundThrottling、定时器清理（呼应 Lesson 01 内存排查）
// - 单实例锁（requestSingleInstanceLock）防多开重复消耗

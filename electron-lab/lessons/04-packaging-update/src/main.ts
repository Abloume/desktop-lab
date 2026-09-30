/**
 * Lesson 04 · 打包分发与自动更新
 *
 * 自查题（本 demo 对应验证）：
 *  Q7 asar 是什么？electron-builder / forge 区别？签名/公证流程？自动更新怎么做？
 *
 * 注意：打包/签名/公证是「构建期+发布期」动作，开发态能演示的是：
 *  ① 打包后环境差异（app.isPackaged / app.asar 路径）
 *  ② asar 内资源读取（Electron 透明映射，代码无感）
 *  ③ 自动更新接入骨架（electron-updater / autoUpdater）
 *  ④ 配置资产 electron-builder.yml（见本 lesson 根目录）
 */
import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'node:path'
import fs from 'node:fs'

// Q7：打包后环境差异
// 开发态：__dirname 指向 dist 源码目录；打包后：形如 .../resources/app.asar/dist
// 也就是说打包后代码运行在 asar 归档「里面」，但 Electron 透明映射，路径写法不变
console.log('[pack] isPackaged =', app.isPackaged)
console.log('[pack] __dirname =', __dirname)

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 980,
    height: 800,
    title: 'lesson-04 打包分发与自动更新',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })
  win.loadFile(path.join(__dirname, 'renderer/index.html'))
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

// 打包环境信息（渲染进程展示）
ipcMain.handle('get-pack-info', () => ({
  isPackaged: app.isPackaged,
  version: app.getVersion(),
  platform: process.platform,
  arch: process.arch,
  appPath: app.getAppPath(),
  userData: app.getPath('userData'),
  asarVisible: app.isPackaged ? '路径中包含 app.asar（归档内读取）' : '开发态：直接读源码目录',
}))

// Q7：asar 内资源读取演示。
// 打包后 Electron 把 fs / path 对 app.asar 的访问透明映射到归档内，
// 因此 fs.readFileSync 的写法在开发态与打包态完全一致（无需判断 isPackaged）
ipcMain.handle('read-demo-file', () => {
  const p = path.join(__dirname, 'renderer', 'data.json')
  try {
    return { ok: true, content: fs.readFileSync(p, 'utf-8').slice(0, 120) }
  } catch (e) {
    return { ok: false, error: String(e) }
  }
})

// ─────────────────────────────────────────────
// Q7：自动更新接入骨架（生产接入时取消注释并按需配置）
//
// 两条路线二选一：
//  A. 官方内置 autoUpdater（Electron 自带）+ 自建更新服务 / Squirrel
//  B. electron-updater（electron-builder 配套，支持差分更新）——更常用
//
// ⚠️ 前提：应用必须已签名（macOS 公证 / Windows 签名），未签名无法自动更新
// ─────────────────────────────────────────────
// import { autoUpdater } from 'electron-updater'
//
// autoUpdater.autoDownload = true
// autoUpdater.setFeedURL({ provider: 'generic', url: 'https://example.com/releases/' })
// autoUpdater.on('update-available', () => console.log('[update] 发现新版本'))
// autoUpdater.on('update-downloaded', () => autoUpdater.quitAndInstall())

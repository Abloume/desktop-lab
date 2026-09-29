/**
 * Lesson 03 · preload —— 窗口管理白名单
 *
 * 同前两课：只暴露封装方法，不交 ipcRenderer 本体。
 */
import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('desktop', {
  // ① 无边框窗口
  openFrameless: () => ipcRenderer.send('open-frameless'),
  closeMe: () => ipcRenderer.send('win-close'),
  minimizeMe: () => ipcRenderer.send('win-minimize'),

  // ② 父子窗口
  openChild: () => ipcRenderer.send('open-child'),
  openModal: () => ipcRenderer.send('open-modal'),

  // ③ 多窗口通信（主进程转发）
  broadcast: (msg: string) => ipcRenderer.send('broadcast', msg),
  onBroadcast: (cb: (payload: { from: number | string; msg: string }) => void) =>
    ipcRenderer.on('broadcast-msg', (_e, payload) => cb(payload)),
})

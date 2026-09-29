/**
 * Lesson 02 · preload —— 安全边界白名单
 *
 * 自查题 Q4：preload 存在的意义？为什么不直接开 nodeIntegration？暴露 API 的正确姿势？
 *
 * 正确姿势三原则：
 *  1. contextBridge.exposeInMainWorld 白名单注入
 *  2. 不暴露 ipcRenderer 本体，只暴露封装好的方法（渲染进程拿不到通道名，改不了参数）
 *  3. 暴露的事件回调也要封装（如 onTick），由 preload 决定数据流向
 */
import { contextBridge, ipcRenderer } from 'electron'

// 渲染进程间直连用的 MessagePort：由主进程 postMessage 分发过来
let peerPort: MessagePort | null = null
let peerCb: ((msg: string) => void) | null = null

ipcRenderer.on('peer-port', (event) => {
  peerPort = event.ports[0]
  peerPort.onmessage = (e) => peerCb?.(String(e.data))
  peerPort.start()
})

contextBridge.exposeInMainWorld('desktop', {
  // —— invoke：请求-响应（封装，不把 ipcRenderer 交出去）——
  echo: (text: string) => ipcRenderer.invoke('echo', text),

  // —— send：单向通知 ——
  ping: () => ipcRenderer.send('ping'),

  // —— 主进程推送：订阅事件也走白名单封装 ——
  toggleTick: () => ipcRenderer.send('toggle-tick'),
  onTick: (cb: (time: string) => void) => ipcRenderer.on('tick', (_e, t: string) => cb(t)),
  onTickState: (cb: (state: string) => void) => ipcRenderer.on('tick-state', (_e, s: string) => cb(s)),

  // —— MessagePort 直连（A ⇄ B）——
  openPeer: () => ipcRenderer.send('open-peer'),
  sendToPeer: (text: string) => peerPort?.postMessage(text),
  onPeerMessage: (cb: (msg: string) => void) => {
    peerCb = cb
  },
})

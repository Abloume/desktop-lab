/**
 * Lesson 01 · preload —— 安全边界的白名单
 *
 * 面试题：为什么不直接在渲染进程开 Node？preload 存在的意义？
 * 答案：渲染进程暴露面越少越安全。preload 运行在隔离的上下文里，
 *       用 contextBridge 只把「白名单方法」挂到 window 上，其余一律不暴露。
 */
import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('desktop', {
  // 渲染进程信息（preload 里能拿到 process，渲染页面拿不到）
  processType: process.type, // 'renderer'
  pid: process.pid,
  versions: {
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node,
  },
  // 白名单方法：只暴露两个动作，不给渲染进程任何自由 IPC 通道
  openNewWindow: () => ipcRenderer.send('open-new-window'),
  crashCurrentWindow: () => ipcRenderer.send('crash-current-window'),
})

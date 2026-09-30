/**
 * Lesson 05 · preload —— 性能数据白名单
 */
import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('desktop', {
  getMetrics: () => ipcRenderer.invoke('get-metrics'),
})

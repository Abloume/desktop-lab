/**
 * Lesson 04 · preload —— 打包信息白名单
 */
import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('desktop', {
  getPackInfo: () => ipcRenderer.invoke('get-pack-info'),
  readDemoFile: () => ipcRenderer.invoke('read-demo-file'),
})

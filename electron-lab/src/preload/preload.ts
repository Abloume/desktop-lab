/**
 * 预加载脚本（Preload）
 *
 * 安全边界的关键角色：
 * - 渲染进程没有 Node 能力，但它可以访问 preload 暴露的东西
 * - contextBridge 只把「白名单 API」挂到 window 上，其余一概不暴露
 * - 后续要加主进程能力（读文件、系统通知等），都在这里声明暴露面
 */
import { contextBridge } from 'electron'

contextBridge.exposeInMainWorld('desktop', {
  versions: {
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node,
  },
  platform: process.platform,
})

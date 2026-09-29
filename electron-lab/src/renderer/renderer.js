/**
 * 渲染进程脚本（Renderer）
 *
 * 运行在浏览器环境里：没有 require、没有 process，唯一的数据来源是
 * preload 通过 contextBridge 暴露到 window.desktop 的白名单 API。
 *
 * 说明：为保持最小依赖，本示例渲染层用原生 JS；后续阶段引入
 * React/Vue + 打包器时再替换，主进程与 preload 仍保持 TS。
 */
function $(id) {
  return document.getElementById(id)
}

// window.desktop 由 preload 注入（见 src/preload/preload.ts）
const versions = window.desktop.versions

$('ver-electron').textContent = versions.electron
$('ver-chrome').textContent = versions.chrome
$('ver-node').textContent = versions.node
$('ver-platform').textContent = window.desktop.platform

$('info').textContent =
  '主进程 / 渲染进程 / IPC 链路已打通：数据从 preload 安全地流到了渲染进程。'

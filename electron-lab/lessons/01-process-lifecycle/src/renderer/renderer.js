/**
 * Lesson 01 · 渲染进程脚本
 *
 * 与 hello world 的 renderer 同理：纯浏览器环境，数据全靠 window.desktop。
 * 这里演示「崩溃恢复」的交互：点模拟崩溃 → 主进程重建 → 页面刷新回来。
 */
function $(id) {
  return document.getElementById(id)
}

const api = window.desktop

$('proc-type').textContent = api.processType
$('proc-pid').textContent = api.pid
$('ver-electron').textContent = api.versions.electron
$('ver-chrome').textContent = api.versions.chrome
$('ver-node').textContent = api.versions.node

$('btn-open').addEventListener('click', () => api.openNewWindow())
$('btn-crash').addEventListener('click', () => api.crashCurrentWindow())

/**
 * Lesson 03 · 无边框窗口脚本
 *
 * 演示无边框窗口的两个关键点：
 *  1. 拖拽：CSS -webkit-app-region: drag（在 frameless.html 的 .titlebar 上）
 *  2. 自实现系统按钮：无边框窗口没有系统按钮，最小化/关闭要自己调主进程
 */
document.getElementById('btn-min').addEventListener('click', () => window.desktop.minimizeMe())
document.getElementById('btn-close').addEventListener('click', () => window.desktop.closeMe())

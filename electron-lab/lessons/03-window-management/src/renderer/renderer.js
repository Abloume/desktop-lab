/**
 * Lesson 03 · 主窗口渲染脚本
 */
function $(id) {
  return document.getElementById(id)
}

const api = window.desktop

// ① 无边框窗口
$('btn-frameless').addEventListener('click', () => api.openFrameless())

// ② 父子窗口
$('btn-child').addEventListener('click', () => api.openChild())
$('btn-modal').addEventListener('click', () => api.openModal())

// ③ 多窗口通信：主进程转发
api.onBroadcast(({ from, msg }) => {
  $('msg-output').textContent = `窗口 ${from} 说：${msg}`
})

$('btn-broadcast').addEventListener('click', () => {
  const text = $('msg-input').value.trim()
  if (!text) return
  api.broadcast(text)
  $('msg-output').textContent = `已广播：${text}`
})

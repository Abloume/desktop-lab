/**
 * Lesson 02 · 渲染进程脚本
 *
 * 注意：这里跑在浏览器环境（无 require / process / Node），
 * 所有能力都来自 window.desktop（preload 白名单）。
 */
function $(id) {
  return document.getElementById(id)
}

const api = window.desktop

// ① 安全边界自检
$('req').textContent = typeof window.require // 应为 undefined
$('proc').textContent = typeof process        // 应为 undefined
$('api-list').textContent = Object.keys(api).join(', ')

// ② invoke：请求-响应
$('btn-echo').addEventListener('click', async () => {
  const text = $('invoke-input').value
  const res = await api.echo(text)
  $('echo-output').textContent = res.ok
    ? `✅ ${res.data}`
    : `❌ ${res.error}（主进程参数校验拦截）`
})

// ③ send 单向
$('btn-ping').addEventListener('click', () => {
  api.ping()
  $('tick-output').textContent = '已发出单向消息，请看主进程终端 [ipc] 日志'
})

// ③ 主进程推送（订阅 + 清理演示）
api.onTick((time) => {
  $('tick-output').textContent = `主进程推送：${time}`
})
api.onTickState((state) => {
  $('tick-output').textContent += `\n[推送${state}]`
})
$('btn-tick').addEventListener('click', () => api.toggleTick())

// ④ MessagePort 直连
let connected = false
api.onPeerMessage((msg) => {
  connected = true
  $('peer-output').textContent = `收到窗口 B 的消息：${msg}`
})

$('btn-peer').addEventListener('click', () => {
  api.openPeer()
  $('peer-output').textContent = '连接建立中…（窗口 B 已打开，两边都可发消息）'
})

$('btn-send-peer').addEventListener('click', () => {
  const text = $('peer-input').value.trim()
  if (!text) return
  api.sendToPeer(text)
  $('peer-output').textContent = `已直连发送（不经主进程）：${text}`
})

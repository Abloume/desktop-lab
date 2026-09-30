/**
 * Lesson 04 · 渲染进程脚本
 */
function $(id) {
  return document.getElementById(id)
}

const api = window.desktop

// ① 打包环境信息
api.getPackInfo().then((info) => {
  $('pack-info').textContent = Object.entries(info)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n')
})

// ② asar 资源读取
$('btn-read').addEventListener('click', async () => {
  const res = await api.readDemoFile()
  $('read-output').textContent = res.ok
    ? `✅ 读取成功：${res.content}`
    : `❌ ${res.error}`
})

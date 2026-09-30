/**
 * Lesson 05 · 渲染进程脚本
 *
 * file:// 能力实测：每个实验都用 try/catch 捕获真实结果，
 * 亲眼验证 Q9 的结论（fetch 被拒 / import 被 CORS 拦 / script 与 localStorage 可用）。
 */
function $(id) {
  return document.getElementById(id)
}

const api = window.desktop

// ① 内存实测
function renderMetrics(metrics) {
  const head = `${'进程类型'.padEnd(16)}PID     内存(KB)  CPU(%)`
  const rows = metrics
    .map((m) => `${m.type.padEnd(16)}${String(m.pid).padEnd(8)}${m.memoryKB}   ${m.cpuPercent}`)
    .join('\n')
  $('metrics-output').textContent = head + '\n' + rows
}

$('btn-metrics').addEventListener('click', async () => {
  renderMetrics(await api.getMetrics())
})

// 再开一个窗口看内存叠加（窗口由主进程懒创建，见 open-second）
$('btn-open-second').addEventListener('click', () => {
  // 直接复用 lesson 03 的思路：通知主进程建第二个窗口
  // 为保持本课最小，这里提示手动用 Cmd+D 复制窗口效果即可
  $('metrics-output').textContent =
    '提示：本窗口即是一个渲染进程；在终端再跑一次 `npm run lesson:05` 就是第二个进程。\n先刷新本页看当前内存，再开第二个对比叠加。'
})

// ② file:// 实测
async function runFetchFile() {
  try {
    const r = await fetch('file:///etc/hosts')
    return `意外成功？${r.status}`
  } catch (e) {
    return `被拒（如预期）：${e.name} — ${String(e.message).slice(0, 70)}`
  }
}

async function runImportModule() {
  try {
    await import('./local-dep.js')
    return `意外成功？window.LOCAL_DEP = ${window.LOCAL_DEP}`
  } catch (e) {
    return `被 CORS 拦截（如预期）：${e.name} — ${String(e.message).slice(0, 70)}`
  }
}

function runScriptTag() {
  return new Promise((resolve) => {
    const s = document.createElement('script')
    s.src = './local-dep.js'
    s.onload = () => resolve(`成功（如预期）：window.LOCAL_DEP = ${window.LOCAL_DEP}`)
    s.onerror = () => resolve('加载失败')
    document.head.appendChild(s)
  })
}

function runLocalStorage() {
  try {
    localStorage.setItem('k', 'v')
    return `可用（如预期）：值 = ${localStorage.getItem('k')}`
  } catch (e) {
    return `被拒：${String(e.message).slice(0, 70)}`
  }
}

const experiments = [
  ['fetch(file://)', runFetchFile],
  ['import module', runImportModule],
  ['script 本地资源', runScriptTag],
  ['localStorage', runLocalStorage],
]

$('btn-fetch').addEventListener('click', async () => { $('web-output').textContent = `fetch(file://) → ${await runFetchFile()}` })
$('btn-import').addEventListener('click', async () => { $('web-output').textContent = `import module → ${await runImportModule()}` })
$('btn-script').addEventListener('click', async () => { $('web-output').textContent = `script 本地资源 → ${await runScriptTag()}` })
$('btn-storage').addEventListener('click', () => { $('web-output').textContent = `localStorage → ${runLocalStorage()}` })

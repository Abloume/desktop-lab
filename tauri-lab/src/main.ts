import { invoke } from '@tauri-apps/api/core'
import './style.css'

/**
 * Tauri 的通信模型（对照 Electron）：
 * - Electron：主进程 ipcMain.handle + 渲染进程 ipcRenderer.invoke，通道名是字符串
 * - Tauri：Rust 侧 #[tauri::command] 定义命令，前端 invoke('命令名', { 参数 })
 *   类型可以通过 @tauri-apps/api 的泛型指定，命令注册见 src-tauri/src/lib.rs
 */
const app = document.querySelector<HTMLDivElement>('#app')!

app.innerHTML = `
  <main>
    <h1>tauri-lab 👋</h1>
    <p>前端（WebView）⇄ Rust 后端：输入名字，调用 Rust 侧命令</p>
    <form id="greet-form">
      <input id="greet-input" placeholder="你的名字" autocomplete="off" />
      <button type="submit">打招呼</button>
    </form>
    <p id="greet-output"></p>
  </main>
`

const form = document.querySelector<HTMLFormElement>('#greet-form')!
const input = document.querySelector<HTMLInputElement>('#greet-input')!
const output = document.querySelector<HTMLParagraphElement>('#greet-output')!

form.addEventListener('submit', async (e) => {
  e.preventDefault()
  const name = input.value.trim()
  if (!name) return
  // invoke：调用 Rust 里的 greet 命令，第二个参数是命令参数对象
  output.textContent = await invoke<string>('greet', { name })
})

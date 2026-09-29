import { defineConfig } from 'vite'

// Tauri 开发时前端跑在 http://localhost:1420，与 tauri.conf.json 的 devUrl 保持一致
export default defineConfig({
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      ignored: ['**/src-tauri/**'],
    },
  },
})

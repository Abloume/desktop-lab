// 发布版（非 debug 构建）在 Windows 上隐藏控制台窗口
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // 入口委托给 lib.rs 里的 run()（Tauri v2 推荐把逻辑放 lib，便于移动端复用）
    tauri_lab_lib::run()
}

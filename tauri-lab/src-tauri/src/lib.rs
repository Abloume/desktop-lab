// ─────────────────────────────────────────────────────────────
// Tauri 后端（Rust）最小示例
//
// 对照前端 JS/TS 的差异点：
// - 函数参数：JS 随便传，Rust 必须声明类型（&str 是字符串借用）
// - 返回值：JS 任意返回，Rust 必须写清返回类型
// - 字符串：JS 的 string 是值类型；Rust 的 String 是拥有型，&str 是只读借用
//   （对应 Go 里 string 的不可变字节序列，但 Rust 更强调「借用」语义）
// ─────────────────────────────────────────────────────────────

/// 前端 `invoke('greet', { name })` 会命中这个命令。
/// `#[tauri::command]` 宏负责把前端的 JSON 参数反序列化成 Rust 类型。
#[tauri::command]
fn greet(name: &str) -> String {
    // format! 类似 JS 模板字符串 / Go 的 fmt.Sprintf
    format!("Hello, {}! 你已成功调用 Rust 侧命令。", name)
}

/// 应用入口：注册所有命令后启动。
/// `cfg_attr(mobile, ...)` 是移动端（iOS/Android）支持预留的属性。
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // 把 greet 命令注册进调用处理器，前端才能 invoke 到它
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

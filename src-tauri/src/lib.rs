/// AGY Studio — Tauri backend (Phase 1)
/// No custom commands yet. This is the foundation.

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .run(tauri::generate_context!())
        .expect("error while running AGY Studio");
}

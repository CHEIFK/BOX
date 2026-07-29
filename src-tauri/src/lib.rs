/// AGY Studio — Tauri backend (Phase 5: Workspace & Files)
///
/// Commands:
///   check_agy      — detect whether `agy` is installed
///   send_to_agy    — spawn an `agy` process, pipe the prompt, stream stdout
///                    tokens back as Tauri events
///   cancel_agy     — kill the running process
///   read_directory — list one level of a directory, returning FileEntry items
use std::path::Path;
use std::process::Stdio;
use std::sync::Mutex;

use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager, State};
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::process::{Child, Command};

// ── State ─────────────────────────────────────────────────────────────────────

/// Global state: optionally-running AGY child process.
pub struct AgyState {
    child: Mutex<Option<Child>>,
}

// ── Event payloads ────────────────────────────────────────────────────────────

#[derive(Clone, Serialize)]
pub struct TokenPayload {
    pub token: String,
}

#[derive(Clone, Serialize)]
pub struct DonePayload {
    pub exit_code: Option<i32>,
}

#[derive(Clone, Serialize)]
pub struct ErrorPayload {
    pub message: String,
}

// ── File system types ─────────────────────────────────────────────────────────

/// A single entry in a directory listing.
#[derive(Clone, Serialize)]
pub struct FileEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub extension: Option<String>,
    pub size: u64,
    /// Present only for directories; `None` until expanded (lazy loading).
    pub children: Option<Vec<FileEntry>>,
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/// Returns the resolved path to the `agy` binary, or `None` if not found.
fn find_agy() -> Option<String> {
    // 1. Check well-known absolute paths first (fastest, no PATH look-up)
    let candidates = [
        dirs_home().map(|h| format!("{}/.local/bin/agy", h)),
        Some("/usr/local/bin/agy".to_string()),
        Some("/usr/bin/agy".to_string()),
    ];

    for candidate in candidates.iter().flatten() {
        if Path::new(candidate).is_file() {
            return Some(candidate.clone());
        }
    }

    // 2. Fall back to `which agy` / PATH
    if which_agy().is_some() {
        return Some("agy".to_string());
    }

    None
}

/// Attempt to get the user's home directory from the HOME env var.
fn dirs_home() -> Option<String> {
    std::env::var("HOME").ok()
}

/// Check whether `agy` exists somewhere on PATH via `which`.
fn which_agy() -> Option<()> {
    std::process::Command::new("which")
        .arg("agy")
        .output()
        .ok()
        .filter(|o| o.status.success())
        .map(|_| ())
}

// ── Tauri commands ────────────────────────────────────────────────────────────

/// Check whether AGY is installed.
/// Returns `{"installed": true, "path": "/path/to/agy"}` or `{"installed": false}`.
#[tauri::command]
pub async fn check_agy() -> serde_json::Value {
    match find_agy() {
        Some(path) => serde_json::json!({ "installed": true, "path": path }),
        None => serde_json::json!({ "installed": false }),
    }
}

/// Spawn AGY, write the prompt to stdin, then stream stdout lines back as
/// `agy://token` events.  When the process exits, emit `agy://done`.
/// On error, emit `agy://error`.
#[tauri::command]
pub async fn send_to_agy(
    app: AppHandle,
    state: State<'_, AgyState>,
    prompt: String,
) -> Result<(), String> {
    // Kill any previously-running process
    {
        let mut guard = state.child.lock().map_err(|e| e.to_string())?;
        if let Some(mut old) = guard.take() {
            let _ = old.kill().await;
        }
    }

    let agy_path = match find_agy() {
        Some(p) => p,
        None => {
            let _ = app.emit(
                "agy://error",
                ErrorPayload {
                    message: "AGY is not installed. Install it at ~/.local/bin/agy or on PATH."
                        .to_string(),
                },
            );
            return Err("AGY not found".to_string());
        }
    };

    // Spawn the process
    let mut child = Command::new(&agy_path)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .kill_on_drop(true)
        .spawn()
        .map_err(|e| format!("Failed to spawn agy: {e}"))?;

    // Write prompt to stdin and close it so AGY knows input is done
    if let Some(mut stdin) = child.stdin.take() {
        stdin
            .write_all(prompt.as_bytes())
            .await
            .map_err(|e| format!("Failed to write to agy stdin: {e}"))?;
        // Drop closes stdin → AGY sees EOF and begins responding
    }

    // Capture stdout handle before storing child
    let stdout = child
        .stdout
        .take()
        .ok_or_else(|| "Failed to take agy stdout".to_string())?;

    // Store child so cancel_agy can kill it
    {
        let mut guard = state.child.lock().map_err(|e| e.to_string())?;
        *guard = Some(child);
    }

    // Stream stdout in a background task — clone app handle for the async block
    let app2 = app.clone();
    tokio::spawn(async move {
        let reader = BufReader::new(stdout);
        let mut lines = reader.lines();

        loop {
            match lines.next_line().await {
                Ok(Some(line)) => {
                    let _ = app2.emit("agy://token", TokenPayload { token: line + "\n" });
                }
                Ok(None) => break, // EOF
                Err(e) => {
                    let _ = app2.emit(
                        "agy://error",
                        ErrorPayload {
                            message: format!("Read error: {e}"),
                        },
                    );
                    break;
                }
            }
        }

        // Reap the child and emit done
        let exit_code: Option<i32> = {
            let mut guard = match app2.state::<AgyState>().child.lock() {
                Ok(g) => g,
                Err(_) => {
                    let _ = app2.emit("agy://done", DonePayload { exit_code: None });
                    return;
                }
            };
            if let Some(mut child) = guard.take() {
                child.wait().await.ok().and_then(|s| s.code())
            } else {
                None
            }
        };

        let _ = app2.emit("agy://done", DonePayload { exit_code });
    });

    Ok(())
}

/// Kill the running AGY process (if any).
#[tauri::command]
pub async fn cancel_agy(app: AppHandle, state: State<'_, AgyState>) -> Result<(), String> {
    let mut guard = state.child.lock().map_err(|e| e.to_string())?;
    if let Some(mut child) = guard.take() {
        child
            .kill()
            .await
            .map_err(|e| format!("Failed to kill agy: {e}"))?;
        let _ = app.emit(
            "agy://done",
            DonePayload {
                exit_code: Some(-1),
            },
        );
    }
    Ok(())
}

/// Read a file from disk as a UTF-8 string.
#[tauri::command]
pub fn read_file(path: String) -> Result<String, String> {
    std::fs::read_to_string(&path).map_err(|e| format!("Cannot read file '{path}': {e}"))
}

/// Write a UTF-8 string to a file on disk.
#[tauri::command]
pub fn write_file(path: String, content: String) -> Result<(), String> {
    std::fs::write(&path, content.as_bytes())
        .map_err(|e| format!("Cannot write file '{path}': {e}"))
}

/// Read one level of a directory. Subdirectories get `children: null` (not yet
/// expanded); files get `children: null` always.
#[tauri::command]
pub fn read_directory(path: String) -> Result<Vec<FileEntry>, String> {
    let dir = Path::new(&path);
    if !dir.is_dir() {
        return Err(format!("Not a directory: {path}"));
    }

    let read = std::fs::read_dir(dir).map_err(|e| format!("Cannot read dir: {e}"))?;

    let mut entries: Vec<FileEntry> = read
        .filter_map(|res| res.ok())
        .filter_map(|entry| {
            let file_name = entry.file_name();
            let name = file_name.to_string_lossy().to_string();

            // Skip hidden files/dirs (starting with .)
            // Comment out this line to show hidden files too.
            // if name.starts_with('.') { return None; }

            let full_path = entry.path();
            let path_str = full_path.to_string_lossy().to_string();

            let metadata = entry.metadata().ok()?;
            let is_dir = metadata.is_dir();
            let size = if is_dir { 0 } else { metadata.len() };
            let extension = if is_dir {
                None
            } else {
                full_path
                    .extension()
                    .map(|e| e.to_string_lossy().to_string())
            };

            Some(FileEntry {
                name,
                path: path_str,
                is_dir,
                extension,
                size,
                children: None, // lazy: loaded on expand
            })
        })
        .collect();

    // Sort: directories first, then files; alphabetical within each group
    entries.sort_by(|a, b| {
        b.is_dir
            .cmp(&a.is_dir)
            .then_with(|| a.name.to_lowercase().cmp(&b.name.to_lowercase()))
    });

    Ok(entries)
}

// ── App entry point ───────────────────────────────────────────────────────────

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(AgyState {
            child: Mutex::new(None),
        })
        .invoke_handler(tauri::generate_handler![
            check_agy,
            send_to_agy,
            cancel_agy,
            read_directory,
            read_file,
            write_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running AGY Studio");
}

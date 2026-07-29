/// AGY Studio — Tauri backend (Phase 7: Integrated Terminal)
///
/// Commands:
///   check_agy        — detect whether `agy` is installed
///   send_to_agy      — spawn an `agy` process, pipe the prompt, stream stdout
///                      tokens back as Tauri events
///   cancel_agy       — kill the running process
///   read_directory   — list one level of a directory, returning FileEntry items
///   read_file        — read a file from disk as UTF-8
///   write_file       — write a UTF-8 string to a file
///   spawn_shell      — spawn /bin/bash for an embedded terminal tab
///   write_to_terminal— forward keyboard input to a terminal's stdin
///   resize_terminal  — stub; real PTY resize needs portable-pty
///   close_terminal   — kill the bash process for a terminal tab
use std::collections::HashMap;
use std::path::Path;
use std::process::Stdio;
use std::sync::Mutex;

use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager, State};
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::process::{Child, Command};

// ── AGY State ─────────────────────────────────────────────────────────────────

/// Global state: optionally-running AGY child process.
pub struct AgyState {
    child: Mutex<Option<Child>>,
}

// ── Terminal State ────────────────────────────────────────────────────────────

pub struct TerminalState {
    /// Maps terminal ID → stdin sender channel.
    senders: Mutex<HashMap<String, tokio::sync::mpsc::UnboundedSender<String>>>,
    /// Maps terminal ID → child process (kept separate so we can kill without
    /// holding the sender lock across an await).
    children: Mutex<HashMap<String, Child>>,
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

#[derive(Clone, Serialize)]
pub struct TerminalOutputPayload {
    pub data: String,
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
    /// `None` until expanded (lazy loading).
    pub children: Option<Vec<FileEntry>>,
}

// ── Helpers ───────────────────────────────────────────────────────────────────

fn find_agy() -> Option<String> {
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
    if which_agy().is_some() {
        return Some("agy".to_string());
    }
    None
}

fn dirs_home() -> Option<String> {
    std::env::var("HOME").ok()
}

fn which_agy() -> Option<()> {
    std::process::Command::new("which")
        .arg("agy")
        .output()
        .ok()
        .filter(|o| o.status.success())
        .map(|_| ())
}

// ── Tauri commands — AGY ──────────────────────────────────────────────────────

#[tauri::command]
pub async fn check_agy() -> serde_json::Value {
    match find_agy() {
        Some(path) => serde_json::json!({ "installed": true, "path": path }),
        None => serde_json::json!({ "installed": false }),
    }
}

#[tauri::command]
pub async fn send_to_agy(
    app: AppHandle,
    state: State<'_, AgyState>,
    prompt: String,
) -> Result<(), String> {
    // Take any existing child out of state (dropping the guard immediately).
    let old_child = {
        let mut guard = state.child.lock().map_err(|e| e.to_string())?;
        guard.take()
    };
    // Kill outside the lock so we don't hold it across an await.
    if let Some(mut old) = old_child {
        let _ = old.kill().await;
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

    let mut child = Command::new(&agy_path)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .kill_on_drop(true)
        .spawn()
        .map_err(|e| format!("Failed to spawn agy: {e}"))?;

    if let Some(mut stdin) = child.stdin.take() {
        stdin
            .write_all(prompt.as_bytes())
            .await
            .map_err(|e| format!("Failed to write to agy stdin: {e}"))?;
    }

    let stdout = child
        .stdout
        .take()
        .ok_or_else(|| "Failed to take agy stdout".to_string())?;

    // Store child (drop guard immediately).
    {
        let mut guard = state.child.lock().map_err(|e| e.to_string())?;
        *guard = Some(child);
    }

    let app2 = app.clone();
    tokio::spawn(async move {
        let reader = BufReader::new(stdout);
        let mut lines = reader.lines();
        loop {
            match lines.next_line().await {
                Ok(Some(line)) => {
                    let _ = app2.emit("agy://token", TokenPayload { token: line + "\n" });
                }
                Ok(None) => break,
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

        // Reap child: take it out while holding the lock, then wait outside.
        let maybe_child = {
            let mut guard = match app2.state::<AgyState>().child.lock() {
                Ok(g) => g,
                Err(_) => {
                    let _ = app2.emit("agy://done", DonePayload { exit_code: None });
                    return;
                }
            };
            guard.take()
            // guard drops here
        };

        let exit_code = if let Some(mut c) = maybe_child {
            c.wait().await.ok().and_then(|s| s.code())
        } else {
            None
        };

        let _ = app2.emit("agy://done", DonePayload { exit_code });
    });

    Ok(())
}

#[tauri::command]
pub async fn cancel_agy(app: AppHandle, state: State<'_, AgyState>) -> Result<(), String> {
    // Take the child while holding the lock, then kill outside the lock.
    let maybe_child = {
        let mut guard = state.child.lock().map_err(|e| e.to_string())?;
        guard.take()
        // guard drops here
    };
    if let Some(mut child) = maybe_child {
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

#[tauri::command]
pub fn read_file(path: String) -> Result<String, String> {
    std::fs::read_to_string(&path).map_err(|e| format!("Cannot read file '{path}': {e}"))
}

#[tauri::command]
pub fn write_file(path: String, content: String) -> Result<(), String> {
    std::fs::write(&path, content.as_bytes())
        .map_err(|e| format!("Cannot write file '{path}': {e}"))
}

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
                children: None,
            })
        })
        .collect();
    entries.sort_by(|a, b| {
        b.is_dir
            .cmp(&a.is_dir)
            .then_with(|| a.name.to_lowercase().cmp(&b.name.to_lowercase()))
    });
    Ok(entries)
}

// ── Tauri commands — Terminal ─────────────────────────────────────────────────

/// Spawn a /bin/bash shell for a terminal tab identified by `id`.
/// Output is streamed as `terminal://output/{id}` events.
/// Shell exit is signalled by `terminal://exit/{id}`.
#[tauri::command]
pub async fn spawn_shell(
    app: AppHandle,
    state: State<'_, TerminalState>,
    id: String,
    cwd: String,
) -> Result<(), String> {
    // Remove any existing child for this ID, kill it outside the lock.
    let old_child = {
        let mut guard = state.children.lock().map_err(|e| e.to_string())?;
        guard.remove(&id)
    };
    if let Some(mut c) = old_child {
        let _ = c.kill().await;
    }

    // Remove old sender too.
    {
        let mut guard = state.senders.lock().map_err(|e| e.to_string())?;
        guard.remove(&id);
    }

    let cwd_path = if Path::new(&cwd).is_dir() {
        cwd.clone()
    } else {
        dirs_home().unwrap_or_else(|| "/".to_string())
    };

    let mut child = Command::new("/bin/bash")
        .arg("--login")
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .current_dir(&cwd_path)
        .env("TERM", "xterm-256color")
        .env("COLORTERM", "truecolor")
        .kill_on_drop(true)
        .spawn()
        .map_err(|e| format!("Failed to spawn shell: {e}"))?;

    let stdout = child.stdout.take().ok_or("No stdout")?;
    let stderr = child.stderr.take().ok_or("No stderr")?;
    let mut stdin = child.stdin.take().ok_or("No stdin")?;

    // Stdin forwarding channel
    let (tx, mut rx) = tokio::sync::mpsc::unbounded_channel::<String>();

    tokio::spawn(async move {
        while let Some(data) = rx.recv().await {
            if stdin.write_all(data.as_bytes()).await.is_err() {
                break;
            }
            let _ = stdin.flush().await;
        }
    });

    // Store sender and child (both locks acquired and dropped separately).
    {
        let mut guard = state.senders.lock().map_err(|e| e.to_string())?;
        guard.insert(id.clone(), tx);
    }
    {
        let mut guard = state.children.lock().map_err(|e| e.to_string())?;
        guard.insert(id.clone(), child);
    }

    let output_event = format!("terminal://output/{}", id);
    let exit_event = format!("terminal://exit/{}", id);

    // Stream stdout
    {
        let app2 = app.clone();
        let ev = output_event.clone();
        let id2 = id.clone();
        let exit_ev = exit_event.clone();
        tokio::spawn(async move {
            use tokio::io::AsyncReadExt;
            let mut buf = [0u8; 4096];
            let mut reader = stdout;
            loop {
                match reader.read(&mut buf).await {
                    Ok(0) | Err(_) => break,
                    Ok(n) => {
                        let data = String::from_utf8_lossy(&buf[..n]).to_string();
                        let _ = app2.emit(&ev, TerminalOutputPayload { data });
                    }
                }
            }
            let _ = app2.emit(
                &exit_ev,
                TerminalOutputPayload {
                    data: id2,
                },
            );
        });
    }

    // Stream stderr
    {
        let app3 = app.clone();
        let ev = output_event.clone();
        tokio::spawn(async move {
            use tokio::io::AsyncReadExt;
            let mut buf = [0u8; 4096];
            let mut reader = stderr;
            loop {
                match reader.read(&mut buf).await {
                    Ok(0) | Err(_) => break,
                    Ok(n) => {
                        let data = String::from_utf8_lossy(&buf[..n]).to_string();
                        let _ = app3.emit(&ev, TerminalOutputPayload { data });
                    }
                }
            }
        });
    }

    Ok(())
}

/// Write data to a terminal's stdin.
#[tauri::command]
pub async fn write_to_terminal(
    state: State<'_, TerminalState>,
    id: String,
    data: String,
) -> Result<(), String> {
    let guard = state.senders.lock().map_err(|e| e.to_string())?;
    if let Some(tx) = guard.get(&id) {
        tx.send(data).map_err(|e| format!("Send error: {e}"))?;
        Ok(())
    } else {
        Err(format!("No terminal with id: {id}"))
    }
}

/// Resize stub — PTY resize requires portable-pty.
#[tauri::command]
pub async fn resize_terminal(
    _state: State<'_, TerminalState>,
    _id: String,
    _cols: u16,
    _rows: u16,
) -> Result<(), String> {
    Ok(())
}

/// Kill the bash process for a terminal tab.
#[tauri::command]
pub async fn close_terminal(
    state: State<'_, TerminalState>,
    id: String,
) -> Result<(), String> {
    // Remove child from the map before the await.
    let maybe_child = {
        let mut guard = state.children.lock().map_err(|e| e.to_string())?;
        guard.remove(&id)
        // guard drops here
    };
    {
        let mut guard = state.senders.lock().map_err(|e| e.to_string())?;
        guard.remove(&id);
    }
    if let Some(mut child) = maybe_child {
        child
            .kill()
            .await
            .map_err(|e| format!("Failed to kill terminal: {e}"))?;
    }
    Ok(())
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
        .manage(TerminalState {
            senders: Mutex::new(HashMap::new()),
            children: Mutex::new(HashMap::new()),
        })
        .invoke_handler(tauri::generate_handler![
            check_agy,
            send_to_agy,
            cancel_agy,
            read_directory,
            read_file,
            write_file,
            spawn_shell,
            write_to_terminal,
            resize_terminal,
            close_terminal
        ])
        .run(tauri::generate_context!())
        .expect("error while running AGY Studio");
}

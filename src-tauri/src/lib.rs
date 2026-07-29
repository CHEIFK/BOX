/// AGY Studio — Tauri backend (Phase 4: AGY Integration)
///
/// Commands:
///   check_agy   — detect whether `agy` is installed
///   send_to_agy — spawn an `agy` process, pipe the prompt, stream stdout
///                 tokens back as Tauri events
///   cancel_agy  — kill the running process
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

// ── App entry point ───────────────────────────────────────────────────────────

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(AgyState {
            child: Mutex::new(None),
        })
        .invoke_handler(tauri::generate_handler![check_agy, send_to_agy, cancel_agy])
        .run(tauri::generate_context!())
        .expect("error while running AGY Studio");
}

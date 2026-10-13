use std::fs;
use std::path::PathBuf;

use serde::Serialize;
use tauri::{AppHandle, Manager};
use tauri_plugin_dialog::DialogExt;

/// Path of the tiny text file that remembers the user-chosen sync folder.
/// Stored in the OS app-config directory so it survives upgrades.
fn sync_config_file(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_config_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join("sync-directory.txt"))
}

fn read_sync_directory(app: &AppHandle) -> Option<PathBuf> {
    let file = sync_config_file(app).ok()?;
    let raw = fs::read_to_string(file).ok()?;
    let value = raw.trim();
    if value.is_empty() {
        None
    } else {
        Some(PathBuf::from(value))
    }
}

fn validate_file_name(name: &str) -> Result<(), String> {
    if name.is_empty()
        || name.contains('/')
        || name.contains('\\')
        || name.contains("..")
        || name.len() > 255
    {
        return Err("invalid file name".into());
    }
    Ok(())
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct SyncFileEntry {
    name: String,
    content: String,
    modified_ms: u64,
}

/// Returns the persisted sync directory, if one was chosen.
#[tauri::command]
fn get_sync_directory(app: AppHandle) -> Option<String> {
    read_sync_directory(&app).map(|path| path.to_string_lossy().to_string())
}

/// Opens the native folder picker and persists the selection on success.
#[tauri::command]
async fn pick_sync_directory(app: AppHandle) -> Result<Option<String>, String> {
    let Some(file_path) = app.dialog().file().blocking_pick_folder() else {
        return Ok(None);
    };
    let path = file_path.into_path().map_err(|e| e.to_string())?;
    let value = path.to_string_lossy().to_string();
    fs::write(sync_config_file(&app)?, &value).map_err(|e| e.to_string())?;
    Ok(Some(value))
}

#[tauri::command]
fn clear_sync_directory(app: AppHandle) -> Result<(), String> {
    let file = sync_config_file(&app)?;
    if file.exists() {
        fs::remove_file(file).map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// Reads every `*.json` resume file in the sync directory.
#[tauri::command]
fn list_sync_files(app: AppHandle) -> Result<Vec<SyncFileEntry>, String> {
    let Some(dir) = read_sync_directory(&app) else {
        return Ok(Vec::new());
    };
    if !dir.is_dir() {
        return Ok(Vec::new());
    }

    let mut files = Vec::new();
    for entry in fs::read_dir(&dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        if path.extension().and_then(|ext| ext.to_str()) != Some("json") {
            continue;
        }
        let Ok(metadata) = entry.metadata() else {
            continue;
        };
        if !metadata.is_file() {
            continue;
        }
        let Ok(content) = fs::read_to_string(&path) else {
            continue;
        };
        let modified_ms = metadata
            .modified()
            .ok()
            .and_then(|time| time.duration_since(std::time::UNIX_EPOCH).ok())
            .map(|duration| duration.as_millis() as u64)
            .unwrap_or(0);
        files.push(SyncFileEntry {
            name: entry.file_name().to_string_lossy().to_string(),
            content,
            modified_ms,
        });
    }
    Ok(files)
}

#[tauri::command]
fn write_sync_file(app: AppHandle, name: String, contents: String) -> Result<(), String> {
    validate_file_name(&name)?;
    let Some(dir) = read_sync_directory(&app) else {
        return Err("no sync directory configured".into());
    };
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    fs::write(dir.join(name), contents).map_err(|e| e.to_string())
}

#[tauri::command]
fn remove_sync_file(app: AppHandle, name: String) -> Result<(), String> {
    validate_file_name(&name)?;
    let Some(dir) = read_sync_directory(&app) else {
        return Ok(());
    };
    let target = dir.join(name);
    if target.exists() {
        fs::remove_file(target).map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// Opens an external web link in the default browser instead of the webview.
#[tauri::command]
fn open_external(url: String) -> Result<(), String> {
    if !(url.starts_with("http://") || url.starts_with("https://")) {
        return Err("unsupported url".into());
    }
    tauri_plugin_opener::open_url(url, None::<&str>).map_err(|e| e.to_string())
}

/// Writes exported file bytes to an absolute path chosen by the native save dialog.
#[tauri::command]
fn write_export_file(path: String, contents: Vec<u8>) -> Result<(), String> {
    fs::write(PathBuf::from(path), contents).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            get_sync_directory,
            pick_sync_directory,
            clear_sync_directory,
            list_sync_files,
            write_sync_file,
            remove_sync_file,
            open_external,
            write_export_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
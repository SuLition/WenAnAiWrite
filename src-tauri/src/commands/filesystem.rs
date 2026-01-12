//! 文件系统操作命令

use serde::Serialize;
use std::path::Path;

#[derive(Clone, Serialize)]
pub struct FileStat {
    pub size: u64,
}

/// 获取文件信息
#[tauri::command]
pub fn get_file_stat(path: String) -> Result<FileStat, String> {
    let metadata = std::fs::metadata(&path).map_err(|e| format!("获取文件信息失败: {}", e))?;
    Ok(FileStat {
        size: metadata.len(),
    })
}

/// 递归计算文件夹大小
fn calc_dir_size(path: &Path) -> u64 {
    if !path.exists() {
        return 0;
    }

    let mut size = 0u64;
    if let Ok(entries) = std::fs::read_dir(path) {
        for entry in entries.flatten() {
            let entry_path = entry.path();
            if entry_path.is_file() {
                if let Ok(metadata) = entry_path.metadata() {
                    size += metadata.len();
                }
            } else if entry_path.is_dir() {
                size += calc_dir_size(&entry_path);
            }
        }
    }
    size
}

/// 获取文件夹大小
#[tauri::command]
pub fn get_folder_size(path: String) -> Result<u64, String> {
    let folder_path = Path::new(&path);
    Ok(calc_dir_size(folder_path))
}

/// 清空文件夹内容（保留文件夹本身）
#[tauri::command]
pub fn clear_folder(path: String) -> Result<(), String> {
    let folder_path = Path::new(&path);
    if !folder_path.exists() {
        return Ok(());
    }

    if let Ok(entries) = std::fs::read_dir(folder_path) {
        for entry in entries.flatten() {
            let entry_path = entry.path();
            if entry_path.is_file() {
                let _ = std::fs::remove_file(&entry_path);
            } else if entry_path.is_dir() {
                let _ = std::fs::remove_dir_all(&entry_path);
            }
        }
    }
    Ok(())
}

/// 打开文件夹
#[tauri::command]
pub fn open_folder(path: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("打开文件夹失败: {}", e))?;
    }

    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("打开文件夹失败: {}", e))?;
    }

    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("打开文件夹失败: {}", e))?;
    }

    Ok(())
}

//! 窗口效果模块

#[cfg(target_os = "windows")]
use window_vibrancy::{apply_mica, clear_mica};

/// 设置窗口效果（毛玻璃等）
/// effect: "none" | "mica"
/// is_dark: 是否为暗色主题
#[tauri::command]
pub async fn set_window_effect(
    window: tauri::Window,
    effect: String,
    is_dark: bool,
) -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        // 先清除现有效果
        let _ = clear_mica(&window);

        match effect.as_str() {
            "mica" => {
                apply_mica(&window, Some(is_dark))
                    .map_err(|e| format!("应用 Mica 效果失败: {}", e))?;
                Ok("Mica 效果已应用".to_string())
            }
            "none" | _ => Ok("已清除窗口效果".to_string()),
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        // 避免未使用变量警告
        let _ = (window, effect, is_dark);
        Ok("当前平台不支持窗口效果".to_string())
    }
}

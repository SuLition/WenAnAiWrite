//! 托盘管理模块

use std::sync::Mutex;
use tauri::menu::{Menu, MenuItem};

/// 全局关闭行为设置: "exit" 或 "minimize"
pub static CLOSE_ACTION: Mutex<String> = Mutex::new(String::new());

/// 获取当前关闭行为设置
pub fn get_close_action() -> String {
    CLOSE_ACTION.lock().unwrap().clone()
}

/// 设置托盘菜单
pub fn setup_tray_menu(
    app: &tauri::AppHandle,
    tray: &tauri::tray::TrayIcon<tauri::Wry>,
) -> Result<(), Box<dyn std::error::Error>> {
    // 创建菜单项
    let show_item = MenuItem::with_id(app, "show", "显示窗口", true, None::<&str>)?;
    let quit_item = MenuItem::with_id(app, "quit", "退出程序", true, None::<&str>)?;

    // 创建菜单
    let menu = Menu::with_items(app, &[&show_item, &quit_item])?;

    // 设置菜单
    tray.set_menu(Some(menu))?;

    Ok(())
}

/// 设置关闭行为
/// action: "exit" | "minimize"
#[tauri::command]
pub async fn set_close_action(app: tauri::AppHandle, action: String) -> Result<String, String> {
    // 更新全局状态
    {
        let mut close_action = CLOSE_ACTION.lock().unwrap();
        *close_action = action.clone();
    }

    // 获取配置创建的托盘
    if let Some(tray) = app.tray_by_id("main-tray") {
        if action == "minimize" {
            // 设置托盘菜单和事件
            setup_tray_menu(&app, &tray).map_err(|e| format!("设置托盘菜单失败: {}", e))?;
            let _ = tray.set_visible(true);
            Ok("关闭时将最小化到托盘".to_string())
        } else {
            // 隐藏托盘
            let _ = tray.set_visible(false);
            Ok("关闭时将直接退出".to_string())
        }
    } else {
        Err("未找到系统托盘".to_string())
    }
}

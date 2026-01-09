//! CatParse Tauri 后端
//!
//! 模块结构:
//! - commands: Tauri 命令 (下载、文件系统、音频、网络)
//! - backend: 后端服务管理
//! - window: 窗口效果
//! - tray: 托盘管理

mod backend;
mod commands;
mod tray;
mod window;

use tauri::tray::{MouseButton, MouseButtonState};
use tauri::{Emitter, Manager};

// 重新导出模块中的命令和函数
use backend::{start_backend, start_backend_service, stop_backend, stop_backend_service};
use commands::{
    clear_folder, download_file, extract_audio, fetch_data, get_download_dir, get_file_stat,
    get_folder_size, open_folder, resolve_redirect,
};
use tray::{get_close_action, set_close_action};
use window::set_window_effect;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        // 更新插件
        .plugin(tauri_plugin_updater::Builder::new().build())
        // 进程插件（用于重启应用）
        .plugin(tauri_plugin_process::init())
        .on_menu_event(|app, event| {
            match event.id.as_ref() {
                "show" => {
                    if let Some(window) = app.get_webview_window("main") {
                        let _ = window.show();
                        let _ = window.set_focus();
                    }
                }
                "quit" => {
                    stop_backend_service();
                    std::process::exit(0);
                }
                _ => {}
            }
        })
        .setup(|app| {
            // 在后台线程启动后端服务（不阻塞主窗口显示）
            start_backend_service(app.handle());
            
            // 初始化托盘（默认隐藏，配置菜单事件）
            if let Some(tray) = app.tray_by_id("main-tray") {
                // 默认隐藏托盘
                let _ = tray.set_visible(false);

                // 设置托盘点击事件
                tray.on_tray_icon_event(|tray, event| {
                    if let tauri::tray::TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event {
                        if let Some(window) = tray.app_handle().get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                });
            }

            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                // 检查关闭行为设置
                let close_action = get_close_action();
                
                if close_action == "minimize" {
                    // 最小化到托盘
                    api.prevent_close();
                    let _ = window.hide();
                } else {
                    // 直接退出
                    api.prevent_close();
                    
                    // 发送关闭中事件到前端
                    let _ = window.emit("app-closing", ());
                    
                    // 在后台线程停止服务并关闭窗口
                    let window_clone = window.clone();
                    std::thread::spawn(move || {
                        // 停止后端服务
                        stop_backend_service();
                        
                        // 稍微延迟确保前端收到事件
                        std::thread::sleep(std::time::Duration::from_millis(300));
                        
                        // 关闭窗口
                        let _ = window_clone.destroy();
                    });
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            download_file, 
            get_download_dir, 
            get_file_stat,
            get_folder_size,
            clear_folder,
            extract_audio,
            open_folder, 
            fetch_data, 
            resolve_redirect,
            start_backend,
            stop_backend,
            set_window_effect,
            set_close_action
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

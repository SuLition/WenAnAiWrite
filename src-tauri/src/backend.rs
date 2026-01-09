//! 后端服务管理模块

use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use tauri::Manager;

/// 全局后端服务进程句柄
pub static BACKEND_SERVICE: Mutex<Option<Child>> = Mutex::new(None);

/// 后端服务端口
const BACKEND_PORT: &str = "127.0.0.1:3721";

/// 检查后端服务是否在运行
pub fn is_backend_running() -> bool {
    std::net::TcpStream::connect_timeout(
        &BACKEND_PORT.parse().unwrap(),
        std::time::Duration::from_millis(500),
    )
    .is_ok()
}

/// 等待服务就绪
fn wait_for_service_ready(timeout_ms: u64) -> bool {
    let iterations = timeout_ms / 500;
    for i in 0..iterations {
        std::thread::sleep(std::time::Duration::from_millis(500));
        if is_backend_running() {
            println!("[后端服务] 服务已就绪 ({}ms)", (i + 1) * 500);
            return true;
        }
    }
    println!("[后端服务] 服务启动超时");
    false
}

/// 保存子进程句柄
fn save_child_process(child: Child) {
    let mut service = BACKEND_SERVICE.lock().unwrap();
    *service = Some(child);
}

/// 启动开发环境的 Python 服务
fn start_dev_backend(backend_dir: std::path::PathBuf) -> Result<(), String> {
    let main_py = backend_dir.join("main.py");
    if !main_py.exists() {
        return Err(format!("main.py 不存在: {:?}", main_py));
    }

    println!("[后端服务] 启动 Python 服务: {:?}", main_py);

    #[cfg(target_os = "windows")]
    let child_result = {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        const DETACHED_PROCESS: u32 = 0x00000008;
        Command::new("python")
            .arg(&main_py)
            .current_dir(&backend_dir)
            .creation_flags(CREATE_NO_WINDOW | DETACHED_PROCESS)
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .stdin(Stdio::null())
            .spawn()
    };

    #[cfg(not(target_os = "windows"))]
    let child_result = Command::new("python")
        .arg(&main_py)
        .current_dir(&backend_dir)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn();

    match child_result {
        Ok(child) => {
            save_child_process(child);
            println!("[后端服务] Python 服务进程已启动");
            Ok(())
        }
        Err(e) => Err(format!("Python 启动失败: {}", e)),
    }
}

/// 启动生产环境的后端服务
fn start_prod_backend(
    exe_dir: &std::path::Path,
    resource_dir: &std::path::Path,
) -> Result<(), String> {
    // 尝试多个可能的路径
    let possible_paths = vec![
        exe_dir.join("binaries").join("backend_server.exe"),
        resource_dir.join("binaries").join("backend_server.exe"),
        resource_dir.join("backend_server.exe"),
        exe_dir.join("backend_server.exe"),
    ];

    let backend_exe = possible_paths
        .iter()
        .find(|p| p.exists())
        .ok_or_else(|| {
            let paths: Vec<String> = possible_paths.iter().map(|p| format!("{:?}", p)).collect();
            format!("后端服务文件未找到，已搜索: {}", paths.join(", "))
        })?
        .clone();

    let working_dir = backend_exe.parent().unwrap_or(exe_dir).to_path_buf();
    println!("[后端服务] 启动服务: {:?}", backend_exe);

    #[cfg(target_os = "windows")]
    let child_result = {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        Command::new(&backend_exe)
            .current_dir(&working_dir)
            .creation_flags(CREATE_NO_WINDOW)
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .spawn()
    };

    #[cfg(not(target_os = "windows"))]
    let child_result = Command::new(&backend_exe)
        .current_dir(&working_dir)
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn();

    match child_result {
        Ok(child) => {
            save_child_process(child);
            println!("[后端服务] 服务进程已启动");
            Ok(())
        }
        Err(e) => Err(format!("启动服务失败: {}", e)),
    }
}

/// 启动后端服务（非阻塞，应用启动时调用）
pub fn start_backend_service(app_handle: &tauri::AppHandle) {
    // 获取可执行文件所在目录
    let exe_path = match std::env::current_exe() {
        Ok(p) => p,
        Err(e) => {
            eprintln!("[后端服务] 获取可执行文件路径失败: {}", e);
            return;
        }
    };

    let exe_dir = match exe_path.parent() {
        Some(d) => d.to_path_buf(),
        None => {
            eprintln!("[后端服务] 无法获取可执行文件目录");
            return;
        }
    };

    let resource_dir = match app_handle.path().resource_dir() {
        Ok(p) => p,
        Err(e) => {
            eprintln!("[后端服务] 获取资源目录失败: {}", e);
            return;
        }
    };

    // 在后台线程启动服务
    if cfg!(debug_assertions) {
        // 开发环境
        let mut backend_dir = resource_dir.clone();
        backend_dir.pop(); // debug
        backend_dir.pop(); // target
        backend_dir.pop(); // src-tauri
        backend_dir.push("parser-service");

        std::thread::spawn(move || {
            if let Err(e) = start_dev_backend(backend_dir) {
                eprintln!("[后端服务] {}", e);
                return;
            }
            wait_for_service_ready(10000);
        });
    } else {
        // 生产环境
        std::thread::spawn(move || {
            if let Err(e) = start_prod_backend(&exe_dir, &resource_dir) {
                eprintln!("[后端服务] {}", e);
                return;
            }
            wait_for_service_ready(10000);
        });
    }
}

/// 停止后端服务
pub fn stop_backend_service() {
    let mut service = BACKEND_SERVICE.lock().unwrap();
    if let Some(mut child) = service.take() {
        println!("[后端服务] 正在停止服务...");

        // 尝试正常终止
        let _ = child.kill();

        // 等待进程结束
        match child.wait() {
            Ok(status) => println!("[后端服务] 服务已停止，退出码: {:?}", status),
            Err(e) => eprintln!("[后端服务] 等待进程结束失败: {}", e),
        }

        // Windows 上额外确保进程被终止
        #[cfg(target_os = "windows")]
        {
            use std::os::windows::process::CommandExt;
            const CREATE_NO_WINDOW: u32 = 0x08000000;
            let _ = Command::new("taskkill")
                .args(["/F", "/IM", "backend_server.exe"])
                .creation_flags(CREATE_NO_WINDOW)
                .output();
        }
    }
}

/// 停止后端服务（前端调用，用于更新前清理）
#[tauri::command]
pub fn stop_backend() -> Result<String, String> {
    stop_backend_service();
    Ok("服务已停止".to_string())
}

/// 手动启动后端服务（前端调用）
#[tauri::command]
pub async fn start_backend(app: tauri::AppHandle) -> Result<String, String> {
    // 检查服务是否已运行
    if is_backend_running() {
        return Ok("服务已在运行".to_string());
    }

    // 获取可执行文件所在目录
    let exe_path =
        std::env::current_exe().map_err(|e| format!("获取可执行文件路径失败: {}", e))?;
    let exe_dir = exe_path
        .parent()
        .ok_or("无法获取可执行文件目录")?
        .to_path_buf();

    if cfg!(debug_assertions) {
        // 开发环境
        let mut backend_dir = exe_dir.clone();
        backend_dir.pop(); // debug
        backend_dir.pop(); // target
        backend_dir.pop(); // src-tauri
        backend_dir.push("parser-service");

        start_dev_backend(backend_dir).map(|_| "Python 服务启动成功".to_string())
    } else {
        // 生产环境
        let resource_dir = app
            .path()
            .resource_dir()
            .map_err(|e| format!("获取资源目录失败: {}", e))?;

        start_prod_backend(&exe_dir, &resource_dir).map(|_| "服务启动成功".to_string())
    }
}

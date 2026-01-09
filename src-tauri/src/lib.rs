use futures_util::StreamExt;
use reqwest::header::{HeaderMap, HeaderValue, ORIGIN, REFERER, USER_AGENT, ACCEPT, ACCEPT_LANGUAGE, ACCEPT_ENCODING, CONNECTION};
use serde::{Deserialize, Serialize};
use std::fs::File;
use std::io::{Write, BufWriter};
use std::path::PathBuf;
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use tauri::Emitter;
use tauri::Manager;
use tauri::tray::{TrayIconBuilder, MouseButton, MouseButtonState};
use tauri::menu::{Menu, MenuItem};

#[cfg(target_os = "windows")]
use window_vibrancy::{apply_mica, clear_mica};

// 全局后端服务进程句柄
static BACKEND_SERVICE: Mutex<Option<Child>> = Mutex::new(None);

// 全局关闭行为设置: "exit" 或 "minimize"
static CLOSE_ACTION: Mutex<String> = Mutex::new(String::new());

#[derive(Clone, Serialize)]
struct DownloadProgress {
    id: String,
    downloaded: u64,
    total: u64,
    progress: f64,
    status: String,
}

#[derive(Deserialize)]
struct DownloadRequest {
    url: String,
    filename: String,
    save_dir: String,
    referer: Option<String>,
    origin: Option<String>,
}

/// 下载文件命令 - 支持进度回调
#[tauri::command]
async fn download_file(
    app: tauri::AppHandle,
    request: DownloadRequest,
) -> Result<String, String> {
    let download_id = uuid::Uuid::new_v4().to_string();
    let id_clone = download_id.clone();

    // 发送连接中状态
    let _ = app.emit(
        "download-progress",
        DownloadProgress {
            id: id_clone.clone(),
            downloaded: 0,
            total: 0,
            progress: 0.0,
            status: "connecting".to_string(),
        },
    );

    // 构建请求头
    let mut headers = HeaderMap::new();
    headers.insert(
        USER_AGENT,
        HeaderValue::from_static(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        ),
    );
    
    // 添加通用请求头
    headers.insert(ACCEPT, HeaderValue::from_static("*/*"));
    headers.insert(ACCEPT_LANGUAGE, HeaderValue::from_static("zh-CN,zh;q=0.9,en;q=0.8"));
    headers.insert(ACCEPT_ENCODING, HeaderValue::from_static("identity"));
    headers.insert(CONNECTION, HeaderValue::from_static("keep-alive"));

    if let Some(referer) = &request.referer {
        if let Ok(val) = HeaderValue::from_str(referer) {
            headers.insert(REFERER, val);
        }
    }

    if let Some(origin) = &request.origin {
        if let Ok(val) = HeaderValue::from_str(origin) {
            headers.insert(ORIGIN, val);
        }
    }

    // 创建 HTTP 客户端，启用重定向跟随
    let client = reqwest::Client::builder()
        .default_headers(headers)
        .redirect(reqwest::redirect::Policy::limited(10))
        .timeout(std::time::Duration::from_secs(300))
        .build()
        .map_err(|e| e.to_string())?;

    // 发起请求
    let response = client
        .get(&request.url)
        .send()
        .await
        .map_err(|e| format!("请求失败: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("HTTP 错误: {}", response.status()));
    }

    let total_size = response.content_length().unwrap_or(0);

    // 发送开始下载状态
    let _ = app.emit(
        "download-progress",
        DownloadProgress {
            id: id_clone.clone(),
            downloaded: 0,
            total: total_size,
            progress: 0.0,
            status: "downloading".to_string(),
        },
    );

    // 创建保存目录
    let save_path = PathBuf::from(&request.save_dir);
    if !save_path.exists() {
        std::fs::create_dir_all(&save_path).map_err(|e| e.to_string())?;
    }

    let file_path = save_path.join(&request.filename);
    let file = File::create(&file_path).map_err(|e| format!("创建文件失败: {}", e))?;
    let mut writer = BufWriter::with_capacity(1024 * 1024, file); // 1MB 缓冲区

    let mut downloaded: u64 = 0;
    let mut last_progress: u64 = 0;
    let mut stream = response.bytes_stream();

    // 流式下载并报告进度（每 500KB 或 2% 报告一次）
    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| format!("下载失败: {}", e))?;
        writer.write_all(&chunk)
            .map_err(|e| format!("写入文件失败: {}", e))?;

        downloaded += chunk.len() as u64;

        // 减少进度事件发送频率，提高下载速度
        let should_report = if total_size > 0 {
            let progress_diff = ((downloaded - last_progress) as f64 / total_size as f64) * 100.0;
            progress_diff >= 2.0 // 每 2% 报告一次
        } else {
            downloaded - last_progress >= 512 * 1024 // 每 512KB 报告一次
        };

        if should_report {
            last_progress = downloaded;
            let progress = if total_size > 0 {
                (downloaded as f64 / total_size as f64) * 100.0
            } else {
                0.0
            };

            // 发送进度事件
            let _ = app.emit(
                "download-progress",
                DownloadProgress {
                    id: id_clone.clone(),
                    downloaded,
                    total: total_size,
                    progress,
                    status: "downloading".to_string(),
                },
            );
        }
    }

    // 刷新缓冲区
    writer.flush().map_err(|e| format!("刷新文件失败: {}", e))?;

    // 发送完成事件
    let _ = app.emit(
        "download-progress",
        DownloadProgress {
            id: id_clone.clone(),
            downloaded,
            total: total_size,
            progress: 100.0,
            status: "completed".to_string(),
        },
    );

    Ok(file_path.to_string_lossy().to_string())
}

/// 获取默认下载目录
#[tauri::command]
fn get_download_dir() -> Result<String, String> {
    dirs::download_dir()
        .or_else(|| dirs::home_dir().map(|p| p.join("Downloads")))
        .map(|p| p.to_string_lossy().to_string())
        .ok_or_else(|| "无法获取下载目录".to_string())
}

/// 获取文件信息
#[derive(Clone, Serialize)]
struct FileStat {
    size: u64,
}

#[tauri::command]
fn get_file_stat(path: String) -> Result<FileStat, String> {
    let metadata = std::fs::metadata(&path).map_err(|e| format!("获取文件信息失败: {}", e))?;
    Ok(FileStat {
        size: metadata.len(),
    })
}

/// 从视频提取音频的返回结果
#[derive(Clone, Serialize)]
struct ExtractAudioResult {
    audio_path: String,
}

/// 从本地视频文件提取音频
#[tauri::command]
async fn extract_audio(app: tauri::AppHandle, video_path: String) -> Result<ExtractAudioResult, String> {
    use std::process::Command;
    
    // 检查视频文件是否存在
    if !std::path::Path::new(&video_path).exists() {
        return Err("视频文件不存在".to_string());
    }
    
    // 获取应用数据目录
    let app_data_dir = app.path().app_data_dir()
        .map_err(|e| format!("获取应用数据目录失败: {}", e))?;
    
    // 创建 temp 目录
    let temp_dir = app_data_dir.join("temp");
    if !temp_dir.exists() {
        std::fs::create_dir_all(&temp_dir)
            .map_err(|e| format!("创建临时目录失败: {}", e))?;
    }
    
    // 生成输出音频文件名
    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_millis();
    let audio_filename = format!("extracted_{}.mp3", timestamp);
    let audio_path = temp_dir.join(&audio_filename);
    
    // 查找 FFmpeg
    let ffmpeg_cmd = if cfg!(target_os = "windows") {
        "ffmpeg.exe"
    } else {
        "ffmpeg"
    };
    
    // 执行 FFmpeg 提取音频
    let output = Command::new(ffmpeg_cmd)
        .args(&[
            "-i", &video_path,
            "-vn",                    // 不处理视频
            "-acodec", "libmp3lame", // MP3 编码
            "-ab", "128k",           // 音频比特率
            "-ar", "44100",          // 采样率
            "-ac", "2",              // 声道数
            "-y",                     // 覆盖已存在的文件
            audio_path.to_str().unwrap()
        ])
        .output()
        .map_err(|e| format!("FFmpeg 执行失败: {}. 请确保已安装 FFmpeg 并添加到系统 PATH", e))?;
    
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("FFmpeg 提取失败: {}", stderr));
    }
    
    // 检查输出文件是否存在
    if !audio_path.exists() {
        return Err("音频提取失败，未生成输出文件".to_string());
    }
    
    Ok(ExtractAudioResult {
        audio_path: audio_path.to_string_lossy().to_string(),
    })
}

/// 打开文件夹
#[tauri::command]
fn open_folder(path: String) -> Result<(), String> {
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

#[derive(Deserialize)]
struct FetchDataRequest {
    url: String,
    referer: Option<String>,
    origin: Option<String>,
}

/// 下载数据到内存（用于音频识别等场景）
#[tauri::command]
async fn fetch_data(
    app: tauri::AppHandle,
    request: FetchDataRequest,
) -> Result<Vec<u8>, String> {
    // 发送连接中状态
    let _ = app.emit(
        "fetch-progress",
        serde_json::json!({
            "status": "connecting",
            "progress": 0
        }),
    );

    // 构建请求头
    let mut headers = HeaderMap::new();
    headers.insert(
        USER_AGENT,
        HeaderValue::from_static(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        ),
    );
    
    // 添加通用请求头
    headers.insert(ACCEPT, HeaderValue::from_static("*/*"));
    headers.insert(ACCEPT_LANGUAGE, HeaderValue::from_static("zh-CN,zh;q=0.9,en;q=0.8"));
    headers.insert(ACCEPT_ENCODING, HeaderValue::from_static("identity"));
    headers.insert(CONNECTION, HeaderValue::from_static("keep-alive"));

    if let Some(referer) = &request.referer {
        if let Ok(val) = HeaderValue::from_str(referer) {
            headers.insert(REFERER, val);
        }
    }

    if let Some(origin) = &request.origin {
        if let Ok(val) = HeaderValue::from_str(origin) {
            headers.insert(ORIGIN, val);
        }
    }

    // 创建 HTTP 客户端，启用重定向跟随
    let client = reqwest::Client::builder()
        .default_headers(headers)
        .redirect(reqwest::redirect::Policy::limited(10))
        .timeout(std::time::Duration::from_secs(300))
        .build()
        .map_err(|e| e.to_string())?;

    // 发起请求
    let response = client
        .get(&request.url)
        .send()
        .await
        .map_err(|e| format!("请求失败: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("HTTP 错误: {}", response.status()));
    }

    let total_size = response.content_length().unwrap_or(0);

    // 发送开始下载状态
    let _ = app.emit(
        "fetch-progress",
        serde_json::json!({
            "status": "downloading",
            "progress": 0,
            "total": total_size
        }),
    );

    let mut data = Vec::with_capacity(total_size as usize);
    let mut downloaded: u64 = 0;
    let mut last_progress: u64 = 0;
    let mut stream = response.bytes_stream();

    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| format!("下载失败: {}", e))?;
        data.extend_from_slice(&chunk);
        downloaded += chunk.len() as u64;

        // 每 5% 报告一次进度
        let should_report = if total_size > 0 {
            let progress_diff = ((downloaded - last_progress) as f64 / total_size as f64) * 100.0;
            progress_diff >= 5.0
        } else {
            downloaded - last_progress >= 512 * 1024
        };

        if should_report {
            last_progress = downloaded;
            let progress = if total_size > 0 {
                (downloaded as f64 / total_size as f64) * 100.0
            } else {
                0.0
            };

            let _ = app.emit(
                "fetch-progress",
                serde_json::json!({
                    "status": "downloading",
                    "progress": progress,
                    "downloaded": downloaded,
                    "total": total_size
                }),
            );
        }
    }

    // 发送完成事件
    let _ = app.emit(
        "fetch-progress",
        serde_json::json!({
            "status": "completed",
            "progress": 100,
            "downloaded": downloaded,
            "total": total_size
        }),
    );

    Ok(data)
}

/// 解析重定向URL（用于 B 站短链接等）
#[tauri::command]
async fn resolve_redirect(url: String) -> Result<String, String> {
    let client = reqwest::Client::builder()
        .redirect(reqwest::redirect::Policy::none()) // 不自动跟随重定向
        .build()
        .map_err(|e| e.to_string())?;

    let response = client
        .head(&url)
        .header(USER_AGENT, "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
        .send()
        .await
        .map_err(|e| format!("请求失败: {}", e))?;

    // 获取 Location 头
    if let Some(location) = response.headers().get("location") {
        let redirect_url = location
            .to_str()
            .map_err(|e| format!("解析 Location 头失败: {}", e))?
            .to_string();
        return Ok(redirect_url);
    }

    // 没有重定向，返回原 URL
    Ok(url)
}

/// 启动后端服务（非阻塞）
fn start_backend_service(app_handle: &tauri::AppHandle) {
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
    
    // 在后台线程启动服务
    if cfg!(debug_assertions) {
        // 开发环境：使用 python main.py
        let resource_path = match app_handle.path().resource_dir() {
            Ok(p) => p,
            Err(e) => {
                eprintln!("[后端服务] 获取资源目录失败: {}", e);
                return;
            }
        };
        let mut backend_dir = resource_path.clone();
        backend_dir.pop(); // debug
        backend_dir.pop(); // target
        backend_dir.pop(); // src-tauri
        backend_dir.push("parser-service"); // 使用 parser-service 目录
        
        let main_py = backend_dir.join("main.py");
        if !main_py.exists() {
            eprintln!("[后端服务] main.py 不存在: {:?}", main_py);
            return;
        }
        
        std::thread::spawn(move || {
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
                    let mut service = BACKEND_SERVICE.lock().unwrap();
                    *service = Some(child);
                    println!("[后端服务] Python 服务进程已启动");
                    
                    // 等待服务就绪
                    for i in 0..20 {
                        std::thread::sleep(std::time::Duration::from_millis(500));
                        if std::net::TcpStream::connect_timeout(
                            &"127.0.0.1:3721".parse().unwrap(),
                            std::time::Duration::from_millis(200)
                        ).is_ok() {
                            println!("[后端服务] 服务已就绪 ({}ms)", (i + 1) * 500);
                            return;
                        }
                    }
                    println!("[后端服务] 服务启动超时");
                }
                Err(e) => {
                    eprintln!("[后端服务] Python 启动失败: {}", e);
                }
            }
        });
    } else {
        // 生产环境：使用 backend_server.exe
        // 优先从资源目录查找，然后从 exe 目录查找
        let resource_dir = match app_handle.path().resource_dir() {
            Ok(p) => p,
            Err(e) => {
                eprintln!("[后端服务] 获取资源目录失败: {}", e);
                return;
            }
        };
        
        // 尝试多个可能的路径
        let possible_paths = vec![
            exe_dir.join("binaries").join("backend_server.exe"),  // NSIS 安装目录
            resource_dir.join("binaries").join("backend_server.exe"),
            resource_dir.join("backend_server.exe"),
            exe_dir.join("backend_server.exe"),
        ];
        
        let backend_exe = match possible_paths.iter().find(|p| p.exists()) {
            Some(p) => p.clone(),
            None => {
                eprintln!("[后端服务] backend_server.exe 未找到，已搜索路径:");
                for p in &possible_paths {
                    eprintln!("  - {:?}", p);
                }
                return;
            }
        };
        
        let working_dir = backend_exe.parent().unwrap_or(&exe_dir).to_path_buf();
        std::thread::spawn(move || {
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
                    let mut service = BACKEND_SERVICE.lock().unwrap();
                    *service = Some(child);
                    println!("[后端服务] 服务进程已启动");
                    
                    for i in 0..20 {
                        std::thread::sleep(std::time::Duration::from_millis(500));
                        if std::net::TcpStream::connect_timeout(
                            &"127.0.0.1:3721".parse().unwrap(),
                            std::time::Duration::from_millis(200)
                        ).is_ok() {
                            println!("[后端服务] 服务已就绪 ({}ms)", (i + 1) * 500);
                            return;
                        }
                    }
                    println!("[后端服务] 服务启动超时");
                }
                Err(e) => {
                    eprintln!("[后端服务] 启动失败: {}", e);
                }
            }
        });
    }
}

/// 停止后端服务
fn stop_backend_service() {
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
            use std::process::Command as StdCommand;
            const CREATE_NO_WINDOW: u32 = 0x08000000;
            // 使用 taskkill 强制终止（隐藏窗口）
            let _ = StdCommand::new("taskkill")
                .args(["/F", "/IM", "backend_server.exe"])
                .creation_flags(CREATE_NO_WINDOW)
                .output();
        }
    }
}

/// 停止后端服务（前端调用，用于更新前清理）
#[tauri::command]
fn stop_backend() -> Result<String, String> {
    stop_backend_service();
    Ok("服务已停止".to_string())
}

/// 手动启动后端服务（前端调用）
#[tauri::command]
async fn start_backend(app: tauri::AppHandle) -> Result<String, String> {
    // 检查服务是否已运行
    if std::net::TcpStream::connect_timeout(
        &"127.0.0.1:3721".parse().unwrap(),
        std::time::Duration::from_millis(500)
    ).is_ok() {
        return Ok("服务已在运行".to_string());
    }
    
    // 获取可执行文件所在目录
    let exe_path = std::env::current_exe()
        .map_err(|e| format!("获取可执行文件路径失败: {}", e))?;
    let exe_dir = exe_path.parent()
        .ok_or("无法获取可执行文件目录")?
        .to_path_buf();
    
    if cfg!(debug_assertions) {
        // 开发环境：使用 python main.py
        let mut backend_dir = exe_dir.clone();
        backend_dir.pop(); // debug
        backend_dir.pop(); // target
        backend_dir.pop(); // src-tauri
        backend_dir.push("parser-service"); // 使用 parser-service 目录
        
        let main_py = backend_dir.join("main.py");
        if !main_py.exists() {
            return Err(format!("main.py 不存在: {:?}", main_py));
        }
        
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
                let mut service = BACKEND_SERVICE.lock().unwrap();
                *service = Some(child);
                Ok("Python 服务启动成功".to_string())
            }
            Err(e) => Err(format!("Python 启动失败: {}", e))
        }
    } else {
        // 生产环境：使用 backend_server.exe
        let resource_dir = app.path().resource_dir()
            .map_err(|e| format!("获取资源目录失败: {}", e))?;
        
        // 尝试多个可能的路径
        let possible_paths = vec![
            exe_dir.join("binaries").join("backend_server.exe"),  // NSIS 安装目录
            resource_dir.join("binaries").join("backend_server.exe"),
            resource_dir.join("backend_server.exe"),
            exe_dir.join("backend_server.exe"),
        ];
        
        let backend_exe = possible_paths.iter().find(|p| p.exists())
            .ok_or_else(|| {
                let paths: Vec<String> = possible_paths.iter().map(|p| format!("{:?}", p)).collect();
                format!("后端服务文件未找到，已搜索: {}", paths.join(", "))
            })?
            .clone();
        
        let working_dir = backend_exe.parent().unwrap_or(&exe_dir).to_path_buf();
        
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
                let mut service = BACKEND_SERVICE.lock().unwrap();
                *service = Some(child);
                Ok("服务启动成功".to_string())
            }
            Err(e) => Err(format!("启动服务失败: {}", e))
        }
    }
}

/// 设置窗口效果（毛玻璃等）
/// effect: "none" | "mica"
/// is_dark: 是否为暗色主题
#[tauri::command]
async fn set_window_effect(
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
            "none" | _ => {
                Ok("已清除窗口效果".to_string())
            }
        }
    }
    
    #[cfg(not(target_os = "windows"))]
    {
        Ok("当前平台不支持窗口效果".to_string())
    }
}

/// 设置关闭行为
/// action: "exit" | "minimize"
#[tauri::command]
async fn set_close_action(app: tauri::AppHandle, action: String) -> Result<String, String> {
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

/// 设置托盘菜单
fn setup_tray_menu(app: &tauri::AppHandle, tray: &tauri::tray::TrayIcon<tauri::Wry>) -> Result<(), Box<dyn std::error::Error>> {
    // 创建菜单项
    let show_item = MenuItem::with_id(app, "show", "显示窗口", true, None::<&str>)?;
    let quit_item = MenuItem::with_id(app, "quit", "退出程序", true, None::<&str>)?;
    
    // 创建菜单
    let menu = Menu::with_items(app, &[&show_item, &quit_item])?;
    
    // 设置菜单
    tray.set_menu(Some(menu))?;
    
    Ok(())
}

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
                let close_action = {
                    let action = CLOSE_ACTION.lock().unwrap();
                    action.clone()
                };
                
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

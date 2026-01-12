//! 下载相关命令

use futures_util::StreamExt;
use reqwest::header::{
    HeaderMap, HeaderValue, ACCEPT, ACCEPT_ENCODING, ACCEPT_LANGUAGE, CONNECTION, ORIGIN, REFERER,
    USER_AGENT,
};
use serde::{Deserialize, Serialize};
use std::fs::File;
use std::io::{BufWriter, Write};
use std::path::PathBuf;
use tauri::Emitter;

#[derive(Clone, Serialize)]
pub struct DownloadProgress {
    pub id: String,
    pub downloaded: u64,
    pub total: u64,
    pub progress: f64,
    pub status: String,
}

#[derive(Deserialize)]
pub struct DownloadRequest {
    pub url: String,
    pub filename: String,
    pub save_dir: String,
    pub referer: Option<String>,
    pub origin: Option<String>,
}

/// 下载文件命令 - 支持进度回调
#[tauri::command]
pub async fn download_file(
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
    headers.insert(
        ACCEPT_LANGUAGE,
        HeaderValue::from_static("zh-CN,zh;q=0.9,en;q=0.8"),
    );
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
        writer
            .write_all(&chunk)
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
pub fn get_download_dir() -> Result<String, String> {
    dirs::download_dir()
        .or_else(|| dirs::home_dir().map(|p| p.join("Downloads")))
        .map(|p| p.to_string_lossy().to_string())
        .ok_or_else(|| "无法获取下载目录".to_string())
}

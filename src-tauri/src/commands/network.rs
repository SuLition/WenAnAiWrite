//! 网络请求命令

use futures_util::StreamExt;
use reqwest::header::{
    HeaderMap, HeaderValue, ACCEPT, ACCEPT_ENCODING, ACCEPT_LANGUAGE, CONNECTION, ORIGIN, REFERER,
    USER_AGENT,
};
use serde::Deserialize;
use tauri::Emitter;

#[derive(Deserialize)]
pub struct FetchDataRequest {
    pub url: String,
    pub referer: Option<String>,
    pub origin: Option<String>,
}

/// 下载数据到内存（用于音频识别等场景）
#[tauri::command]
pub async fn fetch_data(
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
pub async fn resolve_redirect(url: String) -> Result<String, String> {
    let client = reqwest::Client::builder()
        .redirect(reqwest::redirect::Policy::none()) // 不自动跟随重定向
        .build()
        .map_err(|e| e.to_string())?;

    let response = client
        .head(&url)
        .header(
            USER_AGENT,
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        )
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

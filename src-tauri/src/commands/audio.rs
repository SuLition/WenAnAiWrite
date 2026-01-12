//! 音频处理命令

use serde::Serialize;
use std::process::Command;
use tauri::Manager;

#[derive(Clone, Serialize)]
pub struct ExtractAudioResult {
    pub audio_path: String,
}

/// 从本地视频文件提取音频
#[tauri::command]
pub async fn extract_audio(
    app: tauri::AppHandle,
    video_path: String,
) -> Result<ExtractAudioResult, String> {
    // 检查视频文件是否存在
    if !std::path::Path::new(&video_path).exists() {
        return Err("视频文件不存在".to_string());
    }

    // 获取应用数据目录
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("获取应用数据目录失败: {}", e))?;

    // 创建 temp 目录
    let temp_dir = app_data_dir.join("temp");
    if !temp_dir.exists() {
        std::fs::create_dir_all(&temp_dir).map_err(|e| format!("创建临时目录失败: {}", e))?;
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
            "-i",
            &video_path,
            "-vn", // 不处理视频
            "-acodec",
            "libmp3lame", // MP3 编码
            "-ab",
            "128k", // 音频比特率
            "-ar",
            "44100", // 采样率
            "-ac",
            "2",  // 声道数
            "-y", // 覆盖已存在的文件
            audio_path.to_str().unwrap(),
        ])
        .output()
        .map_err(|e| {
            format!(
                "FFmpeg 执行失败: {}. 请确保已安装 FFmpeg 并添加到系统 PATH",
                e
            )
        })?;

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

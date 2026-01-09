//! Tauri 命令模块
//! 包含所有暴露给前端的命令

pub mod download;
pub mod filesystem;
pub mod audio;
pub mod network;

// 重新导出所有命令，方便在 lib.rs 中使用
pub use download::*;
pub use filesystem::*;
pub use audio::*;
pub use network::*;

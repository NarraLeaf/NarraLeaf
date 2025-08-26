/*!
 * Logging Module for NarraLeaf
 *
 * Provides structured logging functionality for the NarraLeaf Tauri plugin.
 * This module offers different log levels and structured logging capabilities.
 */

use std::sync::Arc;
use tokio::sync::Mutex;
use serde::{Deserialize, Serialize};
use std::time::{SystemTime, UNIX_EPOCH};

#[cfg(feature = "tauri-plugin")]
use tauri::AppHandle;

/**
 * Log levels for structured logging
 */
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum LogLevel {
    Debug,
    Info,
    Warning,
    Error,
    Critical,
}

/**
 * Structured log entry
 */
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogEntry {
    pub timestamp: u64,
    pub level: LogLevel,
    pub component: String,
    pub message: String,
    pub data: Option<serde_json::Value>,
    pub error: Option<String>,
}

/**
 * Logger implementation
 */
#[cfg(feature = "tauri-plugin")]
pub struct Logger {
    app_handle: Option<AppHandle>,
    min_level: LogLevel,
    buffer: Arc<Mutex<Vec<LogEntry>>>,
    max_buffer_size: usize,
}

#[cfg(feature = "tauri-plugin")]
impl Logger {
    /**
     * Create a new logger instance
     */
    pub fn new(app_handle: Option<AppHandle>) -> Self {
        Self {
            app_handle,
            min_level: LogLevel::Info,
            buffer: Arc::new(Mutex::new(Vec::new())),
            max_buffer_size: 1000,
        }
    }

    /**
     * Set the minimum log level
     */
    pub fn set_min_level(&mut self, level: LogLevel) {
        self.min_level = level;
    }

    /**
     * Check if a log level should be processed
     */
    fn should_log(&self, level: &LogLevel) -> bool {
        match (&self.min_level, level) {
            (LogLevel::Debug, _) => true,
            (LogLevel::Info, LogLevel::Info | LogLevel::Warning | LogLevel::Error | LogLevel::Critical) => true,
            (LogLevel::Warning, LogLevel::Warning | LogLevel::Error | LogLevel::Critical) => true,
            (LogLevel::Error, LogLevel::Error | LogLevel::Critical) => true,
            (LogLevel::Critical, LogLevel::Critical) => true,
            _ => false,
        }
    }

    /**
     * Log a message
     */
    pub async fn log(
        &self,
        level: LogLevel,
        component: &str,
        message: &str,
        data: Option<serde_json::Value>,
        error: Option<String>,
    ) {
        if !self.should_log(&level) {
            return;
        }

        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as u64;

        let entry = LogEntry {
            timestamp,
            level: level.clone(),
            component: component.to_string(),
            message: message.to_string(),
            data,
            error,
        };

        // Add to buffer
        {
            let mut buffer = self.buffer.lock().await;
            buffer.push(entry.clone());

            // Maintain buffer size
            if buffer.len() > self.max_buffer_size {
                buffer.remove(0);
            }
        }

        // Console output for development
        let level_str = match level {
            LogLevel::Debug => "DEBUG",
            LogLevel::Info => "INFO",
            LogLevel::Warning => "WARN",
            LogLevel::Error => "ERROR",
            LogLevel::Critical => "CRITICAL",
        };

        println!("[{}] {} - {}: {}", level_str, component, timestamp, message);

        if let Some(ref error) = entry.error {
            println!("  Error: {}", error);
        }

        if let Some(ref data) = entry.data {
            println!("  Data: {}", data);
        }
    }

    /**
     * Log debug message
     */
    pub async fn debug(&self, component: &str, message: &str) {
        self.log(LogLevel::Debug, component, message, None, None).await;
    }

    /**
     * Log info message
     */
    pub async fn info(&self, component: &str, message: &str) {
        self.log(LogLevel::Info, component, message, None, None).await;
    }

    /**
     * Log warning message
     */
    pub async fn warning(&self, component: &str, message: &str) {
        self.log(LogLevel::Warning, component, message, None, None).await;
    }

    /**
     * Log error message
     */
    pub async fn error(&self, component: &str, message: &str, error: Option<String>) {
        self.log(LogLevel::Error, component, message, None, error).await;
    }

    /**
     * Log critical message
     */
    pub async fn critical(&self, component: &str, message: &str, error: Option<String>) {
        self.log(LogLevel::Critical, component, message, None, error).await;
    }

    /**
     * Get recent log entries
     */
    pub async fn get_recent_logs(&self, limit: usize) -> Vec<LogEntry> {
        let buffer = self.buffer.lock().await;
        buffer.iter()
            .rev()
            .take(limit)
            .cloned()
            .collect::<Vec<_>>()
            .into_iter()
            .rev()
            .collect()
    }

    /**
     * Clear log buffer
     */
    pub async fn clear_logs(&self) {
        let mut buffer = self.buffer.lock().await;
        buffer.clear();
    }
}

/**
 * Global logger instance using thread-safe wrapper
 */
#[cfg(feature = "tauri-plugin")]
use std::sync::OnceLock;
#[cfg(feature = "tauri-plugin")]
static GLOBAL_LOGGER: OnceLock<Logger> = OnceLock::new();

/**
 * Initialize global logger
 */
#[cfg(feature = "tauri-plugin")]
pub fn init_global_logger(app_handle: Option<AppHandle>) {
    let _ = GLOBAL_LOGGER.set(Logger::new(app_handle));
}

/**
 * Get global logger instance
 */
#[cfg(feature = "tauri-plugin")]
pub fn global_logger() -> Option<&'static Logger> {
    GLOBAL_LOGGER.get()
}

/**
 * Convenience functions for logging
 */
#[cfg(feature = "tauri-plugin")]
pub async fn log_debug(component: &str, message: &str) {
    if let Some(logger) = global_logger() {
        logger.debug(component, message).await;
    }
}

#[cfg(feature = "tauri-plugin")]
pub async fn log_info(component: &str, message: &str) {
    if let Some(logger) = global_logger() {
        logger.info(component, message).await;
    }
}

#[cfg(feature = "tauri-plugin")]
pub async fn log_warning(component: &str, message: &str) {
    if let Some(logger) = global_logger() {
        logger.warning(component, message).await;
    }
}

#[cfg(feature = "tauri-plugin")]
pub async fn log_error(component: &str, message: &str, error: Option<String>) {
    if let Some(logger) = global_logger() {
        logger.error(component, message, error).await;
    }
}

#[cfg(feature = "tauri-plugin")]
pub async fn log_critical(component: &str, message: &str, error: Option<String>) {
    if let Some(logger) = global_logger() {
        logger.critical(component, message, error).await;
    }
}

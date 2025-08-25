/*!
 * IPC Logging
 * 
 * Provides logging functionality for the IPC system
 */

use std::fmt;
use crate::ipc::config::IPCConfig;

/// Log levels
#[derive(Debug, Clone, Copy, PartialEq, PartialOrd)]
pub enum LogLevel {
    Error,
    Warn,
    Info,
    Debug,
    Trace,
}

impl fmt::Display for LogLevel {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            LogLevel::Error => write!(f, "ERROR"),
            LogLevel::Warn => write!(f, "WARN"),
            LogLevel::Info => write!(f, "INFO"),
            LogLevel::Debug => write!(f, "DEBUG"),
            LogLevel::Trace => write!(f, "TRACE"),
        }
    }
}

/// Logger for IPC operations
pub struct IPCLogger {
    config: IPCConfig,
}

impl IPCLogger {
    /// Create new logger
    pub fn new(config: IPCConfig) -> Self {
        Self { config }
    }

    /// Log message with level
    pub fn log(&self, level: LogLevel, message: &str) {
        if !self.should_log(level) {
            return;
        }

        let timestamp = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S%.3f");
        let level_str = level.to_string();
        
        println!("[{}] [{}] {}", timestamp, level_str, message);
    }

    /// Log error message
    pub fn error(&self, message: &str) {
        self.log(LogLevel::Error, message);
    }

    /// Log warning message
    pub fn warn(&self, message: &str) {
        self.log(LogLevel::Warn, message);
    }

    /// Log info message
    pub fn info(&self, message: &str) {
        self.log(LogLevel::Info, message);
    }

    /// Log debug message
    pub fn debug(&self, message: &str) {
        self.log(LogLevel::Debug, message);
    }

    /// Log trace message
    pub fn trace(&self, message: &str) {
        self.log(LogLevel::Trace, message);
    }

    /// Check if level should be logged
    fn should_log(&self, level: LogLevel) -> bool {
        if self.config.debug_logging {
            return true;
        }
        
        level <= LogLevel::Info
    }
}

use once_cell::sync::OnceCell;

/// Global logger instance
static LOGGER: OnceCell<IPCLogger> = OnceCell::new();

/// Initialize global logger
pub fn init_logger(config: IPCConfig) {
    let _ = LOGGER.set(IPCLogger::new(config));
}

/// Get global logger reference
pub fn get_logger() -> Option<&'static IPCLogger> {
    LOGGER.get()
}

/// Log message using global logger
pub fn log(level: LogLevel, message: &str) {
    if let Some(logger) = get_logger() {
        logger.log(level, message);
    }
}

/// Log error using global logger
pub fn error(message: &str) {
    log(LogLevel::Error, message);
}

/// Log warning using global logger
pub fn warn(message: &str) {
    log(LogLevel::Warn, message);
}

/// Log info using global logger
pub fn info(message: &str) {
    log(LogLevel::Info, message);
}

/// Log debug using global logger
pub fn debug(message: &str) {
    log(LogLevel::Debug, message);
}

/// Log trace using global logger
pub fn trace(message: &str) {
    log(LogLevel::Trace, message);
}

/*!
 * IPC Error Handling
 * 
 * Defines error types and error handling for the IPC system
 */

use std::fmt;
use std::error::Error;

/// IPC Error types
#[derive(Debug)]
pub enum IPCError {
    /// Connection error
    Connection(String),
    
    /// Message serialization error
    Serialization(String),
    
    /// Message deserialization error
    Deserialization(String),
    
    /// Handler not found error
    HandlerNotFound(String),
    
    /// Client not found error
    ClientNotFound(String),
    
    /// Platform-specific error
    Platform(String),
    
    /// Configuration error
    Configuration(String),
    
    /// Internal error
    Internal(String),
}

impl fmt::Display for IPCError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            IPCError::Connection(msg) => write!(f, "Connection error: {}", msg),
            IPCError::Serialization(msg) => write!(f, "Serialization error: {}", msg),
            IPCError::Deserialization(msg) => write!(f, "Deserialization error: {}", msg),
            IPCError::HandlerNotFound(msg) => write!(f, "Handler not found: {}", msg),
            IPCError::ClientNotFound(msg) => write!(f, "Client not found: {}", msg),
            IPCError::Platform(msg) => write!(f, "Platform error: {}", msg),
            IPCError::Configuration(msg) => write!(f, "Configuration error: {}", msg),
            IPCError::Internal(msg) => write!(f, "Internal error: {}", msg),
        }
    }
}

impl Error for IPCError {}

impl From<std::io::Error> for IPCError {
    fn from(err: std::io::Error) -> Self {
        IPCError::Connection(err.to_string())
    }
}

impl From<serde_json::Error> for IPCError {
    fn from(err: serde_json::Error) -> Self {
        IPCError::Serialization(err.to_string())
    }
}

impl From<String> for IPCError {
    fn from(err: String) -> Self {
        IPCError::Internal(err)
    }
}

impl From<&str> for IPCError {
    fn from(err: &str) -> Self {
        IPCError::Internal(err.to_string())
    }
}

/// Result type for IPC operations
pub type IPCResult<T> = Result<T, IPCError>;

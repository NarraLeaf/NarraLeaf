/*!
 * IPC Types and Enums
 * 
 * Contains all shared types used across the IPC system
 */

use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use serde_json::Value;

/// Message handler trait for processing different message types
pub trait MessageHandler {
    fn handle_message(&self, message: &crate::communication::SidecarMessage) -> Result<Option<crate::communication::SidecarMessage>, String>;
}

/// Client connection information
pub struct ClientConnection {
    pub id: String,
    pub last_seen: std::time::Instant,
    pub platform_stream: PlatformStream,
}

/// Platform-specific stream wrapper
pub enum PlatformStream {
    #[cfg(target_os = "windows")]
    NamedPipe(tokio::net::windows::named_pipe::NamedPipeServer),
    #[cfg(not(target_os = "windows"))]
    Unix(tokio::net::UnixStream),
}

/// Platform-specific listener wrapper
pub enum PlatformListener {
    #[cfg(target_os = "windows")]
    NamedPipe(tokio::net::windows::named_pipe::NamedPipeServer),
    #[cfg(not(target_os = "windows"))]
    Unix(tokio::net::UnixListener),
}

/// Server state management
pub struct ServerState {
    pub clients: Arc<RwLock<HashMap<String, ClientConnection>>>,
    pub message_handlers: Arc<RwLock<HashMap<String, Box<dyn MessageHandler + Send + Sync>>>>,
    pub is_running: Arc<RwLock<bool>>,
}

impl ServerState {
    pub fn new() -> Self {
        Self {
            clients: Arc::new(RwLock::new(HashMap::new())),
            message_handlers: Arc::new(RwLock::new(HashMap::new())),
            is_running: Arc::new(RwLock::new(false)),
        }
    }
}

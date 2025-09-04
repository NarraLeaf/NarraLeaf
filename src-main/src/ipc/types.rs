/*!
 * IPC Types and Enums
 * 
 * Contains all shared types used across the IPC system
 */

use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use tokio::sync::oneshot;
use tokio::sync::Mutex;




/// Client connection information
#[derive(Debug)]
pub struct ClientConnection {
    pub id: String,
    pub last_seen: std::time::Instant,
    pub platform_stream: Arc<Mutex<PlatformStream>>,
}

/// Platform-specific stream wrapper
#[derive(Debug)]
pub enum PlatformStream {
    #[cfg(target_os = "windows")]
    NamedPipe(tokio::net::windows::named_pipe::NamedPipeServer),
    #[cfg(not(target_os = "windows"))]
    Unix(tokio::net::UnixStream),
}

/// Platform-specific listener wrapper
#[derive(Debug)]
pub enum PlatformListener {
    #[cfg(target_os = "windows")]
    NamedPipe(String), // Pipe name for Windows
    #[cfg(not(target_os = "windows"))]
    Unix(tokio::net::UnixListener),
}

/// Pending request with response channel
pub type PendingRequest = oneshot::Sender<crate::communication::SidecarMessage>;

/// Server state management
pub struct ServerState {
    pub clients: Arc<RwLock<HashMap<String, ClientConnection>>>,
    pub is_running: Arc<RwLock<bool>>,
    pub pending_requests: Arc<RwLock<HashMap<String, PendingRequest>>>,
    pub app_handle: Option<tauri::AppHandle>,
}

impl ServerState {
    pub fn new() -> Self {
        Self {
            clients: Arc::new(RwLock::new(HashMap::new())),
            is_running: Arc::new(RwLock::new(false)),
            pending_requests: Arc::new(RwLock::new(HashMap::new())),
            app_handle: None,
        }
    }

    pub fn with_app_handle(app_handle: tauri::AppHandle) -> Self {
        Self {
            clients: Arc::new(RwLock::new(HashMap::new())),
            is_running: Arc::new(RwLock::new(false)),
            pending_requests: Arc::new(RwLock::new(HashMap::new())),
            app_handle: Some(app_handle),
        }
    }
}

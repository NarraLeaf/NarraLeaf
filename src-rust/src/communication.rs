/*!
 * Communication Module for NodeJS Sidecar
 * 
 * This module provides the message definitions and basic communication structures
 * for communication between Rust Tauri host and NodeJS sidecar.
 * 
 * The actual IPC implementation is now handled by the dedicated ipc module.
 */

use serde_json::Value;
use serde::{Deserialize, Serialize};

/**
 * Communication Protocol Version
 */
pub const PROTOCOL_VERSION: u32 = 1;
pub const MAX_MESSAGE_SIZE: usize = 1024 * 1024; // 1MB

/**
 * Message types for communication
 */
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum SidecarMessage {
    /// Request from Rust to NodeJS
    Request {
        id: String,
        request_type: String,
        payload: Value,
        token: String,
    },
    /// Response from NodeJS to Rust
    Response {
        id: String,
        success: bool,
        data: Option<Value>,
        error: Option<String>,
    },
    /// Health check ping
    Ping {
        timestamp: u64,
    },
    /// Health check pong
    Pong {
        timestamp: u64,
    },
    /// Protocol version check
    VersionCheck {
        version: u32,
    },
    /// Protocol version response
    VersionResponse {
        version: u32,
        compatible: bool,
    },
    /// Connection established notification
    Connected {
        timestamp: u64,
    },
}

/**
 * Connection status
 */
#[derive(Debug, Clone, PartialEq)]
pub enum ConnectionStatus {
    Disconnected,
    Connecting,
    Connected,
    Failed,
}

/**
 * Simple message sender for basic communication needs
 */
pub struct MessageSender {
    ipc_server: crate::ipc::IPCServer,
}

impl MessageSender {
    /// Create a new message sender
    pub fn new(ipc_server: crate::ipc::IPCServer) -> Self {
        Self { ipc_server }
    }
    
    /// Send a message to all connected clients
    pub async fn broadcast(&self, message: &SidecarMessage) -> Result<(), String> {
        self.ipc_server.broadcast_message(message).await
    }
    
    /// Send a message to a specific client
    pub async fn send_to_client(&self, client_id: &str, message: &SidecarMessage) -> Result<(), String> {
        self.ipc_server.send_to_client(client_id, message).await
    }
    
    /// Get current connection status
    pub async fn get_status(&self) -> ConnectionStatus {
        if self.ipc_server.is_running().await {
            ConnectionStatus::Connected
        } else {
            ConnectionStatus::Disconnected
        }
    }
}

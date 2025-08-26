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
    /// Request from Rust to NodeJS (narraleaf: operations)
    Request {
        id: String,
        request_type: String,
        payload: Value,
    },
    /// Response from NodeJS to Rust
    Response {
        id: String,
        success: bool,
        data: Option<Value>,
        error: Option<String>,
    },
    /// Request from NodeJS to Rust (tauri: operations)
    SidecarRequest {
        id: String,
        request_type: String,
        payload: Value,
        response_channel: String, // Channel for sidecar to receive response
    },
    /// Response from Rust to NodeJS (for tauri: operations)
    SidecarResponse {
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
    /// Initial response from sidecar with metadata
    InitialResponse {
        language: String,
        version: String,
        ipc_protocol_version: u32,
        capabilities: Vec<String>,
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



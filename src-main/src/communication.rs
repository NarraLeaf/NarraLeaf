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
    /// Service Request: Rust → Sidecar (narraleaf: and sidecar: operations)
    ServiceRequest {
        id: String,
        request_type: String,
        payload: Value,
    },
    /// Service Response: Sidecar → Rust (response to narraleaf: and sidecar: operations)
    ServiceResponse {
        id: String,
        success: bool,
        data: Option<Value>,
        error: Option<String>,
    },
    /// Runtime Request: Sidecar → Rust (tauri: operations)
    RuntimeRequest {
        id: String,
        request_type: String,
        payload: Value,
        response_channel: String, // Channel for sidecar to receive response
    },
    /// Runtime Response: Rust → Sidecar (response to tauri: operations)
    RuntimeResponse {
        id: String,
        success: bool,
        data: Option<Value>,
        error: Option<String>,
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



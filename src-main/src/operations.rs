/*!
 * Operations Module for NarraLeaf
 *
 * This module provides the core operation framework for NarraLeaf Tauri plugin.
 * It handles routing of operations between renderer (narraleaf:*) and sidecar (tauri:*).
 * Game logic is delegated to NodeJS sidecar, while Tauri operations remain local.
 */

use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::AppHandle;

/**
 * Generic operation result
 * This is shared between operations and tauri_handlers modules
 */
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct OperationResult {
    pub success: bool,
    pub message: Option<String>,
    pub data: Option<serde_json::Value>,
}

/**
 * Available operation types (Core Only)
 *
 * Note: Only operations defined in protocol.md are supported.
 * Tauri operations are handled by the dedicated tauri_handlers module.
 * This enum is kept for compatibility with core operations.
 */
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum OperationType {
    // Note: narraleaf:* operations are forwarded to sidecar
    // This enum is kept for type safety but operations are handled elsewhere
}

/**
 * Operation executor
 */
pub struct OperationExecutor;

impl OperationExecutor {
    /**
     * Execute an operation from IPC request
     *
     * This method only handles operations defined in protocol.md.
     * All narraleaf:* operations are forwarded to sidecar, tauri:* operations are handled by tauri_handlers.
     */
    pub async fn execute_from_ipc(
        request_type: &str,
        _payload: Value,
        app_handle: Option<&AppHandle>,
    ) -> OperationResult {
        // Route tauri operations to dedicated handler
        if request_type.starts_with("tauri:") {
            return crate::tauri_handlers::execute_tauri_operation(request_type, _payload, app_handle).await;
        }

        // All narraleaf:* operations should be forwarded to sidecar
        if request_type.starts_with("narraleaf:") {
            return OperationResult {
                success: false,
                message: Some(format!("Operation '{}' should be forwarded to sidecar", request_type)),
                data: None,
            };
        }

        // Unknown operation type
        OperationResult {
            success: false,
            message: Some(format!("Unknown or unsupported operation type: {}", request_type)),
            data: None,
        }
    }
}

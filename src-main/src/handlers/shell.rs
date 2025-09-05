/*!
 * Shell Operation Handlers
 *
 * Handles shell related Tauri operations including opening
 * files and URLs with the default system application.
 */

use serde_json::Value;
use crate::handler_types::*;
use crate::operations::OperationResult;

/**
 * Shell Operation Helper Functions
 */
pub struct ShellOperations;

impl ShellOperations {
    /**
     * Helper function to create success OperationResult
     */
    fn create_success_result(message: String, data: Option<Value>) -> OperationResult {
        OperationResult {
            success: true,
            message: Some(message),
            data,
        }
    }

    /**
     * Helper function to create error OperationResult
     */
    fn create_error_result(message: String, data: Option<Value>) -> OperationResult {
        OperationResult {
            success: false,
            message: Some(message),
            data,
        }
    }

    /**
     * Execute a shell open operation
     */
    pub async fn shell_open(
        payload: ShellOpenPayload,
        _app_handle: Option<&tauri::AppHandle>,
    ) -> OperationResult {
        use std::process::Command;

        match Command::new(if cfg!(target_os = "windows") {
            "cmd"
        } else if cfg!(target_os = "macos") {
            "open"
        } else {
            "xdg-open"
        })
        .arg(if cfg!(target_os = "windows") {
            "/c"
        } else {
            ""
        })
        .arg(if cfg!(target_os = "windows") {
            "start"
        } else {
            ""
        })
        .arg(&payload.path)
        .spawn()
        {
            Ok(_) => Self::create_success_result(format!("Opened path: {}", payload.path), None),
            Err(e) => Self::create_error_result(
                format!("Failed to open path '{}': {}", payload.path, e),
                None,
            ),
        }
    }
}

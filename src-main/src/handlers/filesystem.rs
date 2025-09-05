/*!
 * File System Operation Handlers
 *
 * Handles file system related Tauri operations including reading,
 * writing, and directory management.
 */

use serde_json::Value;
use crate::handler_types::*;
use crate::operations::OperationResult;

/**
 * File System Operation Helper Functions
 */
pub struct FileSystemOperations;

impl FileSystemOperations {
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
     * Execute a file system read text file operation
     */
    pub async fn read_text_file(
        payload: FsReadTextFilePayload,
        _app_handle: Option<&tauri::AppHandle>,
    ) -> OperationResult {
        use std::fs;

        match fs::read_to_string(&payload.path) {
            Ok(contents) => OperationResult {
                success: true,
                message: Some(format!("File '{}' read successfully", payload.path)),
                data: Some(serde_json::json!(contents)),
            },
            Err(e) => OperationResult {
                success: false,
                message: Some(format!("Failed to read file '{}': {}", payload.path, e)),
                data: None,
            },
        }
    }

    /**
     * Execute a file system write text file operation
     */
    pub async fn write_text_file(
        payload: FsWriteTextFilePayload,
        _app_handle: Option<&tauri::AppHandle>,
    ) -> OperationResult {
        use std::fs;

        match fs::write(&payload.path, &payload.contents) {
            Ok(_) => OperationResult {
                success: true,
                message: Some(format!("File '{}' written successfully", payload.path)),
                data: None,
            },
            Err(e) => OperationResult {
                success: false,
                message: Some(format!("Failed to write file '{}': {}", payload.path, e)),
                data: None,
            },
        }
    }

    /**
     * Execute a file system exists operation
     */
    pub async fn exists_file(
        payload: FsExistsPayload,
        _app_handle: Option<&tauri::AppHandle>,
    ) -> OperationResult {
        use std::path::Path;

        let exists = Path::new(&payload.path).exists();
        OperationResult {
            success: true,
            message: Some(format!("Path '{}' existence checked", payload.path)),
            data: Some(serde_json::json!(exists)),
        }
    }

    /**
     * Execute a file system mkdir operation
     */
    pub async fn mkdir_file(
        payload: FsMkdirPayload,
        _app_handle: Option<&tauri::AppHandle>,
    ) -> OperationResult {
        use std::fs;

        let recursive = payload
            .options
            .as_ref()
            .and_then(|o| o.recursive)
            .unwrap_or(false);

        let result = if recursive {
            fs::create_dir_all(&payload.path)
        } else {
            fs::create_dir(&payload.path)
        };

        match result {
            Ok(_) => OperationResult {
                success: true,
                message: Some(format!("Directory '{}' created successfully", payload.path)),
                data: None,
            },
            Err(e) => OperationResult {
                success: false,
                message: Some(format!(
                    "Failed to create directory '{}': {}",
                    payload.path, e
                )),
                data: None,
            },
        }
    }
}

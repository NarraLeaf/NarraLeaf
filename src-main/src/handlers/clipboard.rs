/*!
 * Clipboard Operation Handlers
 *
 * Handles clipboard related Tauri operations including reading
 * and writing text to the system clipboard.
 */

use serde_json::Value;
use crate::handler_types::*;
use crate::operations::OperationResult;

/**
 * Clipboard Operation Helper Functions
 */
pub struct ClipboardOperations;

impl ClipboardOperations {
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
     * Execute a clipboard write text operation
     */
    pub async fn write_clipboard_text(
        payload: ClipboardWriteTextPayload,
        _app_handle: Option<&tauri::AppHandle>,
    ) -> OperationResult {
        use clipboard::{ClipboardProvider, windows_clipboard::WindowsClipboardContext};

        match WindowsClipboardContext::new() {
            Ok(mut clipboard) => match clipboard.set_contents(payload.text.clone()) {
                Ok(_) => Self::create_success_result(
                    format!("Text '{}' written to clipboard successfully", payload.text),
                    None,
                ),
                Err(e) => Self::create_error_result(
                    format!("Failed to write text to clipboard: {}", e),
                    None,
                ),
            },
            Err(e) => Self::create_error_result(format!("Failed to access clipboard: {}", e), None),
        }
    }

    /**
     * Execute a clipboard read text operation
     */
    pub async fn read_clipboard_text(
        _payload: Value,
        _app_handle: Option<&tauri::AppHandle>,
    ) -> OperationResult {
        use clipboard::{ClipboardProvider, windows_clipboard::WindowsClipboardContext};

        match WindowsClipboardContext::new() {
            Ok(mut clipboard) => match clipboard.get_contents() {
                Ok(text) => Self::create_success_result(
                    "Text read from clipboard successfully".to_string(),
                    Some(serde_json::json!(text)),
                ),
                Err(e) => Self::create_error_result(
                    format!("Failed to read text from clipboard: {}", e),
                    None,
                ),
            },
            Err(e) => Self::create_error_result(format!("Failed to access clipboard: {}", e), None),
        }
    }
}

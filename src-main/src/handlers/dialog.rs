/*!
 * Dialog Operation Handlers
 *
 * Handles dialog related Tauri operations including file dialogs,
 * message dialogs, and confirmation dialogs.
 */

use serde_json::Value;
use crate::handler_types::*;
use crate::operations::OperationResult;

/**
 * Dialog Operation Helper Functions
 */
pub struct DialogOperations;

impl DialogOperations {
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
     * Execute a dialog open operation
     */
    pub async fn open_dialog(
        payload: DialogOpenPayload,
        _app_handle: Option<&tauri::AppHandle>,
    ) -> OperationResult {
        let mut dialog = rfd::FileDialog::new();

        // Set default path if provided
        if let Some(options) = &payload.options {
            if let Some(default_path) = &options.default_path {
                dialog = dialog.set_directory(default_path);
            }

            // Set filters if provided
            if let Some(filters) = &options.filters {
                for filter in filters {
                    let extensions: Vec<&str> =
                        filter.extensions.iter().map(|s| s.as_str()).collect();
                    dialog = dialog.add_filter(&filter.name, &extensions);
                }
            }

            // Set dialog properties
            if let Some(multiple) = options.multiple {
                if multiple {
                    // For multiple selection, we'll use pick_files
                    match dialog.pick_files() {
                        Some(paths) => {
                            let path_strings: Vec<String> = paths
                                .iter()
                                .map(|p| p.to_string_lossy().to_string())
                                .collect();
                            return Self::create_success_result(
                                format!("Selected {} files", path_strings.len()),
                                Some(serde_json::json!(path_strings)),
                            );
                        }
                        None => {
                            return Self::create_success_result(
                                "No files selected".to_string(),
                                Some(serde_json::json!(null)),
                            );
                        }
                    }
                }
            }

            if let Some(directory) = options.directory {
                if directory {
                    // Directory selection
                    match dialog.pick_folder() {
                        Some(path) => {
                            return Self::create_success_result(
                                format!("Selected directory: {}", path.display()),
                                Some(serde_json::json!(path.to_string_lossy().to_string())),
                            );
                        }
                        None => {
                            return Self::create_success_result(
                                "No directory selected".to_string(),
                                Some(serde_json::json!(null)),
                            );
                        }
                    }
                }
            }
        }

        // Single file selection
        match dialog.pick_file() {
            Some(path) => Self::create_success_result(
                format!("Selected file: {}", path.display()),
                Some(serde_json::json!(path.to_string_lossy().to_string())),
            ),
            None => Self::create_success_result(
                "No file selected".to_string(),
                Some(serde_json::json!(null)),
            ),
        }
    }

    /**
     * Execute a dialog save operation
     */
    pub async fn save_dialog(
        payload: DialogSavePayload,
        _app_handle: Option<&tauri::AppHandle>,
    ) -> OperationResult {
        let mut dialog = rfd::FileDialog::new();

        // Set default path if provided
        if let Some(options) = &payload.options {
            if let Some(default_path) = &options.default_path {
                dialog = dialog.set_directory(default_path);
            }

            // Set filters if provided
            if let Some(filters) = &options.filters {
                for filter in filters {
                    let extensions: Vec<&str> =
                        filter.extensions.iter().map(|s| s.as_str()).collect();
                    dialog = dialog.add_filter(&filter.name, &extensions);
                }
            }
        }

        // Show save dialog
        match dialog.save_file() {
            Some(path) => Self::create_success_result(
                format!("File will be saved as: {}", path.display()),
                Some(serde_json::json!(path.to_string_lossy().to_string())),
            ),
            None => Self::create_success_result(
                "Save cancelled by user".to_string(),
                Some(serde_json::json!(null)),
            ),
        }
    }

    /**
     * Execute a dialog message operation
     */
    pub async fn message_dialog(
        payload: DialogMessagePayload,
        _app_handle: Option<&tauri::AppHandle>,
    ) -> OperationResult {
        let mut dialog = rfd::MessageDialog::new();

        // Set message
        dialog = dialog.set_description(&payload.message);

        // Set title if provided
        if let Some(options) = &payload.options {
            if let Some(title) = &options.title {
                dialog = dialog.set_title(title);
            }

            // Set dialog type based on kind
            if let Some(kind) = &options.kind {
                dialog = match kind.as_str() {
                    "warning" => dialog.set_level(rfd::MessageLevel::Warning),
                    "error" => dialog.set_level(rfd::MessageLevel::Error),
                    _ => dialog.set_level(rfd::MessageLevel::Info),
                };
            }
        }

        // Show the dialog
        dialog.show();

        Self::create_success_result(format!("Message dialog shown: {}", payload.message), None)
    }

    /**
     * Execute a dialog ask operation
     */
    pub async fn ask_dialog(
        payload: DialogAskPayload,
        _app_handle: Option<&tauri::AppHandle>,
    ) -> OperationResult {
        let mut dialog = rfd::MessageDialog::new();

        // Set message
        dialog = dialog.set_description(&payload.message);

        // Set title if provided
        if let Some(options) = &payload.options {
            if let Some(title) = &options.title {
                dialog = dialog.set_title(title);
            }

            // Set dialog type based on kind
            if let Some(kind) = &options.kind {
                dialog = match kind.as_str() {
                    "warning" => dialog.set_level(rfd::MessageLevel::Warning),
                    "error" => dialog.set_level(rfd::MessageLevel::Error),
                    _ => dialog.set_level(rfd::MessageLevel::Info),
                };
            }
        }

        // Add buttons
        dialog = dialog.set_buttons(rfd::MessageButtons::YesNo);

        // Show the dialog and get response
        let result = dialog.show();

        Self::create_success_result(
            format!("Ask dialog shown: {}", payload.message),
            Some(serde_json::json!(result == rfd::MessageDialogResult::Yes)),
        )
    }
}

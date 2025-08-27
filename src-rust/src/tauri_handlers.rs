/*!
 * Tauri Operation Handlers
 *
 * This module provides dedicated handlers for Tauri system operations.
 * It handles window management and application lifecycle operations
 * requested from the NodeJS sidecar via the tauri:* namespace.
 */

use serde::{Deserialize, Serialize};
use serde_json::Value;

#[cfg(feature = "tauri-plugin")]
use tauri::{AppHandle, Manager};

/**
 * Window creation payload
 */
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WindowCreatePayload {
    pub label: String,
    pub title: String,
    pub width: f64,
    pub height: f64,
    pub x: Option<f64>,
    pub y: Option<f64>,
    pub center: Option<bool>,
    pub decorations: Option<bool>,
    pub always_on_top: Option<bool>,
    pub skip_taskbar: Option<bool>,
}

/**
 * Window maximization payload
 */
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WindowMaximizePayload {
    pub window_label: Option<String>,
}

/**
 * Window minimization payload
 */
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WindowMinimizePayload {
    pub window_label: Option<String>,
}

/**
 * Window close payload
 */
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WindowClosePayload {
    pub window_label: Option<String>,
}

// Re-export OperationResult from operations module
pub use crate::operations::OperationResult;

/**
 * Tauri Operation Executor
 *
 * Handles all tauri:* namespace operations requested from the sidecar
 */
pub struct TauriOperationExecutor;

impl TauriOperationExecutor {
    /**
     * Execute a window creation operation
     */
    #[cfg(feature = "tauri-plugin")]
    pub async fn create_window(
        payload: WindowCreatePayload,
        app_handle: Option<&AppHandle>,
    ) -> OperationResult {
        use tauri::WindowBuilder;

        if let Some(app) = app_handle {
            let mut builder = WindowBuilder::new(app, payload.label)
                .title(payload.title)
                .inner_size(payload.width, payload.height);

            if let Some(x) = payload.x {
                if let Some(y) = payload.y {
                    builder = builder.position(x, y);
                }
            }

            if let Some(center) = payload.center {
                if center {
                    builder = builder.center();
                }
            }

            if let Some(decorations) = payload.decorations {
                builder = builder.decorations(decorations);
            }

            if let Some(always_on_top) = payload.always_on_top {
                builder = builder.always_on_top(always_on_top);
            }

            if let Some(skip_taskbar) = payload.skip_taskbar {
                builder = builder.skip_taskbar(skip_taskbar);
            }

            match builder.build() {
                Ok(_) => OperationResult {
                    success: true,
                    message: Some("Window created successfully".to_string()),
                    data: None,
                },
                Err(e) => OperationResult {
                    success: false,
                    message: Some(format!("Failed to create window: {}", e)),
                    data: None,
                },
            }
        } else {
            OperationResult {
                success: false,
                message: Some("App handle not available".to_string()),
                data: None,
            }
        }
    }

    /**
     * Execute a window maximization operation
     */
    #[cfg(feature = "tauri-plugin")]
    pub async fn maximize_window(
        payload: WindowMaximizePayload,
        app_handle: Option<&AppHandle>,
    ) -> OperationResult {
        if let Some(app) = app_handle {
            let window = if let Some(label) = payload.window_label {
                app.get_webview_window(&label)
            } else {
                None
            };

            if let Some(window) = window {
                match window.maximize() {
                    Ok(_) => OperationResult {
                        success: true,
                        message: Some("Window maximized successfully".to_string()),
                        data: None,
                    },
                    Err(e) => OperationResult {
                        success: false,
                        message: Some(format!("Failed to maximize window: {}", e)),
                        data: None,
                    },
                }
            } else {
                OperationResult {
                    success: false,
                    message: Some("Window not found".to_string()),
                    data: None,
                }
            }
        } else {
            OperationResult {
                success: false,
                message: Some("App handle not available".to_string()),
                data: None,
            }
        }
    }

    /**
     * Execute a window minimization operation
     */
    #[cfg(feature = "tauri-plugin")]
    pub async fn minimize_window(
        payload: WindowMinimizePayload,
        app_handle: Option<&AppHandle>,
    ) -> OperationResult {
        if let Some(app) = app_handle {
            let window = if let Some(label) = payload.window_label {
                app.get_webview_window(&label)
            } else {
                None
            };

            if let Some(window) = window {
                match window.minimize() {
                    Ok(_) => OperationResult {
                        success: true,
                        message: Some("Window minimized successfully".to_string()),
                        data: None,
                    },
                    Err(e) => OperationResult {
                        success: false,
                        message: Some(format!("Failed to minimize window: {}", e)),
                        data: None,
                    },
                }
            } else {
                OperationResult {
                    success: false,
                    message: Some("Window not found".to_string()),
                    data: None,
                }
            }
        } else {
            OperationResult {
                success: false,
                message: Some("App handle not available".to_string()),
                data: None,
            }
        }
    }

    /**
     * Execute a window close operation
     */
    #[cfg(feature = "tauri-plugin")]
    pub async fn close_window(
        payload: WindowClosePayload,
        app_handle: Option<&AppHandle>,
    ) -> OperationResult {
        if let Some(app) = app_handle {
            let window = if let Some(label) = payload.window_label {
                app.get_webview_window(&label)
            } else {
                None
            };

            if let Some(window) = window {
                match window.close() {
                    Ok(_) => OperationResult {
                        success: true,
                        message: Some("Window closed successfully".to_string()),
                        data: None,
                    },
                    Err(e) => OperationResult {
                        success: false,
                        message: Some(format!("Failed to close window: {}", e)),
                        data: None,
                    },
                }
            } else {
                OperationResult {
                    success: false,
                    message: Some("Window not found".to_string()),
                    data: None,
                }
            }
        } else {
            OperationResult {
                success: false,
                message: Some("App handle not available".to_string()),
                data: None,
            }
        }
    }

    /**
     * Execute an application quit operation
     */
    #[cfg(feature = "tauri-plugin")]
    pub async fn quit_app(app_handle: Option<&AppHandle>) -> OperationResult {
        if let Some(app) = app_handle {
            app.exit(0);
            OperationResult {
                success: true,
                message: Some("Application quit successfully".to_string()),
                data: None,
            }
        } else {
            OperationResult {
                success: false,
                message: Some("App handle not available".to_string()),
                data: None,
            }
        }
    }


}

/**
 * Execute a tauri operation from IPC request
 *
 * This function provides a convenient interface for executing tauri operations
 * from IPC messages received from the sidecar.
 */
#[cfg(feature = "tauri-plugin")]
pub async fn execute_tauri_operation(
    request_type: &str,
    payload: Value,
    app_handle: Option<&AppHandle>,
) -> OperationResult {
    match request_type {
        "tauri:window.create" => {
            match serde_json::from_value::<WindowCreatePayload>(payload) {
                Ok(window_payload) => TauriOperationExecutor::create_window(window_payload, app_handle).await,
                Err(e) => OperationResult {
                    success: false,
                    message: Some(format!("Invalid payload for tauri:window.create: {}", e)),
                    data: None,
                },
            }
        }
        "tauri:window.maximize" => {
            match serde_json::from_value::<WindowMaximizePayload>(payload) {
                Ok(window_payload) => TauriOperationExecutor::maximize_window(window_payload, app_handle).await,
                Err(_) => TauriOperationExecutor::maximize_window(WindowMaximizePayload {
                    window_label: None,
                }, app_handle).await,
            }
        }
        "tauri:window.minimize" => {
            match serde_json::from_value::<WindowMinimizePayload>(payload) {
                Ok(window_payload) => TauriOperationExecutor::minimize_window(window_payload, app_handle).await,
                Err(_) => TauriOperationExecutor::minimize_window(WindowMinimizePayload {
                    window_label: None,
                }, app_handle).await,
            }
        }
        "tauri:window.close" => {
            match serde_json::from_value::<WindowClosePayload>(payload) {
                Ok(window_payload) => TauriOperationExecutor::close_window(window_payload, app_handle).await,
                Err(_) => TauriOperationExecutor::close_window(WindowClosePayload {
                    window_label: None,
                }, app_handle).await,
            }
        }
        "tauri:app.quit" => TauriOperationExecutor::quit_app(app_handle).await,
        _ => OperationResult {
            success: false,
            message: Some(format!("Unknown tauri operation: {}", request_type)),
            data: None,
        },
    }
}

/**
 * Non-tauri-plugin version for testing/development
 */
#[cfg(not(feature = "tauri-plugin"))]
pub async fn execute_tauri_operation(
    request_type: &str,
    _payload: Value,
    _app_handle: Option<&AppHandle>,
) -> OperationResult {
    OperationResult {
        success: false,
        message: Some(format!("Tauri operation '{}' not available (tauri-plugin feature disabled)", request_type)),
        data: None,
    }
}

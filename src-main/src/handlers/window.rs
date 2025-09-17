/*!
 * Window Operation Handlers
 *
 * Handles all window-related Tauri operations including creation,
 * manipulation, and lifecycle management.
 */

use serde_json::Value;
use tauri::{AppHandle, Manager, Url};
use crate::handler_types::*;
use crate::operations::OperationResult;

/**
 * Trait for payloads that provide window labels
 */
trait WindowLabelProvider {
    fn get_label(&self) -> &Option<String>;
}

// Implement WindowLabelProvider for all window-related payloads
impl WindowLabelProvider for WindowMaximizePayload {
    fn get_label(&self) -> &Option<String> {
        &self.label
    }
}

impl WindowLabelProvider for WindowMinimizePayload {
    fn get_label(&self) -> &Option<String> {
        &self.label
    }
}

impl WindowLabelProvider for WindowClosePayload {
    fn get_label(&self) -> &Option<String> {
        &self.label
    }
}

impl WindowLabelProvider for WindowShowPayload {
    fn get_label(&self) -> &Option<String> {
        &self.label
    }
}

impl WindowLabelProvider for WindowHidePayload {
    fn get_label(&self) -> &Option<String> {
        &self.label
    }
}

impl WindowLabelProvider for WindowFocusPayload {
    fn get_label(&self) -> &Option<String> {
        &self.label
    }
}

impl WindowLabelProvider for WindowPositionPayload {
    fn get_label(&self) -> &Option<String> {
        &self.label
    }
}

impl WindowLabelProvider for WindowSizePayload {
    fn get_label(&self) -> &Option<String> {
        &self.label
    }
}

impl WindowLabelProvider for WindowTitlePayload {
    fn get_label(&self) -> &Option<String> {
        &self.label
    }
}

impl WindowLabelProvider for WindowCenterPayload {
    fn get_label(&self) -> &Option<String> {
        &self.label
    }
}

impl WindowLabelProvider for WindowDecorationsPayload {
    fn get_label(&self) -> &Option<String> {
        &self.label
    }
}

impl WindowLabelProvider for WindowResizablePayload {
    fn get_label(&self) -> &Option<String> {
        &self.label
    }
}

impl WindowLabelProvider for WindowClosablePayload {
    fn get_label(&self) -> &Option<String> {
        &self.label
    }
}

impl WindowLabelProvider for WindowMinimizablePayload {
    fn get_label(&self) -> &Option<String> {
        &self.label
    }
}

impl WindowLabelProvider for WindowMaximizablePayload {
    fn get_label(&self) -> &Option<String> {
        &self.label
    }
}

impl WindowLabelProvider for WindowTransparentPayload {
    fn get_label(&self) -> &Option<String> {
        &self.label
    }
}

impl WindowLabelProvider for WindowFullscreenPayload {
    fn get_label(&self) -> &Option<String> {
        &self.label
    }
}

impl WindowLabelProvider for WindowUrlPayload {
    fn get_label(&self) -> &Option<String> {
        &self.label
    }
}

/**
 * Window Operation Helper Functions
 */
pub struct WindowOperations;

impl WindowOperations {
    /**
     * Helper function to get a window by label or return main window as default
     */
    fn get_window(app_handle: &AppHandle, label: &Option<String>) -> Option<tauri::WebviewWindow> {
        if let Some(label) = label {
            app_handle.get_webview_window(label)
        } else {
            None
        }
    }

    /**
     * Helper function to get window label or default to "main"
     */
    fn get_window_label(label: &Option<String>) -> String {
        label.as_deref().unwrap_or("main").to_string()
    }

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
     * Helper function to create app handle not available error
     */
    fn create_app_handle_error() -> OperationResult {
        Self::create_error_result("App handle not available".to_string(), None)
    }

    /**
     * Helper function to create window not found error
     */
    fn create_window_not_found_error(window_label: &str) -> OperationResult {
        Self::create_error_result(format!("Window '{}' not found", window_label), None)
    }

    /**
     * Helper function to execute window operation with common error handling
     */
    async fn execute_window_operation<F, Fut>(
        app_handle: Option<&AppHandle>,
        payload: &impl WindowLabelProvider,
        operation: F,
        operation_name: &str,
    ) -> OperationResult
    where
        F: FnOnce(tauri::WebviewWindow) -> Fut,
        Fut: std::future::Future<Output = Result<(), tauri::Error>>,
    {
        if let Some(app) = app_handle {
            let window_label = Self::get_window_label(&payload.get_label());
            if let Some(window) = Self::get_window(app, &payload.get_label()) {
                match operation(window).await {
                    Ok(_) => Self::create_success_result(
                        format!("Window '{}' {} successfully", window_label, operation_name),
                        None,
                    ),
                    Err(e) => Self::create_error_result(
                        format!(
                            "Failed to {} window '{}': {}",
                            operation_name, window_label, e
                        ),
                        None,
                    ),
                }
            } else {
                Self::create_window_not_found_error(&window_label)
            }
        } else {
            Self::create_app_handle_error()
        }
    }

    /**
     * Execute a window creation operation
     * 
     * NEW ARCHITECTURE: Window creation is no longer supported.
     * Only the main window managed by Tauri is allowed.
     */
    pub async fn create_window(
        _payload: WindowCreatePayload,
        _app_handle: Option<&AppHandle>,
    ) -> OperationResult {
        // NEW ARCHITECTURE: Window creation is not supported
        // Only the main window managed by Tauri is allowed
        Self::create_error_result(
            "Window creation is not supported in the new architecture. Only the main window managed by Tauri is allowed.".to_string(),
            None,
        )
    }

    /**
     * Execute a window maximization operation
     */
    pub async fn maximize_window(
        payload: WindowMaximizePayload,
        app_handle: Option<&AppHandle>,
    ) -> OperationResult {
        Self::execute_window_operation(
            app_handle,
            &payload,
            |window| async move { window.maximize() },
            "maximized",
        )
        .await
    }

    /**
     * Execute a window minimization operation
     */
    pub async fn minimize_window(
        payload: WindowMinimizePayload,
        app_handle: Option<&AppHandle>,
    ) -> OperationResult {
        Self::execute_window_operation(
            app_handle,
            &payload,
            |window| async move { window.minimize() },
            "minimized",
        )
        .await
    }

    /**
     * Execute a window close operation
     */
    pub async fn close_window(
        payload: WindowClosePayload,
        app_handle: Option<&AppHandle>,
    ) -> OperationResult {
        Self::execute_window_operation(
            app_handle,
            &payload,
            |window| async move { window.close() },
            "closed",
        )
        .await
    }

    /**
     * Execute a window show operation
     */
    pub async fn show_window(
        payload: WindowShowPayload,
        app_handle: Option<&AppHandle>,
    ) -> OperationResult {
        Self::execute_window_operation(
            app_handle,
            &payload,
            |window| async move { window.show() },
            "shown",
        )
        .await
    }

    /**
     * Execute a window hide operation
     */
    pub async fn hide_window(
        payload: WindowHidePayload,
        app_handle: Option<&AppHandle>,
    ) -> OperationResult {
        Self::execute_window_operation(
            app_handle,
            &payload,
            |window| async move { window.hide() },
            "hidden",
        )
        .await
    }

    /**
     * Execute a window focus operation
     */
    pub async fn focus_window(
        payload: WindowFocusPayload,
        app_handle: Option<&AppHandle>,
    ) -> OperationResult {
        Self::execute_window_operation(
            app_handle,
            &payload,
            |window| async move { window.set_focus() },
            "focused",
        )
        .await
    }

    /**
     * Execute a window position operation
     */
    pub async fn set_window_position(
        payload: WindowPositionPayload,
        app_handle: Option<&AppHandle>,
    ) -> OperationResult {
        if let Some(app) = app_handle {
            let window_label = Self::get_window_label(&payload.label);
            if let Some(window) = Self::get_window(app, &payload.label) {
                match window.set_position(tauri::Position::Physical(tauri::PhysicalPosition {
                    x: payload.x as i32,
                    y: payload.y as i32,
                })) {
                    Ok(_) => Self::create_success_result(
                        format!("Window '{}' position set successfully", window_label),
                        None,
                    ),
                    Err(e) => Self::create_error_result(
                        format!("Failed to set window '{}' position: {}", window_label, e),
                        None,
                    ),
                }
            } else {
                Self::create_window_not_found_error(&window_label)
            }
        } else {
            Self::create_app_handle_error()
        }
    }

    /**
     * Execute a window size operation
     */
    pub async fn set_window_size(
        payload: WindowSizePayload,
        app_handle: Option<&AppHandle>,
    ) -> OperationResult {
        if let Some(app) = app_handle {
            let window_label = Self::get_window_label(&payload.label);
            if let Some(window) = Self::get_window(app, &payload.label) {
                match window.set_size(tauri::Size::Physical(tauri::PhysicalSize {
                    width: payload.width as u32,
                    height: payload.height as u32,
                })) {
                    Ok(_) => Self::create_success_result(
                        format!("Window '{}' size set successfully", window_label),
                        None,
                    ),
                    Err(e) => Self::create_error_result(
                        format!("Failed to set window '{}' size: {}", window_label, e),
                        None,
                    ),
                }
            } else {
                Self::create_window_not_found_error(&window_label)
            }
        } else {
            Self::create_app_handle_error()
        }
    }

    /**
     * Execute a window title operation
     */
    pub async fn set_window_title(
        payload: WindowTitlePayload,
        app_handle: Option<&AppHandle>,
    ) -> OperationResult {
        if let Some(app) = app_handle {
            let window_label = Self::get_window_label(&payload.label);
            if let Some(window) = Self::get_window(app, &payload.label) {
                match window.set_title(&payload.title) {
                    Ok(_) => Self::create_success_result(
                        format!("Window '{}' title set successfully", window_label),
                        None,
                    ),
                    Err(e) => Self::create_error_result(
                        format!("Failed to set window '{}' title: {}", window_label, e),
                        None,
                    ),
                }
            } else {
                Self::create_window_not_found_error(&window_label)
            }
        } else {
            Self::create_app_handle_error()
        }
    }

    /**
     * Execute a window center operation
     */
    pub async fn center_window(
        payload: WindowCenterPayload,
        app_handle: Option<&AppHandle>,
    ) -> OperationResult {
        Self::execute_window_operation(
            app_handle,
            &payload,
            |window| async move { window.center() },
            "centered",
        )
        .await
    }

    /**
     * Execute a window decorations operation
     */
    pub async fn set_window_decorations(
        payload: WindowDecorationsPayload,
        app_handle: Option<&AppHandle>,
    ) -> OperationResult {
        if let Some(app) = app_handle {
            let window_label = Self::get_window_label(&payload.label);
            if let Some(window) = Self::get_window(app, &payload.label) {
                match window.set_decorations(payload.decorations) {
                    Ok(_) => Self::create_success_result(
                        format!("Window '{}' decorations set successfully", window_label),
                        None,
                    ),
                    Err(e) => Self::create_error_result(
                        format!("Failed to set window '{}' decorations: {}", window_label, e),
                        None,
                    ),
                }
            } else {
                Self::create_window_not_found_error(&window_label)
            }
        } else {
            Self::create_app_handle_error()
        }
    }

    /**
     * Execute a window resizable operation
     */
    pub async fn set_window_resizable(
        payload: WindowResizablePayload,
        app_handle: Option<&AppHandle>,
    ) -> OperationResult {
        if let Some(app) = app_handle {
            let window_label = Self::get_window_label(&payload.label);
            if let Some(window) = Self::get_window(app, &payload.label) {
                match window.set_resizable(payload.resizable) {
                    Ok(_) => Self::create_success_result(
                        format!("Window '{}' resizable set successfully", window_label),
                        None,
                    ),
                    Err(e) => Self::create_error_result(
                        format!("Failed to set window '{}' resizable: {}", window_label, e),
                        None,
                    ),
                }
            } else {
                Self::create_window_not_found_error(&window_label)
            }
        } else {
            Self::create_app_handle_error()
        }
    }

    /**
     * Execute a window closable operation
     */
    pub async fn set_window_closable(
        payload: WindowClosablePayload,
        app_handle: Option<&AppHandle>,
    ) -> OperationResult {
        if let Some(app) = app_handle {
            let window_label = Self::get_window_label(&payload.label);
            if let Some(window) = Self::get_window(app, &payload.label) {
                match window.set_closable(payload.closable) {
                    Ok(_) => Self::create_success_result(
                        format!("Window '{}' closable set successfully", window_label),
                        None,
                    ),
                    Err(e) => Self::create_error_result(
                        format!("Failed to set window '{}' closable: {}", window_label, e),
                        None,
                    ),
                }
            } else {
                Self::create_window_not_found_error(&window_label)
            }
        } else {
            Self::create_app_handle_error()
        }
    }

    /**
     * Execute a window minimizable operation
     */
    pub async fn set_window_minimizable(
        payload: WindowMinimizablePayload,
        app_handle: Option<&AppHandle>,
    ) -> OperationResult {
        if let Some(app) = app_handle {
            let window_label = Self::get_window_label(&payload.label);
            if let Some(window) = Self::get_window(app, &payload.label) {
                match window.set_minimizable(payload.minimizable) {
                    Ok(_) => Self::create_success_result(
                        format!("Window '{}' minimizable set successfully", window_label),
                        None,
                    ),
                    Err(e) => Self::create_error_result(
                        format!("Failed to set window '{}' minimizable: {}", window_label, e),
                        None,
                    ),
                }
            } else {
                Self::create_window_not_found_error(&window_label)
            }
        } else {
            Self::create_app_handle_error()
        }
    }

    /**
     * Execute a window maximizable operation
     */
    pub async fn set_window_maximizable(
        payload: WindowMaximizablePayload,
        app_handle: Option<&AppHandle>,
    ) -> OperationResult {
        if let Some(app) = app_handle {
            let window_label = Self::get_window_label(&payload.label);
            if let Some(window) = Self::get_window(app, &payload.label) {
                match window.set_maximizable(payload.maximizable) {
                    Ok(_) => Self::create_success_result(
                        format!("Window '{}' maximizable set successfully", window_label),
                        None,
                    ),
                    Err(e) => Self::create_error_result(
                        format!("Failed to set window '{}' maximizable: {}", window_label, e),
                        None,
                    ),
                }
            } else {
                Self::create_window_not_found_error(&window_label)
            }
        } else {
            Self::create_app_handle_error()
        }
    }

    /**
     * Execute a window transparent operation
     */
    pub async fn set_window_transparent(
        _payload: WindowTransparentPayload,
        _app_handle: Option<&AppHandle>,
    ) -> OperationResult {
        // Note: Tauri 2.0 doesn't support setting transparency after window creation
        // This property can only be set during window creation
        Self::create_error_result(
            "Window transparency cannot be changed after creation in Tauri 2.0".to_string(),
            None,
        )
    }

    /**
     * Execute a window fullscreen operation
     */
    pub async fn set_window_fullscreen(
        payload: WindowFullscreenPayload,
        app_handle: Option<&AppHandle>,
    ) -> OperationResult {
        if let Some(app) = app_handle {
            let window_label = Self::get_window_label(&payload.label);
            if let Some(window) = Self::get_window(app, &payload.label) {
                match window.set_fullscreen(payload.fullscreen) {
                    Ok(_) => Self::create_success_result(
                        format!("Window '{}' fullscreen set successfully", window_label),
                        None,
                    ),
                    Err(e) => Self::create_error_result(
                        format!("Failed to set window '{}' fullscreen: {}", window_label, e),
                        None,
                    ),
                }
            } else {
                Self::create_window_not_found_error(&window_label)
            }
        } else {
            Self::create_app_handle_error()
        }
    }

    /**
     * Execute a window URL operation
     */
    pub async fn set_window_url(
        payload: WindowUrlPayload,
        app_handle: Option<&AppHandle>,
    ) -> OperationResult {
        if let Some(app) = app_handle {
            let window_label = Self::get_window_label(&payload.label);
            if let Some(window) = Self::get_window(app, &payload.label) {
                // Try to parse as absolute URL first
                let initial_parse = Url::parse(&payload.url);
                // If parsing fails due to being relative, try to normalize into app://localhost/<path>
                let normalized_url = match initial_parse {
                    Ok(url) => Ok(url),
                    Err(_) => {
                        // Build absolute URL using app:// scheme by default
                        let mut path = payload.url.clone();
                        if !(path.starts_with("app://") || path.starts_with("tauri://")) {
                            if !path.starts_with('/') {
                                path = format!("/{}", path);
                            }
                            let candidate = format!("app://localhost{}", path);
                            match Url::parse(&candidate) {
                                Ok(url) => Ok(url),
                                Err(_) => {
                                    // Fallback to tauri://localhost
                                    let candidate = format!("tauri://localhost{}", path);
                                    Url::parse(&candidate)
                                }
                            }
                        } else {
                            // Already starts with a known scheme but failed to parse; return the error
                            Url::parse(&payload.url)
                        }
                    }
                };

                match normalized_url {
                    Ok(url) => {
                        // Print the final URL being navigated to
                        println!("Final URL being navigated to: {}", url);
                        
                        match window.navigate(url) {
                            Ok(_) => Self::create_success_result(
                                format!("Window '{}' URL set successfully to '{}'", window_label, payload.url),
                                None,
                            ),
                            Err(e) => Self::create_error_result(
                                format!("Failed to navigate window '{}' to '{}': {}", window_label, payload.url, e),
                                None,
                            ),
                        }
                    },
                    Err(e) => Self::create_error_result(
                        format!("Invalid URL '{}' for window '{}': {}", payload.url, window_label, e),
                        None,
                    ),
                }
            } else {
                Self::create_window_not_found_error(&window_label)
            }
        } else {
            Self::create_app_handle_error()
        }
    }
}

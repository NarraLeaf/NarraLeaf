/*!
 * Tauri Operation Handlers
 *
 * This module provides dedicated handlers for Tauri system operations.
 * It handles window management and application lifecycle operations
 * requested from the NodeJS sidecar via the tauri:* namespace.
 */

use clipboard::{ClipboardProvider, windows_clipboard::WindowsClipboardContext};
use serde_json::Value;
use tauri::{AppHandle, Manager, Url, WebviewUrl, WebviewWindowBuilder};
use serde_json::json;
use os_info;
use sys_locale;


pub use crate::handler_types::*;

// Re-export OperationResult from operations module
pub use crate::operations::OperationResult;

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
 * Tauri Operation Executor
 *
 * Handles all tauri:* namespace operations requested from the sidecar
 */
pub struct TauriOperationExecutor;

impl TauriOperationExecutor {
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
     * Helper function to create invalid payload error
     */
    fn create_invalid_payload_error(operation: &str, error: &serde_json::Error) -> OperationResult {
        Self::create_error_result(
            format!("Invalid payload for {}: {}", operation, error),
            None,
        )
    }

    /**
     * Helper function to safely deserialize payload with error handling
     */
    fn deserialize_payload<T: for<'de> serde::Deserialize<'de>>(
        payload: Value,
        operation: &str,
    ) -> Result<T, OperationResult> {
        match serde_json::from_value::<T>(payload) {
            Ok(deserialized) => Ok(deserialized),
            Err(e) => Err(Self::create_invalid_payload_error(operation, &e)),
        }
    }

    /**
     * Helper function to deserialize payload with fallback to default
     */
    fn deserialize_payload_or_default<T: for<'de> serde::Deserialize<'de> + Default>(
        payload: Value,
        _operation: &str,
    ) -> T {
        match serde_json::from_value::<T>(payload) {
            Ok(deserialized) => deserialized,
            Err(_) => T::default(),
        }
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
     */
pub async fn create_window(
    payload: WindowCreatePayload,
    app_handle: Option<&AppHandle>,
) -> OperationResult {
    if let Some(app) = app_handle {
        let label_clone = payload.label.clone();

        // Create a new WebviewWindow builder
        let mut builder = WebviewWindowBuilder::new(
            app,
            payload.label.clone(),
            // Default URL (can be overridden by navigate later)
            WebviewUrl::App("index.html".into()),
        )
        .title(payload.title)
        .inner_size(payload.width, payload.height)
        .visible(false); // Start hidden by default

        // Set window position if provided
        if let (Some(x), Some(y)) = (payload.x, payload.y) {
            builder = builder.position(x, y);
        }

        // Center window if requested
        if payload.center.unwrap_or(false) {
            builder = builder.center();
        }

        // Apply decorations (window frame, title bar, etc.)
        if let Some(decorations) = payload.decorations {
            builder = builder.decorations(decorations);
        }

        // Always-on-top behavior
        if let Some(always_on_top) = payload.always_on_top {
            builder = builder.always_on_top(always_on_top);
        }

        // Skip showing in the taskbar
        if let Some(skip_taskbar) = payload.skip_taskbar {
            builder = builder.skip_taskbar(skip_taskbar);
        }

        // Window resizable
        if let Some(resizable) = payload.resizable {
            builder = builder.resizable(resizable);
        }

        // Window closable
        if let Some(closable) = payload.closable {
            builder = builder.closable(closable);
        }

        // Window minimizable
        if let Some(minimizable) = payload.minimizable {
            builder = builder.minimizable(minimizable);
        }

        // Window maximizable
        if let Some(maximizable) = payload.maximizable {
            builder = builder.maximizable(maximizable);
        }

        // Window focus
        if payload.focus.unwrap_or(false) {
            builder = builder.focused(true);
        }

        // Transparent background
        if payload.transparent.unwrap_or(false) {
            builder = builder.transparent(true);
        }

        // Fullscreen mode
        if payload.fullscreen.unwrap_or(false) {
            builder = builder.fullscreen(true);
        }

        // Try to build the window
        match builder.build() {
            Ok(window) => {
                let window_label = label_clone.clone();

                // Attach close event listener
                window.on_window_event(move |event| {
                    if let tauri::WindowEvent::CloseRequested { .. } = event {
                        // Only log in debug mode to reduce noise
                        // println!("Window close requested for: {}", window_label);

                        let window_label_clone = window_label.clone();

                        // Fire sidecar notification asynchronously
                        tauri::async_runtime::spawn(async move {
                            if let Some(plugin_state) = crate::tauri::get_global_plugin_state() {
                                let sidecar_manager =
                                    plugin_state.sidecar_manager.lock().await;

                                let payload = serde_json::json!({
                                    "label": window_label_clone,
                                    "timestamp": std::time::SystemTime::now()
                                        .duration_since(std::time::UNIX_EPOCH)
                                        .unwrap_or_default()
                                        .as_millis()
                                });

                                if let Err(e) = sidecar_manager
                                    .send_sidecar_request("sidecar:window.on_close", payload)
                                    .await
                                {
                                    println!(
                                        "Failed to send sidecar notification: {}",
                                        e
                                    );
                                }
                            }
                        });
                    }
                });

                // Navigate to custom URL if provided
                if let Some(url_str) = &payload.url {
                    match Url::parse(url_str) {
                        Ok(url) => {
                            if let Err(e) = window.navigate(url) {
                                return OperationResult {
                                    success: false,
                                    message: Some(format!(
                                        "Failed to navigate window '{}' to '{}': {}",
                                        label_clone, url_str, e
                                    )),
                                    data: None,
                                };
                            }
                        }
                        Err(e) => {
                            return OperationResult {
                                success: false,
                                message: Some(format!(
                                    "Invalid URL '{}' for window '{}': {}",
                                    url_str, label_clone, e
                                )),
                                data: None,
                            };
                        }
                    }
                }

                // Show window if requested
                if payload.show.unwrap_or(false) {
                    if let Err(e) = window.show() {
                        return OperationResult {
                            success: false,
                            message: Some(format!(
                                "Failed to show window '{}': {}",
                                label_clone, e
                            )),
                            data: None,
                        };
                    }
                }

                // Success result
                OperationResult {
                    success: true,
                    message: Some(format!("Window '{}' created successfully", label_clone)),
                    data: None,
                }
            }
            Err(e) => OperationResult {
                success: false,
                message: Some(format!(
                    "Failed to create window '{}': {}",
                    label_clone, e
                )),
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
     * Execute an application quit operation
     */
    pub async fn quit_app(
        payload: Option<AppQuitPayload>,
        app_handle: Option<&AppHandle>,
    ) -> OperationResult {
        if let Some(app) = app_handle {
            // Log quit reason if provided
            if let Some(quit_payload) = payload {
                if let Some(reason) = quit_payload.reason {
                    println!("Application quit requested with reason: {}", reason);
                }
            }

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
                match Url::parse(&payload.url) {
                    Ok(url) => {
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
                    }
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

    /**
     * Execute a file system read text file operation
     */
    pub async fn read_text_file(
        payload: FsReadTextFilePayload,
        _app_handle: Option<&AppHandle>,
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
        _app_handle: Option<&AppHandle>,
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
        _app_handle: Option<&AppHandle>,
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
        _app_handle: Option<&AppHandle>,
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

    /**
     * Execute a clipboard write text operation
     */
    pub async fn write_clipboard_text(
        payload: ClipboardWriteTextPayload,
        _app_handle: Option<&AppHandle>,
    ) -> OperationResult {
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
        _app_handle: Option<&AppHandle>,
    ) -> OperationResult {
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

    /**
     * Execute an app get version operation
     */
    pub async fn get_app_version(
        _payload: AppGetVersionPayload,
        app_handle: Option<&AppHandle>,
    ) -> OperationResult {
        if let Some(app) = app_handle {
            let version = app.package_info().version.to_string();
            OperationResult {
                success: true,
                message: Some("App version retrieved successfully".to_string()),
                data: Some(serde_json::json!(version)),
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
     * Execute an app get name operation
     */
    pub async fn get_app_name(
        _payload: AppGetNamePayload,
        app_handle: Option<&AppHandle>,
    ) -> OperationResult {
        if let Some(app) = app_handle {
            let name = app.package_info().name.clone();
            OperationResult {
                success: true,
                message: Some("App name retrieved successfully".to_string()),
                data: Some(serde_json::json!(name)),
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
     * Execute an app get tauri version operation
     */
    pub async fn get_tauri_version(
        _payload: AppGetTauriVersionPayload,
        _app_handle: Option<&AppHandle>,
    ) -> OperationResult {
        let version = env!("CARGO_PKG_VERSION").to_string();
        OperationResult {
            success: true,
            message: Some("Tauri version retrieved successfully".to_string()),
            data: Some(serde_json::json!(version)),
        }
    }

    /**
     * Execute an app get metadata operation
     */
    pub async fn get_app_metadata(
        _payload: AppGetMetadataPayload,
        app_handle: Option<&AppHandle>,
    ) -> OperationResult {
        if let Some(app) = app_handle {
            // Preferred system language(s)
            let system_languages = vec![sys_locale::get_locale()
                .unwrap_or_else(|| "en-US".to_string())];
    
            // OS info
            let os_info = os_info::get();
            let os_type = os_info.os_type().to_string();
            let os_version = os_info.version().to_string();
    
            // Architecture
            let arch = std::env::consts::ARCH.to_string();
    
            // Timezone (real local timezone if possible)
            let timezone = chrono::Local::now().offset().to_string();
    
            // userDir → app.getPath("userData")
            let user_dir = app
                .path()
                .app_data_dir()
                .unwrap_or_default()
                .to_string_lossy()
                .to_string();
    
            // appDir → app.getAppPath()
            let app_dir = app
                .path()
                .resource_dir()
                .unwrap_or_default()
                .to_string_lossy()
                .to_string();
    
            // isPackage → app.isPackaged
            let is_package = std::env::var("TAURI_ENV_DEBUG").is_err();
    
            let metadata = json!({
                "userDir": user_dir,
                "appDir": app_dir,
                "appName": app.package_info().name.clone(),
                "appVersion": app.package_info().version.to_string(),
                "preferredSystemLanguage": system_languages,
                "osType": os_type,
                "osVersion": os_version,
                "architecture": arch,
                "timezone": timezone,
                "isPackage": is_package,
            });
    
            OperationResult {
                success: true,
                message: Some("App metadata retrieved successfully".to_string()),
                data: Some(metadata),
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
     * Execute an app show operation
     */
    pub async fn show_app(
        _payload: AppShowPayload,
        app_handle: Option<&AppHandle>,
    ) -> OperationResult {
        if let Some(app) = app_handle {
            // Show the main window to make the app visible
            if let Some(main_window) = app.get_webview_window("main") {
                match main_window.show() {
                    Ok(_) => Self::create_success_result(
                        "Application shown successfully".to_string(),
                        None,
                    ),
                    Err(e) => Self::create_error_result(
                        format!("Failed to show application: {}", e),
                        None,
                    ),
                }
            } else {
                Self::create_error_result("Main window not found".to_string(), None)
            }
        } else {
            Self::create_app_handle_error()
        }
    }

    /**
     * Execute an app hide operation
     */
    pub async fn hide_app(
        _payload: AppHidePayload,
        app_handle: Option<&AppHandle>,
    ) -> OperationResult {
        if let Some(app) = app_handle {
            // Hide the main window to hide the app
            if let Some(main_window) = app.get_webview_window("main") {
                match main_window.hide() {
                    Ok(_) => Self::create_success_result(
                        "Application hidden successfully".to_string(),
                        None,
                    ),
                    Err(e) => Self::create_error_result(
                        format!("Failed to hide application: {}", e),
                        None,
                    ),
                }
            } else {
                Self::create_error_result("Main window not found".to_string(), None)
            }
        } else {
            Self::create_app_handle_error()
        }
    }

    /**
     * Execute a dialog open operation
     */
    pub async fn open_dialog(
        payload: DialogOpenPayload,
        _app_handle: Option<&AppHandle>,
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
        _app_handle: Option<&AppHandle>,
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
        _app_handle: Option<&AppHandle>,
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
        _app_handle: Option<&AppHandle>,
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

    /**
     * Execute a shell open operation
     */
    pub async fn shell_open(
        payload: ShellOpenPayload,
        _app_handle: Option<&AppHandle>,
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

/**
 * Execute a tauri operation from IPC request
 *
 * This function provides a convenient interface for executing tauri operations
 * from IPC messages received from the sidecar.
 */
pub async fn execute_tauri_operation(
    request_type: &str,
    payload: Value,
    app_handle: Option<&AppHandle>,
) -> OperationResult {
    match request_type {
        "tauri:window.create" => match serde_json::from_value::<WindowCreatePayload>(payload) {
            Ok(window_payload) => {
                TauriOperationExecutor::create_window(window_payload, app_handle).await
            }
            Err(e) => OperationResult {
                success: false,
                message: Some(format!("Invalid payload for tauri:window.create: {}", e)),
                data: None,
            },
        },
        "tauri:window.maximize" => {
            let window_payload = TauriOperationExecutor::deserialize_payload_or_default::<
                WindowMaximizePayload,
            >(payload, "tauri:window.maximize");
            TauriOperationExecutor::maximize_window(window_payload, app_handle).await
        }
        "tauri:window.minimize" => {
            let window_payload = TauriOperationExecutor::deserialize_payload_or_default::<
                WindowMinimizePayload,
            >(payload, "tauri:window.minimize");
            TauriOperationExecutor::minimize_window(window_payload, app_handle).await
        }
        "tauri:window.close" => {
            let window_payload = TauriOperationExecutor::deserialize_payload_or_default::<
                WindowClosePayload,
            >(payload, "tauri:window.close");
            TauriOperationExecutor::close_window(window_payload, app_handle).await
        }
        "tauri:app.quit" => {
            let quit_payload = TauriOperationExecutor::deserialize_payload_or_default::<
                AppQuitPayload,
            >(payload, "tauri:app.quit");
            TauriOperationExecutor::quit_app(Some(quit_payload), app_handle).await
        }
        "tauri:ping" => {
            // Return timestamp as per protocol.md specification
            OperationResult {
                success: true,
                message: Some("Heartbeat acknowledged".to_string()),
                data: Some(serde_json::json!(
                    std::time::SystemTime::now()
                        .duration_since(std::time::UNIX_EPOCH)
                        .unwrap_or_default()
                        .as_millis()
                )),
            }
        }
        "tauri:window.show" => {
            let window_payload = TauriOperationExecutor::deserialize_payload_or_default::<
                WindowShowPayload,
            >(payload, "tauri:window.show");
            TauriOperationExecutor::show_window(window_payload, app_handle).await
        }
        "tauri:window.hide" => {
            let window_payload = TauriOperationExecutor::deserialize_payload_or_default::<
                WindowHidePayload,
            >(payload, "tauri:window.hide");
            TauriOperationExecutor::hide_window(window_payload, app_handle).await
        }
        "tauri:window.set_focus" => {
            let window_payload = TauriOperationExecutor::deserialize_payload_or_default::<
                WindowFocusPayload,
            >(payload, "tauri:window.set_focus");
            TauriOperationExecutor::focus_window(window_payload, app_handle).await
        }
        "tauri:window.set_position" => {
            let window_payload = TauriOperationExecutor::deserialize_payload_or_default::<
                WindowPositionPayload,
            >(payload, "tauri:window.set_position");
            TauriOperationExecutor::set_window_position(window_payload, app_handle).await
        }
        "tauri:window.set_size" => {
            let window_payload = TauriOperationExecutor::deserialize_payload_or_default::<
                WindowSizePayload,
            >(payload, "tauri:window.set_size");
            TauriOperationExecutor::set_window_size(window_payload, app_handle).await
        }
        "tauri:window.set_title" => {
            let window_payload = TauriOperationExecutor::deserialize_payload_or_default::<
                WindowTitlePayload,
            >(payload, "tauri:window.set_title");
            TauriOperationExecutor::set_window_title(window_payload, app_handle).await
        }
        "tauri:window.center" => {
            let window_payload = TauriOperationExecutor::deserialize_payload_or_default::<
                WindowCenterPayload,
            >(payload, "tauri:window.center");
            TauriOperationExecutor::center_window(window_payload, app_handle).await
        }
        "tauri:window.set_decorations" => {
            let window_payload = TauriOperationExecutor::deserialize_payload_or_default::<
                WindowDecorationsPayload,
            >(payload, "tauri:window.set_decorations");
            TauriOperationExecutor::set_window_decorations(window_payload, app_handle).await
        }
        "tauri:window.set_resizable" => {
            let window_payload = TauriOperationExecutor::deserialize_payload_or_default::<
                WindowResizablePayload,
            >(payload, "tauri:window.set_resizable");
            TauriOperationExecutor::set_window_resizable(window_payload, app_handle).await
        }
        "tauri:window.set_closable" => {
            let window_payload = TauriOperationExecutor::deserialize_payload_or_default::<
                WindowClosablePayload,
            >(payload, "tauri:window.set_closable");
            TauriOperationExecutor::set_window_closable(window_payload, app_handle).await
        }
        "tauri:window.set_minimizable" => {
            let window_payload = TauriOperationExecutor::deserialize_payload_or_default::<
                WindowMinimizablePayload,
            >(payload, "tauri:window.set_minimizable");
            TauriOperationExecutor::set_window_minimizable(window_payload, app_handle).await
        }
        "tauri:window.set_maximizable" => {
            let window_payload = TauriOperationExecutor::deserialize_payload_or_default::<
                WindowMaximizablePayload,
            >(payload, "tauri:window.set_maximizable");
            TauriOperationExecutor::set_window_maximizable(window_payload, app_handle).await
        }
        "tauri:window.set_transparent" => {
            let window_payload = TauriOperationExecutor::deserialize_payload_or_default::<
                WindowTransparentPayload,
            >(payload, "tauri:window.set_transparent");
            TauriOperationExecutor::set_window_transparent(window_payload, app_handle).await
        }
        "tauri:window.set_fullscreen" => {
            let window_payload = TauriOperationExecutor::deserialize_payload_or_default::<
                WindowFullscreenPayload,
            >(payload, "tauri:window.set_fullscreen");
            TauriOperationExecutor::set_window_fullscreen(window_payload, app_handle).await
        }
        "tauri:window.set_url" => {
            let window_payload = TauriOperationExecutor::deserialize_payload_or_default::<
                WindowUrlPayload,
            >(payload, "tauri:window.set_url");
            TauriOperationExecutor::set_window_url(window_payload, app_handle).await
        }
        "tauri:fs.read_text_file" => {
            match serde_json::from_value::<FsReadTextFilePayload>(payload) {
                Ok(fs_payload) => {
                    TauriOperationExecutor::read_text_file(fs_payload, app_handle).await
                }
                Err(e) => OperationResult {
                    success: false,
                    message: Some(format!(
                        "Invalid payload for tauri:fs.read_text_file: {}",
                        e
                    )),
                    data: None,
                },
            }
        }
        "tauri:fs.write_text_file" => {
            match serde_json::from_value::<FsWriteTextFilePayload>(payload) {
                Ok(fs_payload) => {
                    TauriOperationExecutor::write_text_file(fs_payload, app_handle).await
                }
                Err(e) => OperationResult {
                    success: false,
                    message: Some(format!(
                        "Invalid payload for tauri:fs.write_text_file: {}",
                        e
                    )),
                    data: None,
                },
            }
        }
        "tauri:fs.exists" => match serde_json::from_value::<FsExistsPayload>(payload) {
            Ok(fs_payload) => TauriOperationExecutor::exists_file(fs_payload, app_handle).await,
            Err(e) => OperationResult {
                success: false,
                message: Some(format!("Invalid payload for tauri:fs.exists: {}", e)),
                data: None,
            },
        },
        "tauri:fs.mkdir" => match serde_json::from_value::<FsMkdirPayload>(payload) {
            Ok(fs_payload) => TauriOperationExecutor::mkdir_file(fs_payload, app_handle).await,
            Err(e) => OperationResult {
                success: false,
                message: Some(format!("Invalid payload for tauri:fs.mkdir: {}", e)),
                data: None,
            },
        },
        "tauri:clipboard.write_text" => {
            match TauriOperationExecutor::deserialize_payload::<ClipboardWriteTextPayload>(
                payload,
                "tauri:clipboard.write_text",
            ) {
                Ok(clipboard_payload) => {
                    TauriOperationExecutor::write_clipboard_text(clipboard_payload, app_handle)
                        .await
                }
                Err(error_result) => error_result,
            }
        }
        "tauri:clipboard.read_text" => {
            TauriOperationExecutor::read_clipboard_text(payload, app_handle).await
        }
        "tauri:dialog.open" => match serde_json::from_value::<DialogOpenPayload>(payload) {
            Ok(dialog_payload) => {
                TauriOperationExecutor::open_dialog(dialog_payload, app_handle).await
            }
            Err(e) => OperationResult {
                success: false,
                message: Some(format!("Invalid payload for tauri:dialog.open: {}", e)),
                data: None,
            },
        },
        "tauri:dialog.save" => match serde_json::from_value::<DialogSavePayload>(payload) {
            Ok(dialog_payload) => {
                TauriOperationExecutor::save_dialog(dialog_payload, app_handle).await
            }
            Err(e) => OperationResult {
                success: false,
                message: Some(format!("Invalid payload for tauri:dialog.save: {}", e)),
                data: None,
            },
        },
        "tauri:dialog.message" => match serde_json::from_value::<DialogMessagePayload>(payload) {
            Ok(dialog_payload) => {
                TauriOperationExecutor::message_dialog(dialog_payload, app_handle).await
            }
            Err(e) => OperationResult {
                success: false,
                message: Some(format!("Invalid payload for tauri:dialog.message: {}", e)),
                data: None,
            },
        },
        "tauri:dialog.ask" => match serde_json::from_value::<DialogAskPayload>(payload) {
            Ok(dialog_payload) => {
                TauriOperationExecutor::ask_dialog(dialog_payload, app_handle).await
            }
            Err(e) => OperationResult {
                success: false,
                message: Some(format!("Invalid payload for tauri:dialog.ask: {}", e)),
                data: None,
            },
        },
        "tauri:app.get_version" => match serde_json::from_value::<AppGetVersionPayload>(payload) {
            Ok(app_payload) => {
                TauriOperationExecutor::get_app_version(app_payload, app_handle).await
            }
            Err(_) => {
                TauriOperationExecutor::get_app_version(AppGetVersionPayload {}, app_handle).await
            }
        },
        "tauri:app.get_name" => match serde_json::from_value::<AppGetNamePayload>(payload) {
            Ok(app_payload) => TauriOperationExecutor::get_app_name(app_payload, app_handle).await,
            Err(_) => TauriOperationExecutor::get_app_name(AppGetNamePayload {}, app_handle).await,
        },
        "tauri:app.get_tauri_version" => {
            match serde_json::from_value::<AppGetTauriVersionPayload>(payload) {
                Ok(app_payload) => {
                    TauriOperationExecutor::get_tauri_version(app_payload, app_handle).await
                }
                Err(_) => {
                    TauriOperationExecutor::get_tauri_version(
                        AppGetTauriVersionPayload {},
                        app_handle,
                    )
                    .await
                }
            }
        }
        "tauri:app.get_metadata" => {
            match serde_json::from_value::<AppGetMetadataPayload>(payload) {
                Ok(app_payload) => {
                    TauriOperationExecutor::get_app_metadata(app_payload, app_handle).await
                }
                Err(_) => {
                    TauriOperationExecutor::get_app_metadata(AppGetMetadataPayload {}, app_handle)
                        .await
                }
            }
        }
        "tauri:app.show" => match serde_json::from_value::<AppShowPayload>(payload) {
            Ok(app_payload) => TauriOperationExecutor::show_app(app_payload, app_handle).await,
            Err(_) => TauriOperationExecutor::show_app(AppShowPayload {}, app_handle).await,
        },
        "tauri:app.hide" => match serde_json::from_value::<AppHidePayload>(payload) {
            Ok(app_payload) => TauriOperationExecutor::hide_app(app_payload, app_handle).await,
            Err(_) => TauriOperationExecutor::hide_app(AppHidePayload {}, app_handle).await,
        },
        "tauri:shell.open" => match serde_json::from_value::<ShellOpenPayload>(payload) {
            Ok(shell_payload) => {
                TauriOperationExecutor::shell_open(shell_payload, app_handle).await
            }
            Err(e) => OperationResult {
                success: false,
                message: Some(format!("Invalid payload for tauri:shell.open: {}", e)),
                data: None,
            },
        },
        _ => OperationResult {
            success: false,
            message: Some(format!("Unknown tauri operation: {}", request_type)),
            data: None,
        },
    }
}

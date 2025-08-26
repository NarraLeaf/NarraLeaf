/*!
 * Operations Module for NarraLeaf (Refactored)
 *
 * This module provides the core operation framework for NarraLeaf Tauri plugin.
 * It handles routing of operations between renderer (narraleaf:*) and sidecar (tauri:*).
 * Business logic is delegated to NodeJS sidecar, while system operations remain local.
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

/**
 * Initial application settings from NodeJS sidecar
 */
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InitialAppSettings {
    pub window_title: String,
    pub window_width: f64,
    pub window_height: f64,
    pub min_window_width: f64,
    pub min_window_height: f64,
    pub center_window: bool,
    pub app_config: Option<Value>,
    pub theme: Option<String>,
    pub language: Option<String>,
}

/**
 * HTTP request payload
 */
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HttpRequestPayload {
    pub url: String,
    pub headers: Option<std::collections::HashMap<String, String>>,
    pub body: Option<String>,
    pub timeout: Option<u64>, // seconds
}

/**
 * Download file payload
 */
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DownloadPayload {
    pub url: String,
    pub destination: String,
    pub headers: Option<std::collections::HashMap<String, String>>,
}

/**
 * File path payload
 */
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FilePathPayload {
    pub path: String,
}

/**
 * File write payload
 */
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileWritePayload {
    pub path: String,
    pub content: String,
    pub encoding: Option<String>, // "utf8", "base64", etc.
}

/**
 * Generic operation result
 */
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OperationResult {
    pub success: bool,
    pub message: Option<String>,
    pub data: Option<Value>,
}

/**
 * Operation execution target
 */
#[derive(Debug, Clone, PartialEq)]
pub enum OperationTarget {
    /// Execute locally in Rust process (for Tauri-specific operations)
    Local,
    /// Forward to NodeJS sidecar process
    Sidecar,
}

/**
 * Get the execution target for an operation type
 */
pub fn get_operation_target(operation_type: &str) -> OperationTarget {
    if operation_type.starts_with("narraleaf:") {
        OperationTarget::Sidecar
    } else if operation_type.starts_with("tauri:") {
        OperationTarget::Local
    } else {
        OperationTarget::Sidecar
    }
}

/**
 * Available operation types (Core Only)
 */
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum OperationType {
    // Window operations (called by sidecar via tauri:*)
    #[serde(rename = "tauri:window.create")]
    TauriWindowCreate(WindowCreatePayload),

    #[serde(rename = "tauri:window.maximize")]
    TauriWindowMaximize(WindowMaximizePayload),

    #[serde(rename = "tauri:window.minimize")]
    TauriWindowMinimize(WindowMinimizePayload),

    #[serde(rename = "tauri:window.close")]
    TauriWindowClose(WindowClosePayload),

    // Application operations (called by sidecar via tauri:*)
    #[serde(rename = "tauri:app.quit")]
    TauriAppQuit,

    #[serde(rename = "tauri:app.restart")]
    TauriAppRestart,

    #[serde(rename = "tauri:app.reload")]
    TauriAppReload,

    #[serde(rename = "tauri:app.terminate")]
    TauriAppTerminate,

    #[serde(rename = "tauri:shutdown")]
    TauriShutdown,

    // IPC operations (kept for compatibility)
    #[serde(rename = "narraleaf:ipc.ping")]
    Ping,

    #[serde(rename = "narraleaf:ipc.status")]
    Status,

    #[serde(rename = "narraleaf:ipc.get_initial_settings")]
    GetInitialSettings,

    #[serde(rename = "narraleaf:ipc.get_platform")]
    GetPlatform,

    // Network operations
    #[serde(rename = "narraleaf:net.http_get")]
    NetHttpGet(HttpRequestPayload),

    #[serde(rename = "narraleaf:net.http_post")]
    NetHttpPost(HttpRequestPayload),

    #[serde(rename = "narraleaf:net.download_file")]
    NetDownloadFile(DownloadPayload),

    // File system operations
    #[serde(rename = "narraleaf:fs.read_file")]
    FsReadFile(FilePathPayload),

    #[serde(rename = "narraleaf:fs.write_file")]
    FsWriteFile(FileWritePayload),

    #[serde(rename = "narraleaf:fs.list_dir")]
    FsListDir(FilePathPayload),
}

// IPC helper functions
async fn ping() -> OperationResult {
    OperationResult {
        success: true,
        message: Some("pong".to_string()),
        data: Some(serde_json::json!({"timestamp": chrono::Utc::now().timestamp()})),
    }
}

async fn status() -> OperationResult {
    OperationResult {
        success: true,
        message: Some("Status OK".to_string()),
        data: Some(serde_json::json!({
            "version": env!("CARGO_PKG_VERSION"),
            "build_time": chrono::Utc::now().to_rfc3339(),
            "features": {
                "tauri": cfg!(feature = "tauri-plugin")
            }
        })),
    }
}

async fn get_initial_settings() -> OperationResult {
    let settings = InitialAppSettings {
        window_title: "NarraLeaf".to_string(),
        window_width: 1200.0,
        window_height: 800.0,
        min_window_width: 800.0,
        min_window_height: 600.0,
        center_window: true,
        app_config: Some(serde_json::json!({
            "debug": false,
            "max_recent_files": 10,
            "auto_save": true,
            "auto_save_interval": 300000
        })),
        theme: Some("system".to_string()),
        language: Some("zh-CN".to_string()),
    };

    match serde_json::to_value(settings) {
        Ok(data) => OperationResult {
            success: true,
            message: Some("Initial settings retrieved successfully".to_string()),
            data: Some(data),
        },
        Err(e) => OperationResult {
            success: false,
            message: Some(format!("Failed to serialize settings: {}", e)),
            data: None,
        },
    }
}

async fn get_platform() -> OperationResult {
    OperationResult {
        success: true,
        message: Some("Platform information retrieved".to_string()),
        data: Some(serde_json::json!({
            "platform": std::env::consts::OS,
            "arch": std::env::consts::ARCH,
            "version": env!("CARGO_PKG_VERSION"),
            "is_tauri": true
        })),
    }
}

/**
 * Operation executor
 */
pub struct OperationExecutor;

impl OperationExecutor {
    /**
     * Execute an operation
     */
    #[cfg(feature = "tauri-plugin")]
    pub async fn execute(
        operation: OperationType,
        app_handle: Option<&AppHandle>,
    ) -> OperationResult {
        match operation {
            // Tauri system operations (called by sidecar)
            OperationType::TauriWindowCreate(payload) => {
                Self::create_window(payload, app_handle).await
            }
            OperationType::TauriWindowMaximize(payload) => {
                Self::maximize_window(payload, app_handle).await
            }
            OperationType::TauriWindowMinimize(payload) => {
                Self::minimize_window(payload, app_handle).await
            }
            OperationType::TauriWindowClose(payload) => {
                Self::close_window(payload, app_handle).await
            }
            OperationType::TauriAppQuit => {
                Self::quit_app(app_handle).await
            }
            OperationType::TauriAppRestart => {
                Self::restart_app(app_handle).await
            }
            OperationType::TauriAppReload => {
                Self::reload_app(app_handle).await
            }
            OperationType::TauriAppTerminate => {
                Self::terminate_app(app_handle).await
            }
            #[cfg(feature = "tauri-plugin")]
            OperationType::TauriShutdown => {
                Self::shutdown_app(app_handle).await
            }

            // IPC operations (kept for compatibility)
            OperationType::Ping => ping().await,
            OperationType::Status => status().await,
            OperationType::GetInitialSettings => get_initial_settings().await,
            OperationType::GetPlatform => get_platform().await,

            // Network operations
            OperationType::NetHttpGet(payload) => {
                Self::http_get(payload).await
            }
            OperationType::NetHttpPost(payload) => {
                Self::http_post(payload).await
            }
            OperationType::NetDownloadFile(payload) => {
                Self::download_file(payload).await
            }

            // File system operations
            OperationType::FsReadFile(payload) => {
                Self::read_file(payload).await
            }
            OperationType::FsWriteFile(payload) => {
                Self::write_file(payload).await
            }
            OperationType::FsListDir(payload) => {
                Self::list_dir(payload).await
            }
        }
    }

    /**
     * Execute an operation from IPC request
     */
    pub async fn execute_from_ipc(
        request_type: &str,
        payload: Value,
        #[cfg(feature = "tauri-plugin")] app_handle: Option<&AppHandle>,
    ) -> OperationResult {
        // Special handling for heartbeat ping
        if request_type == "tauri:ping" {
            return OperationResult {
                success: true,
                message: Some("Heartbeat acknowledged".to_string()),
                data: Some(serde_json::json!({
                    "timestamp": std::time::SystemTime::now()
                        .duration_since(std::time::UNIX_EPOCH)
                        .unwrap_or_default()
                        .as_millis(),
                    "status": "alive"
                })),
            };
        }

        let operation = match request_type {
            "tauri:window.create" => {
                match serde_json::from_value::<WindowCreatePayload>(payload) {
                    Ok(window_payload) => OperationType::TauriWindowCreate(window_payload),
                    Err(e) => {
                        return OperationResult {
                            success: false,
                            message: Some(format!("Invalid payload for tauri:window.create: {}", e)),
                            data: None,
                        };
                    }
                }
            }
            "tauri:window.maximize" => {
                match serde_json::from_value::<WindowMaximizePayload>(payload) {
                    Ok(window_payload) => OperationType::TauriWindowMaximize(window_payload),
                    Err(_) => OperationType::TauriWindowMaximize(WindowMaximizePayload {
                        window_label: None,
                    }),
                }
            }
            "tauri:window.minimize" => {
                match serde_json::from_value::<WindowMinimizePayload>(payload) {
                    Ok(window_payload) => OperationType::TauriWindowMinimize(window_payload),
                    Err(_) => OperationType::TauriWindowMinimize(WindowMinimizePayload {
                        window_label: None,
                    }),
                }
            }
            "tauri:window.close" => {
                match serde_json::from_value::<WindowClosePayload>(payload) {
                    Ok(window_payload) => OperationType::TauriWindowClose(window_payload),
                    Err(_) => OperationType::TauriWindowClose(WindowClosePayload {
                        window_label: None,
                    }),
                }
            }
            "tauri:app.quit" => OperationType::TauriAppQuit,
            "tauri:app.restart" => OperationType::TauriAppRestart,
            "tauri:app.reload" => OperationType::TauriAppReload,
            "tauri:app.terminate" => OperationType::TauriAppTerminate,
            "tauri:shutdown" => OperationType::TauriShutdown,

            "narraleaf:ipc.ping" => OperationType::Ping,
            "narraleaf:ipc.status" => OperationType::Status,
            "narraleaf:ipc.get_initial_settings" => OperationType::GetInitialSettings,
            "narraleaf:ipc.get_platform" => OperationType::GetPlatform,

            "narraleaf:net.http_get" => {
                match serde_json::from_value::<HttpRequestPayload>(payload) {
                    Ok(http_payload) => OperationType::NetHttpGet(http_payload),
                    Err(e) => {
                        return OperationResult {
                            success: false,
                            message: Some(format!("Invalid payload for narraleaf:net.http_get: {}", e)),
                            data: None,
                        };
                    }
                }
            }
            "narraleaf:net.http_post" => {
                match serde_json::from_value::<HttpRequestPayload>(payload) {
                    Ok(http_payload) => OperationType::NetHttpPost(http_payload),
                    Err(e) => {
                        return OperationResult {
                            success: false,
                            message: Some(format!("Invalid payload for narraleaf:net.http_post: {}", e)),
                            data: None,
                        };
                    }
                }
            }
            "narraleaf:net.download_file" => {
                match serde_json::from_value::<DownloadPayload>(payload) {
                    Ok(download_payload) => OperationType::NetDownloadFile(download_payload),
                    Err(e) => {
                        return OperationResult {
                            success: false,
                            message: Some(format!("Invalid payload for narraleaf:net.download_file: {}", e)),
                            data: None,
                        };
                    }
                }
            }

            "narraleaf:fs.read_file" => {
                match serde_json::from_value::<FilePathPayload>(payload) {
                    Ok(file_payload) => OperationType::FsReadFile(file_payload),
                    Err(e) => {
                        return OperationResult {
                            success: false,
                            message: Some(format!("Invalid payload for narraleaf:fs.read_file: {}", e)),
                            data: None,
                        };
                    }
                }
            }
            "narraleaf:fs.write_file" => {
                match serde_json::from_value::<FileWritePayload>(payload) {
                    Ok(write_payload) => OperationType::FsWriteFile(write_payload),
                    Err(e) => {
                        return OperationResult {
                            success: false,
                            message: Some(format!("Invalid payload for narraleaf:fs.write_file: {}", e)),
                            data: None,
                        };
                    }
                }
            }
            "narraleaf:fs.list_dir" => {
                match serde_json::from_value::<FilePathPayload>(payload) {
                    Ok(dir_payload) => OperationType::FsListDir(dir_payload),
                    Err(e) => {
                        return OperationResult {
                            success: false,
                            message: Some(format!("Invalid payload for narraleaf:fs.list_dir: {}", e)),
                            data: None,
                        };
                    }
                }
            }

            _ if request_type.starts_with("narraleaf:") => {
                return OperationResult {
                    success: false,
                    message: Some(format!("Operation '{}' should be forwarded to sidecar", request_type)),
                    data: None,
                };
            }
            _ => {
                return OperationResult {
                    success: false,
                    message: Some(format!("Unknown operation type: {}", request_type)),
                    data: None,
                };
            }
        };

        #[cfg(feature = "tauri-plugin")]
        {
            return Self::execute(operation, app_handle).await;
        }

        #[cfg(not(feature = "tauri-plugin"))]
        {
            return match operation {
                OperationType::Ping => ping().await,
                OperationType::Status => status().await,
                OperationType::GetInitialSettings => get_initial_settings().await,
                OperationType::GetPlatform => get_platform().await,
                _ => OperationResult {
                    success: false,
                    message: Some("Tauri feature not enabled".to_string()),
                    data: None,
                },
            };
        }
    }



    // Window operations implementation
    #[cfg(feature = "tauri-plugin")]
    async fn create_window(
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

    #[cfg(feature = "tauri-plugin")]
    async fn maximize_window(
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

    #[cfg(feature = "tauri-plugin")]
    async fn minimize_window(
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

    #[cfg(feature = "tauri-plugin")]
    async fn close_window(
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

    // Application operations implementation
    #[cfg(feature = "tauri-plugin")]
    async fn quit_app(app_handle: Option<&AppHandle>) -> OperationResult {
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

    #[cfg(feature = "tauri-plugin")]
    async fn restart_app(_app_handle: Option<&AppHandle>) -> OperationResult {
        OperationResult {
            success: false,
            message: Some("Restart not implemented in Tauri 2.x".to_string()),
            data: None,
        }
    }

    #[cfg(feature = "tauri-plugin")]
    async fn reload_app(_app_handle: Option<&AppHandle>) -> OperationResult {
        OperationResult {
            success: false,
            message: Some("Reload not implemented in Tauri 2.x".to_string()),
            data: None,
        }
    }

    #[cfg(feature = "tauri-plugin")]
    async fn terminate_app(app_handle: Option<&AppHandle>) -> OperationResult {
        if let Some(app) = app_handle {
            app.exit(1);
            OperationResult {
                success: true,
                message: Some("Application terminated".to_string()),
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

    #[cfg(feature = "tauri-plugin")]
    async fn shutdown_app(app_handle: Option<&tauri::AppHandle>) -> OperationResult {
        if let Some(app) = app_handle {
            println!("🔄 Received shutdown request from sidecar, exiting application...");
            app.exit(0); // Exit with code 0 for normal shutdown
            OperationResult {
                success: true,
                message: Some("Application shutdown initiated".to_string()),
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

    // Network operation implementations
    async fn http_get(payload: HttpRequestPayload) -> OperationResult {
        use reqwest::Client;

        let client = match Client::builder()
            .timeout(std::time::Duration::from_secs(payload.timeout.unwrap_or(30)))
            .build()
        {
            Ok(client) => client,
            Err(e) => {
                return OperationResult {
                    success: false,
                    message: Some(format!("Failed to create HTTP client: {}", e)),
                    data: None,
                };
            }
        };

        let mut request = client.get(&payload.url);

        if let Some(headers) = payload.headers {
            for (key, value) in headers {
                request = request.header(&key, &value);
            }
        }

        match request.send().await {
            Ok(response) => {
                let status = response.status().as_u16();
                let headers = response.headers().clone();

                match response.text().await {
                    Ok(body) => {
                        let mut header_map = std::collections::HashMap::new();
                        for (key, value) in headers.iter() {
                            if let Ok(value_str) = value.to_str() {
                                header_map.insert(key.to_string(), value_str.to_string());
                            }
                        }

                        OperationResult {
                            success: true,
                            message: Some(format!("HTTP GET successful, status: {}", status)),
                            data: Some(serde_json::json!({
                                "status": status,
                                "headers": header_map,
                                "body": body
                            })),
                        }
                    }
                    Err(e) => OperationResult {
                        success: false,
                        message: Some(format!("Failed to read response body: {}", e)),
                        data: None,
                    },
                }
            }
            Err(e) => OperationResult {
                success: false,
                message: Some(format!("HTTP request failed: {}", e)),
                data: None,
            },
        }
    }

    async fn http_post(payload: HttpRequestPayload) -> OperationResult {
        use reqwest::Client;

        let client = match Client::builder()
            .timeout(std::time::Duration::from_secs(payload.timeout.unwrap_or(30)))
            .build()
        {
            Ok(client) => client,
            Err(e) => {
                return OperationResult {
                    success: false,
                    message: Some(format!("Failed to create HTTP client: {}", e)),
                    data: None,
                };
            }
        };

        let mut request = client.post(&payload.url);

        if let Some(headers) = payload.headers {
            for (key, value) in headers {
                request = request.header(&key, &value);
            }
        }

        if let Some(body) = payload.body {
            request = request.body(body);
        }

        match request.send().await {
            Ok(response) => {
                let status = response.status().as_u16();

                match response.text().await {
                    Ok(body) => OperationResult {
                        success: true,
                        message: Some(format!("HTTP POST successful, status: {}", status)),
                        data: Some(serde_json::json!({
                            "status": status,
                            "body": body
                        })),
                    },
                    Err(e) => OperationResult {
                        success: false,
                        message: Some(format!("Failed to read response body: {}", e)),
                        data: None,
                    },
                }
            }
            Err(e) => OperationResult {
                success: false,
                message: Some(format!("HTTP request failed: {}", e)),
                data: None,
            },
        }
    }

    async fn download_file(payload: DownloadPayload) -> OperationResult {
        use reqwest::Client;

        let client = Client::new();
        let mut request = client.get(&payload.url);

        if let Some(headers) = payload.headers {
            for (key, value) in headers {
                request = request.header(&key, &value);
            }
        }

        match request.send().await {
            Ok(response) => {
                if response.status().is_success() {
                    match response.bytes().await {
                        Ok(bytes) => {
                            match std::fs::write(&payload.destination, &bytes) {
                                Ok(_) => OperationResult {
                                    success: true,
                                    message: Some(format!(
                                        "File downloaded successfully, {} bytes",
                                        bytes.len()
                                    )),
                                    data: Some(serde_json::json!({
                                        "size": bytes.len(),
                                        "path": payload.destination
                                    })),
                                },
                                Err(e) => OperationResult {
                                    success: false,
                                    message: Some(format!("Failed to write file: {}", e)),
                                    data: None,
                                },
                            }
                        }
                        Err(e) => OperationResult {
                            success: false,
                            message: Some(format!("Failed to read response bytes: {}", e)),
                            data: None,
                        },
                    }
                } else {
                    OperationResult {
                        success: false,
                        message: Some(format!("Download failed with status: {}", response.status())),
                        data: None,
                    }
                }
            }
            Err(e) => OperationResult {
                success: false,
                message: Some(format!("Download request failed: {}", e)),
                data: None,
            },
        }
    }

    // File system operation implementations
    async fn read_file(payload: FilePathPayload) -> OperationResult {
        match std::fs::read_to_string(&payload.path) {
            Ok(content) => OperationResult {
                success: true,
                message: Some(format!("File read successfully, {} bytes", content.len())),
                data: Some(serde_json::json!({
                    "content": content,
                    "path": payload.path
                })),
            },
            Err(e) => OperationResult {
                success: false,
                message: Some(format!("Failed to read file: {}", e)),
                data: None,
            },
        }
    }

    async fn write_file(payload: FileWritePayload) -> OperationResult {
        // Create directory if it doesn't exist
        if let Some(parent) = std::path::Path::new(&payload.path).parent() {
            if let Err(e) = std::fs::create_dir_all(parent) {
                return OperationResult {
                    success: false,
                    message: Some(format!("Failed to create directory: {}", e)),
                    data: None,
                };
            }
        }

        match std::fs::write(&payload.path, &payload.content) {
            Ok(_) => OperationResult {
                success: true,
                message: Some(format!("File written successfully, {} bytes", payload.content.len())),
                data: Some(serde_json::json!({
                    "size": payload.content.len(),
                    "path": payload.path
                })),
            },
            Err(e) => OperationResult {
                success: false,
                message: Some(format!("Failed to write file: {}", e)),
                data: None,
            },
        }
    }

    async fn list_dir(payload: FilePathPayload) -> OperationResult {
        match std::fs::read_dir(&payload.path) {
            Ok(entries) => {
                let mut files = Vec::new();
                let mut dirs = Vec::new();

                for entry in entries {
                    match entry {
                        Ok(entry) => {
                            let path = entry.path();
                            if path.is_file() {
                                files.push(path.to_string_lossy().to_string());
                            } else if path.is_dir() {
                                dirs.push(path.to_string_lossy().to_string());
                            }
                        }
                        Err(e) => {
                            return OperationResult {
                                success: false,
                                message: Some(format!("Error reading directory entry: {}", e)),
                                data: None,
                            };
                        }
                    }
                }

                OperationResult {
                    success: true,
                    message: Some(format!("Directory listed successfully, {} files, {} dirs", files.len(), dirs.len())),
                    data: Some(serde_json::json!({
                        "path": payload.path,
                        "files": files,
                        "directories": dirs
                    })),
                }
            }
            Err(e) => OperationResult {
                success: false,
                message: Some(format!("Failed to list directory: {}", e)),
                data: None,
            },
        }
    }
}

/**
 * Get all available operation types
 */
pub fn get_available_operations() -> Vec<String> {
    vec![
        // Tauri system operations
        "tauri:window.create".to_string(),
        "tauri:window.maximize".to_string(),
        "tauri:window.minimize".to_string(),
        "tauri:window.close".to_string(),
        "tauri:app.quit".to_string(),
        "tauri:app.restart".to_string(),
        "tauri:app.reload".to_string(),
        "tauri:app.terminate".to_string(),

        // IPC operations
        "narraleaf:ipc.ping".to_string(),
        "narraleaf:ipc.status".to_string(),
        "narraleaf:ipc.get_initial_settings".to_string(),
        "narraleaf:ipc.get_platform".to_string(),

        // Network operations
        "narraleaf:net.http_get".to_string(),
        "narraleaf:net.http_post".to_string(),
        "narraleaf:net.download_file".to_string(),

        // File system operations
        "narraleaf:fs.read_file".to_string(),
        "narraleaf:fs.write_file".to_string(),
        "narraleaf:fs.list_dir".to_string(),
    ]
}

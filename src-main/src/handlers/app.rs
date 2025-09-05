/*!
 * Application Operation Handlers
 *
 * Handles application-level Tauri operations including lifecycle,
 * metadata, and system information.
 */

use serde_json::{json, Value};
use tauri::{AppHandle, Manager};
use crate::handler_types::*;
use crate::operations::OperationResult;
use os_info;
use sys_locale;
use crate::lifecycle::{LifecycleManager, ShutdownReason};

/**
 * Application Operation Helper Functions
 */
pub struct AppOperations;

impl AppOperations {
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
     * Execute an application quit operation
     */
    pub async fn quit_app(
        payload: Option<AppQuitPayload>,
        _app_handle: Option<&AppHandle>,
    ) -> OperationResult {
        // Log quit reason if provided
        if let Some(quit_payload) = &payload {
            if let Some(reason) = &quit_payload.reason {
                println!("Application quit requested with reason: {}", reason);
            }
        }

        // Delegates cleanup and termination to central lifecycle manager
        LifecycleManager::shutdown(ShutdownReason::SidecarRequested).await;

        // We should never reach this point because shutdown() terminates process,
        // but we return an error result for completeness.
        OperationResult {
            success: false,
            message: Some("Unreachable after shutdown".to_string()),
            data: None,
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
            if let Some(main_window) = app.get_webview("main") {
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
            if let Some(main_window) = app.get_webview("main") {
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
}

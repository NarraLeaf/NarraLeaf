/*!
 * Tauri Operation Executor
 *
 * Main executor that coordinates all Tauri operations and provides
 * a unified interface for handling different operation types.
 */

use serde_json::Value;
use tauri::AppHandle;
use crate::handler_types::*;
use crate::operations::OperationResult;
use super::window::WindowOperations;
use super::app::AppOperations;
use super::filesystem::FileSystemOperations;
use super::clipboard::ClipboardOperations;
use super::dialog::DialogOperations;
use super::shell::ShellOperations;

/**
 * Tauri Operation Executor
 *
 * Handles all tauri:* namespace operations requested from the sidecar
 */
pub struct TauriOperationExecutor;

impl TauriOperationExecutor {
    /**
     * Helper function to deserialize payload with error handling
     */
    fn deserialize_payload<T: for<'de> serde::Deserialize<'de>>(
        payload: Value,
        operation: &str,
    ) -> Result<T, OperationResult> {
        match serde_json::from_value::<T>(payload) {
            Ok(deserialized) => Ok(deserialized),
            Err(e) => Err(OperationResult {
                success: false,
                message: Some(format!("Invalid payload for {}: {}", operation, e)),
                data: None,
            }),
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
        // Window operations
        "tauri:window.create" => match TauriOperationExecutor::deserialize_payload::<WindowCreatePayload>(payload, "tauri:window.create") {
            Ok(window_payload) => {
                WindowOperations::create_window(window_payload, app_handle).await
            }
            Err(e) => e,
        },
        "tauri:window.maximize" => {
            let window_payload = TauriOperationExecutor::deserialize_payload_or_default::<WindowMaximizePayload>(payload, "tauri:window.maximize");
            WindowOperations::maximize_window(window_payload, app_handle).await
        }
        "tauri:window.minimize" => {
            let window_payload = TauriOperationExecutor::deserialize_payload_or_default::<WindowMinimizePayload>(payload, "tauri:window.minimize");
            WindowOperations::minimize_window(window_payload, app_handle).await
        }
        "tauri:window.close" => {
            let window_payload = TauriOperationExecutor::deserialize_payload_or_default::<WindowClosePayload>(payload, "tauri:window.close");
            WindowOperations::close_window(window_payload, app_handle).await
        }
        "tauri:window.show" => {
            let window_payload = TauriOperationExecutor::deserialize_payload_or_default::<WindowShowPayload>(payload, "tauri:window.show");
            WindowOperations::show_window(window_payload, app_handle).await
        }
        "tauri:window.hide" => {
            let window_payload = TauriOperationExecutor::deserialize_payload_or_default::<WindowHidePayload>(payload, "tauri:window.hide");
            WindowOperations::hide_window(window_payload, app_handle).await
        }
        "tauri:window.set_focus" => {
            let window_payload = TauriOperationExecutor::deserialize_payload_or_default::<WindowFocusPayload>(payload, "tauri:window.set_focus");
            WindowOperations::focus_window(window_payload, app_handle).await
        }
        "tauri:window.set_position" => {
            let window_payload = TauriOperationExecutor::deserialize_payload_or_default::<WindowPositionPayload>(payload, "tauri:window.set_position");
            WindowOperations::set_window_position(window_payload, app_handle).await
        }
        "tauri:window.set_size" => {
            let window_payload = TauriOperationExecutor::deserialize_payload_or_default::<WindowSizePayload>(payload, "tauri:window.set_size");
            WindowOperations::set_window_size(window_payload, app_handle).await
        }
        "tauri:window.set_title" => {
            let window_payload = TauriOperationExecutor::deserialize_payload_or_default::<WindowTitlePayload>(payload, "tauri:window.set_title");
            WindowOperations::set_window_title(window_payload, app_handle).await
        }
        "tauri:window.center" => {
            let window_payload = TauriOperationExecutor::deserialize_payload_or_default::<WindowCenterPayload>(payload, "tauri:window.center");
            WindowOperations::center_window(window_payload, app_handle).await
        }
        "tauri:window.set_decorations" => {
            let window_payload = TauriOperationExecutor::deserialize_payload_or_default::<WindowDecorationsPayload>(payload, "tauri:window.set_decorations");
            WindowOperations::set_window_decorations(window_payload, app_handle).await
        }
        "tauri:window.set_resizable" => {
            let window_payload = TauriOperationExecutor::deserialize_payload_or_default::<WindowResizablePayload>(payload, "tauri:window.set_resizable");
            WindowOperations::set_window_resizable(window_payload, app_handle).await
        }
        "tauri:window.set_closable" => {
            let window_payload = TauriOperationExecutor::deserialize_payload_or_default::<WindowClosablePayload>(payload, "tauri:window.set_closable");
            WindowOperations::set_window_closable(window_payload, app_handle).await
        }
        "tauri:window.set_minimizable" => {
            let window_payload = TauriOperationExecutor::deserialize_payload_or_default::<WindowMinimizablePayload>(payload, "tauri:window.set_minimizable");
            WindowOperations::set_window_minimizable(window_payload, app_handle).await
        }
        "tauri:window.set_maximizable" => {
            let window_payload = TauriOperationExecutor::deserialize_payload_or_default::<WindowMaximizablePayload>(payload, "tauri:window.set_maximizable");
            WindowOperations::set_window_maximizable(window_payload, app_handle).await
        }
        "tauri:window.set_transparent" => {
            let window_payload = TauriOperationExecutor::deserialize_payload_or_default::<WindowTransparentPayload>(payload, "tauri:window.set_transparent");
            WindowOperations::set_window_transparent(window_payload, app_handle).await
        }
        "tauri:window.set_fullscreen" => {
            let window_payload = TauriOperationExecutor::deserialize_payload_or_default::<WindowFullscreenPayload>(payload, "tauri:window.set_fullscreen");
            WindowOperations::set_window_fullscreen(window_payload, app_handle).await
        }
        "tauri:window.set_url" => {
            let window_payload = TauriOperationExecutor::deserialize_payload_or_default::<WindowUrlPayload>(payload, "tauri:window.set_url");
            WindowOperations::set_window_url(window_payload, app_handle).await
        }

        // File system operations
        "tauri:fs.read_text_file" => {
            match TauriOperationExecutor::deserialize_payload::<FsReadTextFilePayload>(payload, "tauri:fs.read_text_file") {
                Ok(fs_payload) => {
                    FileSystemOperations::read_text_file(fs_payload, app_handle).await
                }
                Err(e) => e,
            }
        }
        "tauri:fs.write_text_file" => {
            match TauriOperationExecutor::deserialize_payload::<FsWriteTextFilePayload>(payload, "tauri:fs.write_text_file") {
                Ok(fs_payload) => {
                    FileSystemOperations::write_text_file(fs_payload, app_handle).await
                }
                Err(e) => e,
            }
        }
        "tauri:fs.exists" => match TauriOperationExecutor::deserialize_payload::<FsExistsPayload>(payload, "tauri:fs.exists") {
            Ok(fs_payload) => FileSystemOperations::exists_file(fs_payload, app_handle).await,
            Err(e) => e,
        },
        "tauri:fs.mkdir" => match TauriOperationExecutor::deserialize_payload::<FsMkdirPayload>(payload, "tauri:fs.mkdir") {
            Ok(fs_payload) => FileSystemOperations::mkdir_file(fs_payload, app_handle).await,
            Err(e) => e,
        },

        // Clipboard operations
        "tauri:clipboard.write_text" => {
            match TauriOperationExecutor::deserialize_payload::<ClipboardWriteTextPayload>(payload, "tauri:clipboard.write_text") {
                Ok(clipboard_payload) => {
                    ClipboardOperations::write_clipboard_text(clipboard_payload, app_handle).await
                }
                Err(error_result) => error_result,
            }
        }
        "tauri:clipboard.read_text" => {
            ClipboardOperations::read_clipboard_text(payload, app_handle).await
        }

        // Dialog operations
        "tauri:dialog.open" => match TauriOperationExecutor::deserialize_payload::<DialogOpenPayload>(payload, "tauri:dialog.open") {
            Ok(dialog_payload) => {
                DialogOperations::open_dialog(dialog_payload, app_handle).await
            }
            Err(e) => e,
        },
        "tauri:dialog.save" => match TauriOperationExecutor::deserialize_payload::<DialogSavePayload>(payload, "tauri:dialog.save") {
            Ok(dialog_payload) => {
                DialogOperations::save_dialog(dialog_payload, app_handle).await
            }
            Err(e) => e,
        },
        "tauri:dialog.message" => match TauriOperationExecutor::deserialize_payload::<DialogMessagePayload>(payload, "tauri:dialog.message") {
            Ok(dialog_payload) => {
                DialogOperations::message_dialog(dialog_payload, app_handle).await
            }
            Err(e) => e,
        },
        "tauri:dialog.ask" => match TauriOperationExecutor::deserialize_payload::<DialogAskPayload>(payload, "tauri:dialog.ask") {
            Ok(dialog_payload) => {
                DialogOperations::ask_dialog(dialog_payload, app_handle).await
            }
            Err(e) => e,
        },

        // App operations
        "tauri:app.quit" => {
            let quit_payload = TauriOperationExecutor::deserialize_payload_or_default::<AppQuitPayload>(payload, "tauri:app.quit");
            AppOperations::quit_app(Some(quit_payload), app_handle).await
        }
        "tauri:app.get_version" => match TauriOperationExecutor::deserialize_payload::<AppGetVersionPayload>(payload, "tauri:app.get_version") {
            Ok(app_payload) => {
                AppOperations::get_app_version(app_payload, app_handle).await
            }
            Err(_) => {
                AppOperations::get_app_version(AppGetVersionPayload {}, app_handle).await
            }
        },
        "tauri:app.get_name" => match TauriOperationExecutor::deserialize_payload::<AppGetNamePayload>(payload, "tauri:app.get_name") {
            Ok(app_payload) => AppOperations::get_app_name(app_payload, app_handle).await,
            Err(_) => AppOperations::get_app_name(AppGetNamePayload {}, app_handle).await,
        },
        "tauri:app.get_tauri_version" => {
            match TauriOperationExecutor::deserialize_payload::<AppGetTauriVersionPayload>(payload, "tauri:app.get_tauri_version") {
                Ok(app_payload) => {
                    AppOperations::get_tauri_version(app_payload, app_handle).await
                }
                Err(_) => {
                    AppOperations::get_tauri_version(
                        AppGetTauriVersionPayload {},
                        app_handle,
                    )
                    .await
                }
            }
        }
        "tauri:app.get_metadata" => {
            match TauriOperationExecutor::deserialize_payload::<AppGetMetadataPayload>(payload, "tauri:app.get_metadata") {
                Ok(app_payload) => {
                    AppOperations::get_app_metadata(app_payload, app_handle).await
                }
                Err(_) => {
                    AppOperations::get_app_metadata(AppGetMetadataPayload {}, app_handle)
                        .await
                }
            }
        }
        "tauri:app.show" => match TauriOperationExecutor::deserialize_payload::<AppShowPayload>(payload, "tauri:app.show") {
            Ok(app_payload) => AppOperations::show_app(app_payload, app_handle).await,
            Err(_) => AppOperations::show_app(AppShowPayload {}, app_handle).await,
        },
        "tauri:app.hide" => match TauriOperationExecutor::deserialize_payload::<AppHidePayload>(payload, "tauri:app.hide") {
            Ok(app_payload) => AppOperations::hide_app(app_payload, app_handle).await,
            Err(_) => AppOperations::hide_app(AppHidePayload {}, app_handle).await,
        },

        // Shell operations
        "tauri:shell.open" => match TauriOperationExecutor::deserialize_payload::<ShellOpenPayload>(payload, "tauri:shell.open") {
            Ok(shell_payload) => {
                ShellOperations::shell_open(shell_payload, app_handle).await
            }
            Err(e) => e,
        },

        // Ping operation
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

        _ => OperationResult {
            success: false,
            message: Some(format!("Unknown tauri operation: {}", request_type)),
            data: None,
        },
    }
}

/*!
 * NarraLeaf Tauri Plugin
 *
 * This module provides the Tauri plugin implementation for NarraLeaf.
 * It exposes secure IPC communication and sidecar management functionality
 * to Tauri applications.
 */

use tauri::{plugin::Builder, plugin::TauriPlugin, AppHandle, Manager};
use std::sync::Arc;
use tokio::sync::Mutex;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use uuid::Uuid;
use std::time::Duration;

use crate::sidecar::SidecarManager;
use crate::communication::PROTOCOL_VERSION;
use crate::privilege_protocol::PrivilegeProtocolHandler;

use std::sync::OnceLock;

/**
 * Global reference to plugin state for IPC protocol handler
 */
static GLOBAL_PLUGIN_STATE: OnceLock<Arc<PluginState>> = OnceLock::new();

/**
 * Get global plugin state safely
 */
pub fn get_global_plugin_state() -> Option<Arc<PluginState>> {
    GLOBAL_PLUGIN_STATE.get().cloned()
}

/**
 * Check if debug mode is enabled via command line arguments
 */
fn is_debug_mode_enabled() -> bool {
    let args: Vec<String> = std::env::args().collect();
    args.iter().any(|arg| arg == "--debug" || arg == "-d")
}

/**
 * Plugin state shared across the Tauri app
 */
pub struct PluginState {
    pub sidecar_manager: Arc<Mutex<SidecarManager>>,
    pub app_handle: AppHandle,
    pub debug_mode: bool,
}

/**
 * IPC request payload from renderer
 * Now includes id field for proper request-response correlation
 */
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IPCRequest {
    pub id: String,
    pub request_type: String,
    pub payload: Value,
}

/**
 * IPC response to renderer
 * Now includes id field for proper request-response correlation
 */
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IPCResponse {
    pub id: String,
    pub success: bool,
    pub data: Option<Value>,
    pub error: Option<String>,
}

/**
 * Initialize the NarraLeaf plugin
 *
 * This function creates and returns a Tauri plugin that provides
 * NarraLeaf functionality to your Tauri application.
 * 
 * Key behavior:
 * - Registers protocol handlers and global operations on startup
 * - Starts sidecar process but does NOT create any windows
 * - Windows are only created when explicitly requested by sidecar
 */
pub fn init() -> TauriPlugin<tauri::Wry> {
    Builder::new("narraleaf")
        .invoke_handler(tauri::generate_handler![])
        .setup(move |app, _api| {
            // Check if debug mode is enabled
            let debug_mode = is_debug_mode_enabled();
            if debug_mode {
                println!("Initializing NarraLeaf Tauri Runtime plugin...");
                println!("Protocol version: {}", PROTOCOL_VERSION);
                println!("DEBUG MODE ENABLED: Sidecar output will be redirected to main console");
            }

            // Generate random socket connection string and start IPC server
            let connection_string = format!("narraleaf-ipc-{}", Uuid::new_v4().simple());

            // Create plugin state
            let sidecar_manager = Arc::new(Mutex::new(SidecarManager::new(connection_string.clone(), app.app_handle().clone(), debug_mode)));
            let plugin_state = PluginState {
                sidecar_manager: Arc::clone(&sidecar_manager),
                app_handle: app.app_handle().clone(),
                debug_mode,
            };

            // Start sidecar process with socket connection string as parameter
            let connection_string_clone = connection_string.clone();
            let sidecar_manager_clone = Arc::clone(&plugin_state.sidecar_manager);

            // Start sidecar in a separate task
            tokio::spawn(async move {
                println!("Starting sidecar lifecycle management...");

                // Get mutable access to the sidecar manager
                {
                    let mut manager = sidecar_manager_clone.lock().await;

                    // Start the sidecar process
                    let sidecar_path = if cfg!(target_os = "windows") {
                        "resources/service/sidecar.exe"
                    } else {
                        "resources/service/sidecar"
                    };
                    if let Err(e) = manager.start_sidecar_and_ipc(sidecar_path, &connection_string_clone).await {
                        eprintln!("Failed to start sidecar: {}", e);
                        manager.state = crate::sidecar::SidecarState::Failed;
                        return;
                    } else if debug_mode {
                        println!("Sidecar started successfully with connection: {}", connection_string_clone);
                        println!("Plugin initialization completed");
                        println!("Note: Windows will only be created when requested by sidecar");
                    }
                } // manager lock dropped here

                // Spawn separate task for health monitoring so that the lock isn't held across sleeps
                tokio::spawn(monitor_sidecar(sidecar_manager_clone.clone(), debug_mode));
            });

            // Store the plugin state
            let plugin_state_arc = Arc::new(plugin_state);
            app.manage(plugin_state_arc.clone());

            // Store global reference for IPC protocol handler
            let _ = GLOBAL_PLUGIN_STATE.set(plugin_state_arc);

            // Add window close event listeners to existing windows (if any)
            // Note: This will only affect windows that already exist
            setup_window_event_listeners(&app.app_handle());

            if debug_mode {
                println!("NarraLeaf plugin initialized successfully");
                println!("Global operations completed");
                println!("Waiting for sidecar to request window creation...");
            }
            Ok(())
        })
        .on_event(move |app, event| {
            match event {
                tauri::RunEvent::ExitRequested { api, .. } => {
                    println!("Exit requested – preventing shutdown;");
                    // Prevent Tauri from exiting automatically when the last window closes.
                    api.prevent_exit();
                }
                tauri::RunEvent::Exit => {
                    println!("Tauri app is exiting, stopping sidecar...");

                    // Get the sidecar manager and stop it synchronously
                    let app_handle = app.clone();
                    
                    // Use blocking spawn and wait for completion to ensure sidecar is fully stopped
                    let (tx, rx) = std::sync::mpsc::channel();
                    std::thread::spawn(move || {
                        // Create a new runtime for this thread to handle async operations
                        let rt = tokio::runtime::Runtime::new().unwrap();
                        rt.block_on(async {
                            // Retrieve the managed state as `Arc<PluginState>` instead of `PluginState`
                            if let Some(state_arc) = app_handle.try_state::<Arc<PluginState>>() {
                                // Clone to extend lifetime outside of the if block if needed
                                let state = state_arc.as_ref();
                                let mut manager = state.sidecar_manager.lock().await;
                                println!("[EXIT] Stopping sidecar manager synchronously...");
                                if let Err(e) = manager.stop().await {
                                    eprintln!("[EXIT] Error stopping sidecar during app exit: {}", e);
                                } else {
                                    println!("[EXIT] Sidecar stopped successfully during app exit");
                                }
                            } else {
                                eprintln!("[EXIT] Could not access plugin state during app exit");
                            }
                        });
                        // Signal completion
                        let _ = tx.send(());
                    });
                    
                    // Wait for sidecar to stop (with timeout)
                    match rx.recv_timeout(std::time::Duration::from_secs(10)) {
                        Ok(_) => println!("[EXIT] Sidecar cleanup completed successfully"),
                        Err(_) => eprintln!("[EXIT] Sidecar cleanup timeout, proceeding with exit"),
                    }
                }
                _ => {}
            }
        })
        .register_uri_scheme_protocol("ipc", |_ctx, request| {
            // Handle ipc://rpc requests using PrivilegeProtocolHandler
            PrivilegeProtocolHandler::handle_uri_scheme_request(&request)
        })
        .build()
}

/**
 * Setup window close event listeners for all existing windows
 */
fn setup_window_event_listeners(app: &tauri::AppHandle) {
    // Get all existing windows
    let windows = app.webview_windows();
    
    if windows.is_empty() {
        println!("No existing windows found at startup - this is expected");
        return;
    }
    
    for (label, window) in windows {
        println!("Setting up window close listener for existing window: {}", label);
        
        let window_label = label.clone();
        let _app_handle = app.app_handle().clone();
        
        // Listen for window close event
        window.on_window_event(move |event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                println!("Window close requested for: {}", window_label);
                
                // Send sidecar notification asynchronously
                let window_label_clone = window_label.clone();
                
                tokio::spawn(async move {
                    if let Some(plugin_state) = get_global_plugin_state() {
                        let sidecar_manager = plugin_state.sidecar_manager.lock().await;
                        
                        // Send sidecar:window.on_close notification
                        let payload = serde_json::json!({
                            "label": window_label_clone,
                            "timestamp": std::time::SystemTime::now()
                                .duration_since(std::time::UNIX_EPOCH)
                                .unwrap_or_default()
                                .as_millis()
                        });
                        
                        match sidecar_manager.send_sidecar_request("sidecar:window.on_close", payload).await {
                            Ok(_) => println!("Sidecar notification sent for window close: {}", window_label_clone),
                            Err(e) => println!("Failed to send sidecar notification: {}", e),
                        }
                    }
                });
            }
        });
    }
}

// =====================
// Sidecar monitoring
// =====================
async fn monitor_sidecar(sidecar_manager: Arc<Mutex<SidecarManager>>, debug_mode: bool) {
    let mut iteration: usize = 0;
    loop {
        iteration += 1;
        let should_continue = {
            let mut manager = sidecar_manager.lock().await;
            manager.check_health(iteration).await
        };

        if !should_continue {
            break;
        }

        // Sleep 5s between checks (same interval as之前)
        if debug_mode {
            println!("[SIDECAR] Waiting 5 seconds before next health check (monitor task)...");
        }
        tokio::time::sleep(Duration::from_secs(5)).await;
    }

    println!("[SIDECAR] Sidecar monitoring task stopped");
}

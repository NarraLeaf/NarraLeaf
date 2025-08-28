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
 * Plugin state shared across the Tauri app
 */
pub struct PluginState {
    pub sidecar_manager: Arc<Mutex<SidecarManager>>,
    pub app_handle: AppHandle,
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
 */
pub fn init() -> TauriPlugin<tauri::Wry> {
    Builder::new("narraleaf")
        .invoke_handler(tauri::generate_handler![])
        .setup(move |app, _api| {
            println!("Initializing NarraLeaf Tauri Runtime plugin...");
            println!("Protocol version: {}", PROTOCOL_VERSION);

            // Generate random socket connection string and start IPC server
            let connection_string = format!("narraleaf-ipc-{}", Uuid::new_v4().simple());

            // Create plugin state
            let sidecar_manager = Arc::new(Mutex::new(SidecarManager::new(connection_string.clone(), app.app_handle().clone())));
            let plugin_state = PluginState {
                sidecar_manager: Arc::clone(&sidecar_manager),
                app_handle: app.app_handle().clone(),
            };

            // Start sidecar process with socket connection string as parameter
            let connection_string_clone = connection_string.clone();
            let sidecar_manager_clone = Arc::clone(&plugin_state.sidecar_manager);

            // Start sidecar in a separate task
            tokio::spawn(async move {
                println!("Starting sidecar lifecycle management...");

                // Get mutable access to the sidecar manager
                let mut manager = sidecar_manager_clone.lock().await;

                // Start the sidecar process
                if let Err(e) = manager.start_sidecar_and_ipc("node", &connection_string_clone).await {
                    eprintln!("Failed to start sidecar: {}", e);
                    manager.state = crate::sidecar::SidecarState::Failed;
                } else {
                    println!("Sidecar started successfully with connection: {}", connection_string_clone);
                    println!("Plugin initialization completed");

                    // Monitor sidecar health and handle termination
                    manager.listen_sidecar_status().await;
                }
            });

            // Store the plugin state
            let plugin_state_arc = Arc::new(plugin_state);
            app.manage(plugin_state_arc.clone());

            // Store global reference for IPC protocol handler
            let _ = GLOBAL_PLUGIN_STATE.set(plugin_state_arc);

            println!("NarraLeaf plugin initialized successfully");
            Ok(())
        })
        .on_event(move |app, event| {
            match event {
                tauri::RunEvent::Exit => {
                    println!("Tauri app is exiting, stopping sidecar...");

                    // Get the sidecar manager and stop it
                    let app_handle = app.clone();
                    tauri::async_runtime::spawn(async move {
                        if let Some(state) = app_handle.try_state::<PluginState>() {
                            let mut manager = state.sidecar_manager.lock().await;
                            if let Err(e) = manager.stop().await {
                                eprintln!("Error stopping sidecar during app exit: {}", e);
                            } else {
                                println!("Sidecar stopped successfully during app exit");
                            }
                        } else {
                            eprintln!("Could not access plugin state during app exit");
                        }
                    });
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

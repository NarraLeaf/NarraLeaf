/*!
 * NarraLeaf Tauri Plugin
 *
 * This module provides the Tauri plugin implementation for NarraLeaf.
 * It exposes secure IPC communication and sidecar management functionality
 * to Tauri applications.
 */

use tauri::{plugin::Builder, plugin::TauriPlugin, AppHandle, Manager, Runtime, State};
use std::sync::Arc;
use tokio::sync::Mutex;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::sync::OnceLock;

use crate::ipc::IPCServer;
use crate::sidecar::SidecarManager;
use crate::communication::SidecarMessage;
use crate::operations::OperationExecutor;

/**
 * Plugin configuration
 */
#[derive(Clone)]
pub struct PluginConfig {
    pub sidecar_path: String,
    pub connection_string: Option<String>,
}

impl Default for PluginConfig {
    fn default() -> Self {
        Self {
            sidecar_path: "node".to_string(), // Default to system node
            connection_string: None,
        }
    }
}

/**
 * Plugin state shared across the Tauri app
 */
pub struct PluginState {
    pub sidecar_manager: Arc<Mutex<SidecarManager>>,
    pub app_handle: Option<AppHandle>,
    pub initialized: bool,
    pub config: PluginConfig,
    pub shutdown_handle: Option<tokio::task::JoinHandle<()>>,
    pub heartbeat_monitor_handle: Option<tokio::task::JoinHandle<()>>,
    pub last_heartbeat: Arc<std::sync::Mutex<std::time::Instant>>,
    pub heartbeat_timeout: std::time::Duration,
}

/**
 * IPC request payload from renderer
 */
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IPCRequest {
    pub request_type: String,
    pub payload: Value,
}

/**
 * IPC response to renderer
 */
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IPCResponse {
    pub success: bool,
    pub data: Option<Value>,
    pub error: Option<String>,
}

/**
 * Initialize the NarraLeaf plugin with default configuration
 *
 * This function creates and returns a Tauri plugin that provides
 * NarraLeaf functionality to your Tauri application.
 */
pub fn init() -> TauriPlugin<tauri::Wry> {
    init_with_config(PluginConfig::default())
}

/**
 * Initialize the NarraLeaf plugin with custom configuration
 *
 * This function creates and returns a Tauri plugin that provides
 * NarraLeaf functionality to your Tauri application with custom sidecar path.
 *
 * @param config - Plugin configuration including sidecar path
 */
pub fn init_with_config(config: PluginConfig) -> TauriPlugin<tauri::Wry> {
    Builder::new("narraleaf")
        .invoke_handler(tauri::generate_handler![
            request_ipc,
            handle_heartbeat_ping,
        ])
        .setup(move |app, _api| {
            println!("Initializing NarraLeaf Tauri Runtime plugin...");

            // Create connection string if not provided
            let connection_string = config.connection_string.clone()
                .unwrap_or_else(|| format!("narraleaf-ipc-{}", uuid::Uuid::new_v4().simple()));

            // Initialize global heartbeat state
            let global_heartbeat = init_global_heartbeat();

            // Create plugin state
            let sidecar_manager = Arc::new(Mutex::new(SidecarManager::new_with_connection_string(connection_string.clone())));
            let plugin_state = PluginState {
                sidecar_manager: Arc::clone(&sidecar_manager),
                app_handle: Some(app.app_handle().clone()),
                initialized: false,
                config: config.clone(),
                shutdown_handle: None,
                heartbeat_monitor_handle: None,
                last_heartbeat: global_heartbeat,
                heartbeat_timeout: std::time::Duration::from_secs(45), // 30 + 15 second tolerance
            };

            // Start sidecar immediately with proper lifecycle management
            let sidecar_path = config.sidecar_path.clone();
            let connection_string_clone = connection_string.clone();
            let sidecar_manager = Arc::clone(&plugin_state.sidecar_manager);

            // Start sidecar in a separate task
            let shutdown_handle = tokio::spawn(async move {
                println!("Starting sidecar lifecycle management...");

                // Get mutable access to the sidecar manager
                let mut manager = sidecar_manager.lock().await;

                // Start the sidecar process
                if let Err(e) = manager.start_sidecar_and_ipc(&sidecar_path, &connection_string_clone).await {
                    eprintln!("Failed to start sidecar: {}", e);
                    manager.state = crate::sidecar::SidecarState::Failed;
                } else {
                    println!("Sidecar started successfully with connection: {}", connection_string_clone);

                    // Set IPC server sidecar manager reference for initial response handling
                    if let Some(ipc_server) = &mut manager.ipc_server {
                        let sidecar_manager_weak = Arc::downgrade(&sidecar_manager);
                        ipc_server.set_sidecar_manager(sidecar_manager_weak);
                    }

                    println!("Plugin initialization completed");

                    // Monitor sidecar health and handle termination
                    manager.monitor_sidecar_health().await;
                }
            });

            // Create final plugin state with shutdown handle
            let final_plugin_state = PluginState {
                sidecar_manager: plugin_state.sidecar_manager,
                app_handle: plugin_state.app_handle,
                initialized: plugin_state.initialized,
                config: plugin_state.config,
                shutdown_handle: Some(shutdown_handle),
                heartbeat_monitor_handle: plugin_state.heartbeat_monitor_handle,
                last_heartbeat: plugin_state.last_heartbeat,
                heartbeat_timeout: plugin_state.heartbeat_timeout,
            };

            // Start heartbeat monitoring
            let heartbeat_monitor_handle = tokio::spawn(async move {
                Self::monitor_heartbeat(final_plugin_state).await;
            });

            // Update the plugin state with heartbeat monitor handle
            if let Some(state) = app.app_handle().try_state::<PluginState>() {
                let mut state_guard = state.write().await;
                state_guard.heartbeat_monitor_handle = Some(heartbeat_monitor_handle);
            }

            // Store the plugin state
            app.manage(final_plugin_state);

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
        .build()
}

/**
 * Handle IPC requests from renderer
 *
 * Security: Only narraleaf: namespace requests are allowed from renderer
 * All other requests are rejected for security reasons
 */
#[tauri::command]
async fn request_ipc(
    request: IPCRequest,
    state: State<'_, PluginState>,
) -> Result<IPCResponse, String> {
    // Basic request logging
    let current_time = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs();
    println!("IPC Request: {} at {}", request.request_type, current_time);

    // Security check: Only allow narraleaf: namespace requests from renderer
    if !request.request_type.starts_with("narraleaf:") {
        println!("Rejected non-narraleaf request: {}", request.request_type);
        return Ok(IPCResponse {
            success: false,
            data: None,
            error: Some(format!("Access denied: Only 'narraleaf:' namespace requests are allowed from renderer. Got: {}", request.request_type)),
        });
    }

    // Forward all narraleaf: operations to NodeJS sidecar
    println!("Forwarding narraleaf operation to sidecar: {}", request.request_type);
    forward_to_sidecar(request, state).await
}

/**
 * Forward request to NodeJS sidecar process
 *
 * This function implements the complete request-response cycle with the NodeJS sidecar.
 */
async fn forward_to_sidecar(
    request: IPCRequest,
    state: State<'_, PluginState>,
) -> Result<IPCResponse, String> {
    use std::time::Duration;
    use tokio::sync::oneshot;

    // Get sidecar manager
    let manager = state.sidecar_manager.lock().await;

    // Check if IPC server is available
    let ipc_server = match &manager.ipc_server {
        Some(server) => server,
        None => {
            return Ok(IPCResponse {
                success: false,
                data: None,
                error: Some("IPC server not available - sidecar not running".to_string()),
            });
        }
    };

    // Check if any clients are connected to the sidecar
    let connected_clients = ipc_server.get_connected_clients().await;
    if connected_clients.is_empty() {
        return Ok(IPCResponse {
            success: false,
            data: None,
            error: Some("No sidecar clients connected".to_string()),
        });
    }

    // Create a unique message ID for this request
    let message_id = uuid::Uuid::new_v4().to_string();

    // Create response channel for this request
    let (response_tx, response_rx) = oneshot::channel::<crate::communication::SidecarMessage>();

    // Register the pending request
    {
        let server_state = ipc_server.get_server_state();
        let mut pending_requests = server_state.pending_requests.write().await;
        pending_requests.insert(message_id.clone(), response_tx);
    }

    // Create sidecar message
    let sidecar_message = crate::communication::SidecarMessage::Request {
        id: message_id.clone(),
        request_type: request.request_type.clone(),
        payload: request.payload.clone(),
    };

    println!("Forwarding to sidecar: {} -> {:?}", request.request_type, sidecar_message);

    // Send the message to the first connected client
    let client_id = &connected_clients[0];

    match ipc_server.send_to_client(client_id, &sidecar_message).await {
        Ok(_) => {
            println!("Message sent to sidecar client: {}", client_id);

            // Wait for response with timeout
            match tokio::time::timeout(Duration::from_secs(30), response_rx).await {
                Ok(Ok(response_message)) => {
                    // Process the response
                    match response_message {
                        crate::communication::SidecarMessage::Response { id, success, data, error } => {
                            println!("Received response for {}: success={}", id, success);
                            Ok(IPCResponse {
                                success,
                                data,
                                error,
                            })
                        }
                        _ => {
                            println!("Unexpected response message type");
                            Ok(IPCResponse {
                                success: false,
                                data: None,
                                error: Some("Unexpected response message type".to_string()),
                            })
                        }
                    }
                }
                Ok(Err(_)) => {
                    println!("Response channel closed unexpectedly");
                    Ok(IPCResponse {
                        success: false,
                        data: None,
                        error: Some("Response channel closed unexpectedly".to_string()),
                    })
                }
                Err(_) => {
                    println!("Timeout waiting for sidecar response");
                    // Clean up the pending request
                    {
                        let server_state = ipc_server.get_server_state();
                        let mut pending_requests = server_state.pending_requests.write().await;
                        pending_requests.remove(&message_id);
                    }
                    Ok(IPCResponse {
                        success: false,
                        data: None,
                        error: Some("Timeout waiting for sidecar response".to_string()),
                    })
                }
            }
        },
        Err(e) => {
            println!("Failed to send message to sidecar client: {}", e);
            // Clean up the pending request
            {
                let server_state = ipc_server.get_server_state();
                let mut pending_requests = server_state.pending_requests.write().await;
                pending_requests.remove(&message_id);
            }
            Ok(IPCResponse {
                success: false,
                data: None,
                error: Some(format!("Failed to communicate with sidecar: {}", e)),
            })
        }
    }
}

/**
 * Monitor heartbeat from sidecar and handle timeout
 */
async fn monitor_heartbeat(plugin_state: PluginState) {
    println!("Starting heartbeat monitoring (timeout: {}s)", plugin_state.heartbeat_timeout.as_secs());

    loop {
        tokio::time::sleep(std::time::Duration::from_secs(10)).await;

        // Check if heartbeat timeout has been exceeded
        if let Some(last_heartbeat) = get_global_heartbeat() {
            if last_heartbeat.elapsed() > plugin_state.heartbeat_timeout {
                println!("💀 Heartbeat timeout exceeded ({}s), initiating shutdown...",
                        last_heartbeat.elapsed().as_secs());

                // Stop the sidecar
                let manager = plugin_state.sidecar_manager.lock().await;
                if let Err(e) = manager.stop().await {
                    eprintln!("Error stopping sidecar during heartbeat timeout: {}", e);
                }

                // Exit the application
                if let Some(app_handle) = &plugin_state.app_handle {
                    app_handle.exit(1);
                }

                break;
            }
        }
    }
}

/**
 * Reset heartbeat timer when ping is received
 */
#[tauri::command]
async fn handle_heartbeat_ping(state: State<'_, PluginState>) -> Result<(), String> {
    // Reset the global heartbeat timer
    reset_global_heartbeat();

    println!("Heartbeat received and timer reset");

    Ok(())
}





// Global heartbeat state for IPC communication
static GLOBAL_HEARTBEAT: OnceLock<Arc<std::sync::Mutex<std::time::Instant>>> = OnceLock::new();

/**
 * Initialize global heartbeat state
 */
fn init_global_heartbeat() -> Arc<std::sync::Mutex<std::time::Instant>> {
    GLOBAL_HEARTBEAT.get_or_init(|| {
        Arc::new(std::sync::Mutex::new(std::time::Instant::now()))
    }).clone()
}

/**
 * Reset global heartbeat timer (called from IPC context)
 */
pub fn reset_global_heartbeat() {
    if let Some(heartbeat) = GLOBAL_HEARTBEAT.get() {
        *heartbeat.lock().unwrap() = std::time::Instant::now();
        println!("Global heartbeat reset from IPC");
    }
}

/**
 * Get current heartbeat time
 */
pub fn get_global_heartbeat() -> Option<std::time::Instant> {
    GLOBAL_HEARTBEAT.get()
        .map(|heartbeat| *heartbeat.lock().unwrap())
}

/**
 * NarraLeaf Plugin Type
 *
 * This is the main plugin type that users will interact with.
 * It provides a convenient interface for accessing plugin functionality.
 */
pub struct NarraleafPlugin;

// The init function is already defined above, no need for additional wrapper

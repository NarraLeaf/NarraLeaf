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

use crate::ipc::IPCServer;
use crate::sidecar::SidecarManager;
use crate::communication::SidecarMessage;
use crate::app_protocol::handle_app_protocol_request;

/**
 * Plugin state shared across the Tauri app
 */
pub struct PluginState {
    pub sidecar_manager: Arc<Mutex<SidecarManager>>,
    pub app_handle: Option<AppHandle>,
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
 * Initialize the NarraLeaf plugin
 *
 * This function creates and returns a Tauri plugin that provides
 * NarraLeaf functionality to your Tauri application.
 */
pub fn init() -> TauriPlugin<tauri::Wry> {
    Builder::new("narraleaf")
        .invoke_handler(tauri::generate_handler![
            request_ipc,
        ])
        .setup(move |app, _api| {
            println!("Initializing NarraLeaf Tauri Runtime plugin...");

            // Generate random socket connection string and start IPC server
            let connection_string = format!("narraleaf-ipc-{}", uuid::Uuid::new_v4().simple());

            // Create plugin state
            let sidecar_manager = Arc::new(Mutex::new(SidecarManager::new_with_connection_string(connection_string.clone())));
            let plugin_state = PluginState {
                sidecar_manager: Arc::clone(&sidecar_manager),
                app_handle: Some(app.app_handle().clone()),
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
                    manager.monitor_sidecar_health().await;
                }
            });

            // Store the plugin state
            app.manage(plugin_state);

            // Register app:// protocol handler
            let app_handle = app.app_handle();
            let sidecar_manager_clone = Arc::clone(&plugin_state.sidecar_manager);

            app.protocol("app", move |request| {
                let app_handle_clone = app_handle.clone();
                let sidecar_manager = Arc::clone(&sidecar_manager_clone);

                async move {
                    match handle_app_protocol_request(&app_handle_clone, &request, sidecar_manager).await {
                        Ok(response) => response,
                        Err(e) => {
                            eprintln!("Error handling app protocol request: {}", e);
                            tauri::http::Response::builder()
                                .status(500)
                                .header("Content-Type", "application/json")
                                .body(format!(r#"{{"error": "{}", "status": 500}}"#, e).into_bytes())
                                .unwrap()
                        }
                    }
                }
            });

            println!("NarraLeaf plugin initialized successfully with app:// protocol support");
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




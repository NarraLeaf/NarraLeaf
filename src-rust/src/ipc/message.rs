/*!
 * Message Processing
 * 
 * Handles incoming messages and routes them to appropriate handlers
 */

use std::sync::Arc;
use crate::ipc::types::ServerState;
use crate::ipc::client::send_message_to_client_by_id;
use crate::communication::{SidecarMessage, PROTOCOL_VERSION};

/// Process incoming message
pub async fn process_message(
    message: &SidecarMessage,
    client_id: &str,
    server_state: &Arc<ServerState>,
    sidecar_manager: Option<std::sync::Weak<tokio::sync::Mutex<crate::sidecar::SidecarManager>>>,
) {
    match message {
        SidecarMessage::Request { id, request_type, payload: _ } => {
            // Handle request
            let handlers = server_state.message_handlers.read().await;
            if let Some(handler) = handlers.get(request_type) {
                match handler.handle_message(message) {
                    Ok(Some(response)) => {
                        // Send response back to client
                        if let Err(e) = send_message_to_client_by_id(
                            client_id, server_state, &response
                        ).await {
                            println!("Failed to send response to client {}: {}", client_id, e);
                        }
                    }
                    Ok(None) => {
                        // No response needed
                    }
                    Err(e) => {
                        // Send error response
                        let error_response = SidecarMessage::Response {
                            id: id.clone(),
                            success: false,
                            data: None,
                            error: Some(e),
                        };

                        if let Err(e) = send_message_to_client_by_id(
                            client_id, server_state, &error_response
                        ).await {
                            println!("Failed to send error response to client {}: {}", client_id, e);
                        }
                    }
                }
            } else {
                // No handler found, send error response
                let error_response = SidecarMessage::Response {
                    id: id.clone(),
                    success: false,
                    data: None,
                    error: Some(format!("No handler for request type: {}", request_type)),
                };

                if let Err(e) = send_message_to_client_by_id(
                    client_id, server_state, &error_response
                ).await {
                    println!("Failed to send error response to client {}: {}", client_id, e);
                }
            }
        }

        SidecarMessage::Response { id, success, data: _, error: _ } => {
            // Handle response from sidecar - route to waiting request
            println!("Received response for request {}: success={}", id, success);

            let mut pending_requests = server_state.pending_requests.write().await;
            if let Some(sender) = pending_requests.remove(id) {
                // Send response back to waiting request
                if let Err(_) = sender.send(message.clone()) {
                    println!("Failed to send response to waiting request {}", id);
                }
            } else {
                println!("No pending request found for response {}", id);
            }
        }

        SidecarMessage::SidecarRequest { id, request_type, payload, response_channel: _ } => {
            // Handle request from sidecar (e.g., tauri: operations)
            println!("Received sidecar request: {} -> {}", request_type, id);

            // Special handling for heartbeat ping
            if request_type == "tauri:ping" {
                // Reset the global heartbeat timer
                #[cfg(feature = "tauri-plugin")]
                crate::tauri::reset_global_heartbeat();

                // This is a heartbeat ping - create a simple success response
                let response = SidecarMessage::Response {
                    id: id.clone(),
                    success: true,
                    data: Some(serde_json::json!({
                        "timestamp": std::time::SystemTime::now()
                            .duration_since(std::time::UNIX_EPOCH)
                            .unwrap_or_default()
                            .as_millis(),
                        "status": "heartbeat_acknowledged"
                    })),
                    error: None,
                };

                if let Err(e) = send_message_to_client_by_id(
                    client_id, server_state, &response
                ).await {
                    println!("Failed to send heartbeat response: {}", e);
                }

                return;
            }

            // Process the sidecar request using the operations framework
            #[cfg(feature = "tauri-plugin")]
            let result = crate::operations::OperationExecutor::execute_from_ipc(
                &request_type,
                payload.clone(),
                None, // No app handle in IPC context
            ).await;

            #[cfg(not(feature = "tauri-plugin"))]
            let result = crate::operations::OperationExecutor::execute_from_ipc(
                &request_type,
                payload.clone(),
            ).await;

            // Create response based on operation result
            let response = SidecarMessage::Response {
                id: id.clone(),
                success: result.success,
                data: result.data,
                error: result.message,
            };

            if let Err(e) = send_message_to_client_by_id(
                client_id, server_state, &response
            ).await {
                println!("Failed to send sidecar request response: {}", e);
            }
        }
        
        SidecarMessage::Ping { timestamp } => {
            // Respond with pong
            let pong = SidecarMessage::Pong { timestamp: *timestamp };
            if let Err(e) = send_message_to_client_by_id(
                client_id, server_state, &pong
            ).await {
                println!("Failed to send pong to client {}: {}", client_id, e);
            }
        }

        SidecarMessage::Pong { timestamp } => {
            // Handle pong response from sidecar
            let now = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis() as u64;

            let round_trip_time = now - timestamp;
            println!("🏓 Pong received from client {} (RTT: {}ms)", client_id, round_trip_time);

            // TODO: Update heartbeat timestamp in monitoring state
            // This would require access to the monitoring state from the IPC layer
        }
        
        SidecarMessage::VersionCheck { version } => {
            // Check protocol compatibility
            let compatible = *version == PROTOCOL_VERSION;
            let version_response = SidecarMessage::VersionResponse {
                version: PROTOCOL_VERSION,
                compatible,
            };
            
            if let Err(e) = send_message_to_client_by_id(
                client_id, server_state, &version_response
            ).await {
                println!("Failed to send version response to client {}: {}", client_id, e);
            }
        }
        
        SidecarMessage::InitialResponse { language, version, ipc_protocol_version, capabilities } => {
            // Handle initial response from sidecar
            println!("📡 Initial response from sidecar client {}:", client_id);
            println!("  - Language: {}", language);
            println!("  - Version: {}", version);
            println!("  - IPC Protocol: {}", ipc_protocol_version);
            println!("  - Capabilities: {:?}", capabilities);

            // Check protocol compatibility
            if *ipc_protocol_version != PROTOCOL_VERSION {
                println!("⚠️  Protocol version mismatch! Sidecar: {}, Expected: {}", ipc_protocol_version, PROTOCOL_VERSION);
            }

            // Store sidecar metadata if sidecar_manager is available
            if let Some(sidecar_manager_weak) = sidecar_manager {
                if let Some(sidecar_manager_arc) = sidecar_manager_weak.upgrade() {
                    let mut sidecar_manager = sidecar_manager_arc.lock().await;
                    let metadata = crate::sidecar::SidecarMetadata {
                        language: language.clone(),
                        version: version.clone(),
                        ipc_protocol_version: *ipc_protocol_version,
                        capabilities: capabilities.clone(),
                    };
                    sidecar_manager.set_initial_response_received(metadata);
                }
            }
        }

        _ => {
            // Handle other message types
            println!("Received message from client {}: {:?}", client_id, message);
        }
    }
}

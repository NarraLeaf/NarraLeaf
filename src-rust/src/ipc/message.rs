/*!
 * Message Processing
 * 
 * Handles incoming messages and routes them to appropriate handlers
 */

use std::sync::Arc;
use crate::ipc::types::ServerState;
use crate::ipc::client::send_message_to_client_by_id;
use crate::communication::{SidecarMessage, PROTOCOL_VERSION};
use crate::operations::OperationExecutor;

/// Process incoming message
pub async fn process_message(
    message: &SidecarMessage,
    client_id: &str,
    server_state: &Arc<ServerState>,
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

            // Process the sidecar request using the operations framework
            #[cfg(feature = "tauri-plugin")]
            let result = OperationExecutor::execute_from_ipc(
                &request_type,
                payload.clone(),
                None, // No app handle in IPC context
            ).await;

            #[cfg(not(feature = "tauri-plugin"))]
            let result = OperationExecutor::execute_from_ipc(
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


        _ => {
            // Handle other message types
            println!("Received message from client {}: {:?}", client_id, message);
        }
    }
}

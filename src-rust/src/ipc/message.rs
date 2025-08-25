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
) {
    match message {
        SidecarMessage::Request { id, request_type, payload } => {
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
        
        SidecarMessage::Ping { timestamp } => {
            // Respond with pong
            let pong = SidecarMessage::Pong { timestamp: *timestamp };
            if let Err(e) = send_message_to_client_by_id(
                client_id, server_state, &pong
            ).await {
                println!("Failed to send pong to client {}: {}", client_id, e);
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

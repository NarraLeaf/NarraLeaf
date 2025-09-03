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
        SidecarMessage::ServiceRequest { id, request_type, payload } => {
            // Handle request using OperationExecutor
            let result = OperationExecutor::execute_from_ipc(
                &request_type,
                payload.clone(),
                server_state.app_handle.as_ref(),
            ).await;

            // Create response based on operation result
            let response = SidecarMessage::ServiceResponse {
                id: id.clone(),
                success: result.success,
                data: result.data,
                error: result.message,
            };

            // Send response back to client
            if let Err(e) = send_message_to_client_by_id(
                client_id, server_state, &response
            ).await {
                println!("Failed to send response to client {}: {}", client_id, e);
            }
        }

        SidecarMessage::ServiceResponse { id, success, data: _, error: _ } => {
            // Handle response from sidecar - route to waiting request
            println!("Received service response for request {}: success={}", id, success);

            let mut pending_requests = server_state.pending_requests.write().await;
            if let Some(sender) = pending_requests.remove(id) {
                // Send response back to waiting request
                if let Err(_) = sender.send(message.clone()) {
                    println!("Failed to send service response to waiting request {}", id);
                }
            } else {
                println!("No pending request found for service response {}", id);
            }
        }

        SidecarMessage::RuntimeRequest { id, request_type, payload, response_channel: _ } => {
            // Handle request from sidecar (e.g., tauri: operations)
            println!("Received runtime request: {} -> {}", request_type, id);
            println!("Request payload: {:?}", payload);
            println!("App handle available: {}", server_state.app_handle.is_some());

            // Process the runtime request using the operations framework
            let result = OperationExecutor::execute_from_ipc(
                &request_type,
                payload.clone(),
                server_state.app_handle.as_ref(), // Pass the app handle from server state
            ).await;

            println!("Operation result: success={}, message={:?}", result.success, result.message);

            // Create response based on operation result
            let response = SidecarMessage::RuntimeResponse {
                id: id.clone(),
                success: result.success,
                data: result.data,
                error: result.message,
            };

            println!("Sending runtime response: {} -> success={}", id, result.success);
            if let Err(e) = send_message_to_client_by_id(
                client_id, server_state, &response
            ).await {
                println!("Failed to send runtime request response: {}", e);
            } else {
                println!("Runtime response sent successfully: {}", id);
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

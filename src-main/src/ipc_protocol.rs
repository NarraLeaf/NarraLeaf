/*!
 * IPC Protocol Handler
 *
 * This module provides an alternative IPC command for enhanced security and isolation.
 * Instead of using custom URI scheme protocols (which have limitations), this module
 * provides a new Tauri command that can be invoked from the renderer.
 *
 * Key security features:
 * - Request IDs are automatically generated on the Rust side to prevent ID-related attacks
 * - Strict validation of request types (only narraleaf: namespace allowed)
 * - Server-side UUID generation ensures uniqueness and security
 *
 * The handler processes IPC requests and forwards them to the sidecar process
 * using the existing IPC infrastructure.
 */

use std::sync::Arc;
use uuid::Uuid;

use crate::tauri::{PluginState, IPCRequest, IPCResponse};

/**
 * IPC Protocol Handler
 *
 * Provides an alternative IPC command for renderer communication
 *
 * ## Usage Example (from renderer):
 *
 * ```javascript
 * const response = await fetch('ipc://rpc', {
 *   request_type: 'narraleaf:get_user_data',  // No ID needed
 *   payload: { userId: 123 }
 * });
 * // Response will include the server-generated ID
 * console.log('Request ID:', response.id);
 * ```
 */
pub struct IPCProtocolHandler;

impl IPCProtocolHandler {
    /**
     * Handle IPC requests via Tauri command
     *
     * This function provides an alternative to the traditional request_ipc command
     * with additional security checks and protocol validation.
     *
     * Note: Request ID is automatically generated on the Rust side for security
     */
    pub async fn handle_ipc_request(
        mut request: IPCRequest,
        state: Arc<PluginState>,
    ) -> Result<IPCResponse, String> {
        // Generate secure request ID on the Rust side
        let request_id = Uuid::new_v4().to_string();
        request.id = request_id.clone();

        // Basic request logging
        let current_time = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs();
        // Only log significant requests to reduce noise
        if request.request_type.contains("game") || request.request_type.contains("save") || request.request_type.contains("load") {
            println!("IPC Protocol Request: {} (id: {}) at {}", request.request_type, request_id, current_time);
        }

        // Security check: Only allow narraleaf: namespace requests from renderer
        if !request.request_type.starts_with("narraleaf:") {
            println!("Rejected non-narraleaf request: {}", request.request_type);
            return Ok(IPCResponse {
                id: request_id,
                success: false,
                data: None,
                error: Some(format!("Access denied: Only 'narraleaf:' namespace requests are allowed from renderer. Got: {}", request.request_type)),
            });
        }

        // Additional protocol validation
        if !Self::validate_request_format(&request) {
            return Ok(IPCResponse {
                id: request_id,
                success: false,
                data: None,
                error: Some("Invalid request format".to_string()),
            });
        }

        // Forward all narraleaf: operations to NodeJS sidecar
        // Only log significant operations to reduce noise
        if request.request_type.contains("game") || request.request_type.contains("save") || request.request_type.contains("load") {
            println!("Forwarding narraleaf operation to sidecar: {} (id: {})", request.request_type, request_id);
        }
        Self::forward_to_sidecar(request, state).await
    }

    /**
     * Validate IPC request format
     *
     * Note: Request ID validation is no longer needed since it's generated server-side
     */
    fn validate_request_format(request: &IPCRequest) -> bool {
        // Check if request type is not empty
        !request.request_type.is_empty() &&
        // Check if request type starts with narraleaf:
        request.request_type.starts_with("narraleaf:")
    }

    /**
     * Forward request to NodeJS sidecar process
     *
     * This function implements the complete request-response cycle with the NodeJS sidecar.
     * It reuses the logic from the original forward_to_sidecar function in tauri.rs
     */
    async fn forward_to_sidecar(
        request: IPCRequest,
        state: Arc<PluginState>,
    ) -> Result<IPCResponse, String> {
        use std::time::Duration;
        use tokio::sync::oneshot;

        // Get sidecar manager
        let manager = state.sidecar_manager.lock().await;

        // Check if IPC server is available
        let ipc_server = match manager.get_ipc_server() {
            Some(server) => server,
            None => {
                return Ok(IPCResponse {
                    id: request.id.clone(),
                    success: false,
                    data: None,
                    error: Some("IPC server not available - service not running".to_string()),
                });
            }
        };

        // Check if any clients are connected to the sidecar
        let connected_clients = ipc_server.get_connected_clients().await;
        if connected_clients.is_empty() {
            return Ok(IPCResponse {
                id: request.id.clone(),
                success: false,
                data: None,
                error: Some("No sidecar clients connected".to_string()),
            });
        }

        // Use the request's ID for message correlation
        let message_id = request.id.clone();

        // Create response channel for this request
        let (response_tx, response_rx) = oneshot::channel::<crate::communication::SidecarMessage>();

        // Register the pending request
        {
            let server_state = ipc_server.get_server_state();
            let mut pending_requests = server_state.pending_requests.write().await;
            pending_requests.insert(message_id.clone(), response_tx);
        }

        // Create sidecar message
        let sidecar_message = crate::communication::SidecarMessage::ServiceRequest {
            id: request.id.clone(),
            request_type: request.request_type.clone(),
            payload: request.payload.clone(),
        };

        // Only log significant messages to reduce noise
        if request.request_type.contains("game") || request.request_type.contains("save") || request.request_type.contains("load") {
            println!("Forwarding to sidecar: {} -> {:?}", request.request_type, sidecar_message);
        }

        // Send the message to the first connected client
        let client_id = &connected_clients[0];

        match ipc_server.send_to_client(client_id, &sidecar_message).await {
            Ok(_) => {
                // Only log significant messages to reduce noise
                if request.request_type.contains("game") || request.request_type.contains("save") || request.request_type.contains("load") {
                    println!("Message sent to sidecar client: {}", client_id);
                }

                // Wait for response with timeout
                match tokio::time::timeout(Duration::from_secs(30), response_rx).await {
                    Ok(Ok(response_message)) => {
                        // Process the response
                        match response_message {
                            crate::communication::SidecarMessage::ServiceResponse { id, success, data, error } => {
                                // Only log significant responses to reduce noise
                                if request.request_type.contains("game") || request.request_type.contains("save") || request.request_type.contains("load") {
                                    println!("Received response for {}: success={}", id, success);
                                }
                                Ok(IPCResponse {
                                    id,
                                    success,
                                    data,
                                    error,
                                })
                            }
                            _ => {
                                println!("Unexpected response message type");
                                Ok(IPCResponse {
                                    id: request.id.clone(),
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
                            id: request.id.clone(),
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
                            id: request.id.clone(),
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
                    id: request.id.clone(),
                    success: false,
                    data: None,
                    error: Some(format!("Failed to communicate with sidecar: {}", e)),
                })
            }
        }
    }
}

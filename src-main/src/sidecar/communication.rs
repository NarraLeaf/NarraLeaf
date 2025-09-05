/*!
 * Sidecar Communication Management
 *
 * Handles communication with the NodeJS sidecar process including
 * sending requests and managing IPC connections.
 */

use crate::ipc::IPCServer;
use crate::communication::SidecarMessage;
use serde_json::Value;

/**
 * Sidecar Communication Manager
 *
 * Manages communication with the NodeJS sidecar process
 */
pub struct SidecarCommunication {
    ipc_server: Option<IPCServer>,
    connection_string: String,
    pub debug_mode: bool,
}

impl SidecarCommunication {
    pub fn new(connection_string: String, debug_mode: bool) -> Self {
        Self {
            ipc_server: None,
            connection_string,
            debug_mode,
        }
    }

    /**
     * Initialize IPC server
     */
    pub async fn initialize_ipc_server(&mut self, app_handle: Option<&tauri::AppHandle>) -> Result<(), String> {
        if self.debug_mode {
            println!("[SIDECAR] Starting IPC server...");
        }

        let mut ipc_server = if let Some(app_handle) = app_handle {
            if self.debug_mode {
                println!("[SIDECAR] Using app handle for IPC server");
            }
            IPCServer::with_app_handle(self.connection_string.clone(), app_handle.clone())
        } else {
            println!("[SIDECAR] WARNING: No app handle available, using basic IPC server");
            IPCServer::new(self.connection_string.clone())
        };
        
        // Actually start the IPC server
        if let Err(e) = ipc_server.start().await {
            return Err(format!("Failed to start IPC server: {}", e));
        }
        if self.debug_mode {
            println!("[SIDECAR] IPC server started successfully");
        }
        
        // Wait for IPC server to be fully ready with timeout
        if self.debug_mode {
            println!("[SIDECAR] Waiting for IPC server to be fully ready...");
        }
        if let Err(e) = ipc_server.wait_for_ready(5000).await {
            return Err(format!("IPC server failed to become ready: {}", e));
        }
        if self.debug_mode {
            println!("[SIDECAR] IPC server is ready and accepting connections");
        }
        
        // Store the server
        self.ipc_server = Some(ipc_server);
        if self.debug_mode {
            println!("[SIDECAR] IPC server stored and initialized");
        }

        Ok(())
    }

    /**
     * Stop IPC server
     */
    pub async fn stop_ipc_server(&mut self) -> Result<(), String> {
        println!("[SIDECAR] Stopping IPC server...");
        if let Some(mut ipc_server) = self.ipc_server.take() {
            println!("[SIDECAR] IPC server found, stopping...");
            ipc_server.stop().await?;
            println!("[SIDECAR] IPC server stopped successfully");
        } else {
            println!("[SIDECAR] INFO: No IPC server to stop");
        }

        Ok(())
    }

    /**
     * Send a sidecar request and wait for response
     */
    pub async fn send_sidecar_request(
        &self,
        request_type: &str,
        payload: Value,
    ) -> Result<Value, String> {
        use std::time::Duration;
        use tokio::sync::oneshot;

        if self.debug_mode {
            println!("[SIDECAR] Sending sidecar request...");
            println!("[SIDECAR] Request type: {}", request_type);
            println!("[SIDECAR] Payload: {:?}", payload);
        }

        if let Some(ipc_server) = &self.ipc_server {
            let message_id = uuid::Uuid::new_v4().to_string();

            let message = SidecarMessage::ServiceRequest {
                id: message_id.clone(),
                request_type: request_type.to_string(),
                payload: payload.clone(),
            };

            if self.debug_mode {
                println!("[SIDECAR] Message ID: {}", message_id);
                println!("[SIDECAR] Sending sidecar request: {} -> {:?}", request_type, message);
            }

            // Get connected clients
            let connected_clients = ipc_server.get_connected_clients().await;
            if self.debug_mode {
                println!("[SIDECAR] Connected clients: {:?}", connected_clients);
            }
            
            if connected_clients.is_empty() {
                println!("[SIDECAR] ERROR: No sidecar clients connected");
                return Err("No sidecar clients connected".to_string());
            }

            // Create response channel for this request
            let (response_tx, response_rx) = oneshot::channel::<SidecarMessage>();

            // Register the pending request
            {
                let server_state = ipc_server.get_server_state();
                let mut pending_requests = server_state.pending_requests.write().await;
                pending_requests.insert(message_id.clone(), response_tx);
            }

            // Send to the first connected client (typically the NodeJS sidecar)
            let client_id = &connected_clients[0];
            if self.debug_mode {
                println!("[SIDECAR] Target client ID: {}", client_id);
            }

            match ipc_server.send_to_client(client_id, &message).await {
                Ok(_) => {
                    if self.debug_mode {
                        println!("[SIDECAR] Sidecar request sent successfully to client: {}", client_id);
                    }

                    // Wait for response with timeout
                    match tokio::time::timeout(Duration::from_secs(30), response_rx).await {
                        Ok(Ok(response_message)) => {
                            // Process the response
                            match response_message {
                                SidecarMessage::ServiceResponse { id, success, data, error } => {
                                    if self.debug_mode {
                                        println!("[SIDECAR] Received response for {}: success={}", id, success);
                                    }
                                    if success {
                                        Ok(data.unwrap_or(serde_json::Value::Null))
                                    } else {
                                        Err(error.unwrap_or("Unknown error".to_string()))
                                    }
                                }
                                _ => {
                                    println!("[SIDECAR] Unexpected response message type");
                                    Err("Unexpected response message type".to_string())
                                }
                            }
                        }
                        Ok(Err(_)) => {
                            println!("[SIDECAR] Response channel closed unexpectedly");
                            Err("Response channel closed unexpectedly".to_string())
                        }
                        Err(_) => {
                            println!("[SIDECAR] Timeout waiting for sidecar response");
                            // Clean up the pending request
                            {
                                let server_state = ipc_server.get_server_state();
                                let mut pending_requests = server_state.pending_requests.write().await;
                                pending_requests.remove(&message_id);
                            }
                            Err("Timeout waiting for sidecar response".to_string())
                        }
                    }
                },
                Err(e) => {
                    println!("[SIDECAR] ERROR: Failed to send sidecar request: {}", e);
                    println!("[SIDECAR] Client ID: {}", client_id);
                    // Clean up the pending request
                    {
                        let server_state = ipc_server.get_server_state();
                        let mut pending_requests = server_state.pending_requests.write().await;
                        pending_requests.remove(&message_id);
                    }
                    Err(format!("Failed to send request: {}", e))
                }
            }
        } else {
            println!("[SIDECAR] ERROR: IPC server not available");
            Err("IPC server not available".to_string())
        }
    }

    /**
     * Send a sidecar message to connected Rust processes
     */
    pub async fn send_sidecar_message(
        &self,
        message: &SidecarMessage,
    ) -> Result<(), String> {
        if let Some(ipc_server) = &self.ipc_server {
            let connected_clients = ipc_server.get_connected_clients().await;
            if connected_clients.is_empty() {
                return Err("No Rust clients connected".to_string());
            }

            let client_id = &connected_clients[0];
            ipc_server.send_to_client(client_id, message).await
        } else {
            Err("IPC server not available".to_string())
        }
    }

    /**
     * Get the connection string
     */
    pub fn get_connection_string(&self) -> &str {
        &self.connection_string
    }

    /**
     * Get IPC server reference (for external access)
     */
    pub fn get_ipc_server(&self) -> Option<&IPCServer> {
        self.ipc_server.as_ref()
    }
}

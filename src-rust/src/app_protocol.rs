/*!
 * App Protocol Handler
 *
 * This module handles the custom app:// protocol for NarraLeaf.
 * It provides secure access to application resources by routing requests
 * through the NodeJS sidecar for authentication and access control.
 *
 * Architecture:
 * Renderer -> app:// URL -> Rust (protocol handler) -> NodeJS sidecar -> Resource resolution
 */

#[cfg(feature = "tauri-plugin")]
use tauri::AppHandle;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Mutex;
#[cfg(feature = "tauri-plugin")]
use reqwest;
#[cfg(feature = "tauri-plugin")]
use uuid;

/**
 * App protocol request types - simplified to only file and network resources
 */
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AppResourceType {
    /// File resources (local files accessed via tauri://)
    File,
    /// Network resources (http/https URLs)
    Network,
}

/**
 * Resource access request
 */
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResourceRequest {
    pub resource_type: AppResourceType,
    pub path: String,
    pub query_params: Option<HashMap<String, String>>,
    pub headers: Option<HashMap<String, String>>,
}



/**
 * App protocol handler
 */
#[cfg(feature = "tauri-plugin")]
pub struct AppProtocolHandler {
    app_handle: AppHandle,
    sidecar_manager: Arc<Mutex<crate::sidecar::SidecarManager>>,
}

#[cfg(feature = "tauri-plugin")]
impl AppProtocolHandler {
    /**
     * Create a new app protocol handler
     */
    pub fn new(
        app_handle: AppHandle,
        sidecar_manager: Arc<Mutex<crate::sidecar::SidecarManager>>,
    ) -> Self {
        Self {
            app_handle,
            sidecar_manager,
        }
    }

    /**
     * Handle app:// protocol request
     */
    pub async fn handle_request(
        &self,
        request: &tauri::http::Request<Vec<u8>>,
    ) -> Result<tauri::http::Response<Vec<u8>>, Box<dyn std::error::Error>> {
        let uri = request.uri();
        let path = uri.path();
        let query = uri.query();

        println!("App protocol request: {}", path);

        // Create simplified resource request
        let resource_req = ResourceRequest {
            resource_type: AppResourceType::File, // Default to file, sidecar will determine actual type
            path: path.trim_start_matches('/').to_string(),
            query_params: query.and_then(|q| self.parse_query_params(q).ok().flatten()),
            headers: None,
        };

        // Request resolution from NodeJS sidecar
        let resolved_url = self.request_resolution_from_sidecar(resource_req).await?;

        // Handle based on resolved URL protocol
        self.handle_resolved_resource(resolved_url).await
    }



    /**
     * Parse query parameters
     */
    #[cfg(feature = "tauri-plugin")]
    fn parse_query_params(&self, query: &str) -> Result<Option<HashMap<String, String>>, Box<dyn std::error::Error>> {
        if query.is_empty() {
            return Ok(None);
        }

        let mut params = HashMap::new();

        for pair in query.split('&') {
            let mut parts = pair.split('=');
            if let (Some(key), Some(value)) = (parts.next(), parts.next()) {
                params.insert(
                    urlencoding::decode(key)?.into_owned(),
                    urlencoding::decode(value)?.into_owned(),
                );
            }
        }

        Ok(Some(params))
    }

    /**
     * Request resource resolution from NodeJS sidecar
     * Returns the resolved URL string directly
     */
    async fn request_resolution_from_sidecar(
        &self,
        resource_req: ResourceRequest,
    ) -> Result<String, Box<dyn std::error::Error>> {
        // Get sidecar manager
        let manager = self.sidecar_manager.lock().await;

        // Check if IPC server is available
        let ipc_server = match &manager.ipc_server {
            Some(server) => server,
            None => {
                // Return default fallback URL if no sidecar available
                return Ok(format!("tauri://localhost/{}", resource_req.path));
            }
        };

        // Create resolution request message
        let message_id = uuid::Uuid::new_v4().to_string();
        let payload = serde_json::to_value(&resource_req)?;

        let message = crate::communication::SidecarMessage::Request {
            id: message_id,
            request_type: "resolve_app_resource".to_string(),
            payload,
        };

        // Send message to sidecar and wait for response
        self.send_resolution_request_to_sidecar(message).await
    }

    /**
     * Send resolution request to sidecar and wait for response
     */
    async fn send_resolution_request_to_sidecar(
        &self,
        message: crate::communication::SidecarMessage,
    ) -> Result<String, Box<dyn std::error::Error>> {
        use std::time::Duration;
        use tokio::sync::oneshot;

        // Get sidecar manager
        let manager = self.sidecar_manager.lock().await;

        // Check if IPC server is available
        let ipc_server = match &manager.ipc_server {
            Some(server) => server,
            None => {
                // Fallback to simulation if no sidecar available
                return self.simulate_sidecar_resolution_from_message(&message);
            }
        };

        // Check if any clients are connected to the sidecar
        let connected_clients = ipc_server.get_connected_clients().await;
        if connected_clients.is_empty() {
            return self.simulate_sidecar_resolution_from_message(&message);
        }

        // Create response channel for this request
        let (response_tx, response_rx) = oneshot::channel::<crate::communication::SidecarMessage>();

        // Register the pending request
        let message_id = match &message {
            crate::communication::SidecarMessage::Request { id, .. } => id.clone(),
            _ => return Err("Invalid message type".into()),
        };

        {
            let server_state = ipc_server.get_server_state();
            let mut pending_requests = server_state.pending_requests.write().await;
            pending_requests.insert(message_id.clone(), response_tx);
        }

        // Send the message to the first connected client
        let client_id = &connected_clients[0];

        match ipc_server.send_to_client(client_id, &message).await {
            Ok(_) => {
                println!("Resolution request sent to sidecar client: {}", client_id);

                // Wait for response with timeout
                match tokio::time::timeout(Duration::from_secs(10), response_rx).await {
                    Ok(Ok(response_message)) => {
                        // Process the response
                        match response_message {
                            crate::communication::SidecarMessage::Response { success, data, error, .. } => {
                                if success {
                                    if let Some(data) = data {
                                        if let Some(url) = data.get("resolved_url").and_then(|u| u.as_str()) {
                                            Ok(url.to_string())
                                        } else {
                                            Err("Invalid response format: missing resolved_url".into())
                                        }
                                    } else {
                                        Err("Invalid response format: missing data".into())
                                    }
                                } else {
                                    Err(error.unwrap_or_else(|| "Sidecar resolution failed".to_string()).into())
                                }
                            }
                            _ => {
                                Err("Unexpected response message type".into())
                            }
                        }
                    }
                    Ok(Err(_)) => {
                        Err("Response channel closed unexpectedly".into())
                    }
                    Err(_) => {
                        // Clean up the pending request
                        {
                            let server_state = ipc_server.get_server_state();
                            let mut pending_requests = server_state.pending_requests.write().await;
                            pending_requests.remove(&message_id);
                        }
                        Err("Timeout waiting for sidecar response".into())
                    }
                }
            },
            Err(e) => {
                // Clean up the pending request
                {
                    let server_state = ipc_server.get_server_state();
                    let mut pending_requests = server_state.pending_requests.write().await;
                    pending_requests.remove(&message_id);
                }
                Err(format!("Failed to communicate with sidecar: {}", e).into())
            }
        }
    }

    /**
     * Simulate sidecar resource resolution (for development)
     * Returns the resolved URL string directly
     */
    fn simulate_sidecar_resolution_from_message(
        &self,
        message: &crate::communication::SidecarMessage,
    ) -> Result<String, Box<dyn std::error::Error>> {
        match message {
            crate::communication::SidecarMessage::Request { payload, .. } => {
                let resource_req: ResourceRequest = serde_json::from_value(payload.clone())?;

                // Simple simulation: determine if it's a file or network resource
                if resource_req.path.starts_with("http://") || resource_req.path.starts_with("https://") {
                    // Already a network URL
                    Ok(resource_req.path.clone())
                } else {
                    // Convert to tauri:// URL for local files
                    Ok(format!("tauri://localhost/{}", resource_req.path))
                }
            }
            _ => Err("Invalid message type for resolution".into())
        }
    }

    /**
     * Handle resolved resource based on URL protocol
     */
    async fn handle_resolved_resource(
        &self,
        resolved_url: String,
    ) -> Result<tauri::http::Response<Vec<u8>>, Box<dyn std::error::Error>> {
        if resolved_url.starts_with("tauri://") {
            // Handle tauri:// protocol - read local file
            self.handle_tauri_resource(&resolved_url).await
        } else if resolved_url.starts_with("http://") || resolved_url.starts_with("https://") {
            // Handle http/https protocol - fetch from network
            self.handle_network_resource(&resolved_url).await
        } else {
            // Unknown protocol
            self.create_error_response(400, format!("Unsupported protocol in URL: {}", resolved_url))
        }
    }

    /**
     * Handle tauri:// protocol resources
     */
    async fn handle_tauri_resource(
        &self,
        resolved_url: &str,
    ) -> Result<tauri::http::Response<Vec<u8>>, Box<dyn std::error::Error>> {
        let asset_path = resolved_url.trim_start_matches("tauri://localhost/");
        let asset_data = self.app_handle.asset_resolver().get(asset_path.to_string());

        match asset_data {
            Some(data) => {
                let mut response = tauri::http::Response::builder()
                    .status(200);

                if let Some(content_type) = self.guess_content_type(asset_path) {
                    response = response.header("Content-Type", content_type);
                }

                response = response.header("Cache-Control", "public, max-age=3600");

                Ok(response.body(data.bytes)?)
            }
            None => {
                self.create_error_response(404, format!("Asset not found: {}", asset_path))
            }
        }
    }

    /**
     * Handle http/https protocol resources
     */
    async fn handle_network_resource(
        &self,
        resolved_url: &str,
    ) -> Result<tauri::http::Response<Vec<u8>>, Box<dyn std::error::Error>> {
        // Fetch the resource from the network
        let client = reqwest::Client::new();
        let response = client.get(resolved_url).send().await?;

        let status = response.status().as_u16();
        let headers = response.headers().clone();
        let body = response.bytes().await?;

        // Build the response
        let mut builder = tauri::http::Response::builder().status(status);

        // Copy relevant headers
        for (key, value) in headers.iter() {
            if key == "content-type" || key == "cache-control" || key == "etag" {
                builder = builder.header(key, value);
            }
        }

        Ok(builder.body(body.to_vec())?)
    }

    /**
     * Guess content type from file extension
     */
    fn guess_content_type(&self, path: &str) -> Option<String> {
        let ext = path.split('.').last()?.to_lowercase();

        match ext.as_str() {
            "png" => Some("image/png".to_string()),
            "jpg" | "jpeg" => Some("image/jpeg".to_string()),
            "gif" => Some("image/gif".to_string()),
            "svg" => Some("image/svg+xml".to_string()),
            "css" => Some("text/css".to_string()),
            "js" => Some("application/javascript".to_string()),
            "json" => Some("application/json".to_string()),
            "html" => Some("text/html".to_string()),
            "txt" => Some("text/plain".to_string()),
            _ => Some("application/octet-stream".to_string()),
        }
    }

    /**
     * Create error response
     */
    fn create_error_response(
        &self,
        status: u16,
        message: String,
    ) -> Result<tauri::http::Response<Vec<u8>>, Box<dyn std::error::Error>> {
        let body = format!(r#"{{"error": "{}", "status": {}}}"#, message, status);
        Ok(tauri::http::Response::builder()
            .status(status)
            .header("Content-Type", "application/json")
            .body(body.into_bytes())?)
    }
}

/**
 * Create app protocol handler instance
 */
#[cfg(feature = "tauri-plugin")]
pub fn create_app_protocol_handler(
    app_handle: AppHandle,
    sidecar_manager: Arc<Mutex<crate::sidecar::SidecarManager>>,
) -> AppProtocolHandler {
    AppProtocolHandler::new(app_handle, sidecar_manager)
}

/**
 * Handle app protocol request (standalone function for Tauri)
 */
#[cfg(feature = "tauri-plugin")]
pub async fn handle_app_protocol_request(
    app: &AppHandle,
    request: &tauri::http::Request<Vec<u8>>,
    sidecar_manager: Arc<Mutex<crate::sidecar::SidecarManager>>,
) -> Result<tauri::http::Response<Vec<u8>>, Box<dyn std::error::Error>> {
    let handler = AppProtocolHandler::new(app.clone(), sidecar_manager);
    handler.handle_request(request).await
}

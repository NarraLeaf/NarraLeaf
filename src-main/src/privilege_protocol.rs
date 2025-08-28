/*!
 * Privilege Protocol Handler
 *
 * This module handles the URI scheme protocol for privileged IPC communication.
 * It provides secure handling of ipc://rpc requests from the renderer process,
 * including request parsing, validation, and response formatting.
 */

use tauri::http::Response;

use crate::tauri::{IPCRequest, IPCResponse};
use crate::ipc_protocol::IPCProtocolHandler;

/**
 * Privilege Protocol Handler
 *
 * Handles URI scheme protocol requests for privileged IPC communication
 */
pub struct PrivilegeProtocolHandler;

impl PrivilegeProtocolHandler {
    /**
     * Handle ipc://rpc URI scheme requests
     *
     * This function processes privileged IPC requests from the renderer,
     * validates them, and forwards them to the IPC protocol handler.
     */
    pub fn handle_uri_scheme_request(
        request: &tauri::http::Request<Vec<u8>>,
    ) -> Response<Vec<u8>> {
        // Parse the request URL and body
        let url = request.uri().to_string();
        let method = request.method();

        if method != "POST" || !url.contains("/rpc") {
            let response_body = r#"{"error": "Only POST requests to /rpc are supported"}"#;
            return Self::create_error_response(405, response_body);
        }

        // Extract request body
        let body_bytes = request.body();

        // Parse JSON request body
        let ipc_request: IPCRequest = match serde_json::from_slice(&body_bytes) {
            Ok(req) => req,
            Err(e) => {
                let response_body = format!(r#"{{"error": "Invalid JSON request: {}"}}"#, e);
                return Self::create_error_response(400, &response_body);
            }
        };

        // Get plugin state from global reference
        let plugin_state = match super::tauri::get_global_plugin_state() {
            Some(state) => state,
            None => {
                let response_body = r#"{"error": "Plugin state not available"}"#;
                return Self::create_error_response(500, response_body);
            }
        };

        // Create a channel to receive the async response
        let (tx, rx) = std::sync::mpsc::channel::<Result<IPCResponse, String>>();

        // Spawn async task to handle the request
        let request_clone = ipc_request.clone();
        tauri::async_runtime::spawn(async move {
            let result = IPCProtocolHandler::handle_ipc_request(request_clone, plugin_state).await;
            let _ = tx.send(result);
        });

        // Wait for the async response with timeout
        match rx.recv_timeout(std::time::Duration::from_secs(30)) {
            Ok(Ok(response)) => {
                let response_body = serde_json::to_string(&response)
                    .unwrap_or_else(|_| r#"{"error": "Failed to serialize response"}"#.to_string());
                Self::create_success_response(&response_body)
            }
            Ok(Err(e)) => {
                let response_body = format!(r#"{{"error": "{}"}}"#, e);
                Self::create_error_response(500, &response_body)
            }
            Err(_) => {
                let response_body = r#"{"error": "Request timeout"}"#;
                Self::create_error_response(408, response_body)
            }
        }
    }

    /**
     * Create a successful HTTP response
     */
    fn create_success_response(body: &str) -> Response<Vec<u8>> {
        Response::builder()
            .status(200)
            .header("Content-Type", "application/json")
            .body(body.as_bytes().to_vec())
            .unwrap_or_else(|_| {
                Response::builder()
                    .status(500)
                    .body(Vec::new())
                    .unwrap()
            })
    }

    /**
     * Create an error HTTP response
     */
    fn create_error_response(status: u16, body: &str) -> Response<Vec<u8>> {
        Response::builder()
            .status(status)
            .header("Content-Type", "application/json")
            .body(body.as_bytes().to_vec())
            .unwrap_or_else(|_| {
                Response::builder()
                    .status(500)
                    .body(Vec::new())
                    .unwrap()
            })
    }
}

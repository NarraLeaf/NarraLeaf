/*!
 * NodeJS Sidecar Manager
 *
 * This module manages the lifecycle and communication with the NodeJS sidecar process.
 * It provides a simple, focused API for Tauri plugin integration.
 */

use crate::ipc::IPCServer;

/**
 * Lifecycle state of the sidecar process
 */
#[derive(Debug, Clone, PartialEq)]
pub enum SidecarState {
    Stopped,
    Starting,
    Running,
    Stopping,
    Failed,
}

/**
 * Sidecar Manager
 *
 * Manages the NodeJS sidecar process and handles communication with it.
 */
pub struct SidecarManager {
    child_process: Option<tokio::process::Child>,
    pub ipc_server: Option<IPCServer>,
    connection_string: String,
    pub state: SidecarState,
    last_health_check: std::time::Instant,
    last_heartbeat: std::time::Instant,
    heartbeat_interval: std::time::Duration,
    initial_response_received: bool,
    sidecar_metadata: Option<SidecarMetadata>,
}

/**
 * Sidecar metadata from initial response
 */
#[derive(Debug, Clone)]
pub struct SidecarMetadata {
    pub language: String,
    pub version: String,
    pub ipc_protocol_version: u32,
    pub capabilities: Vec<String>,
}

impl SidecarManager {
    pub fn new() -> Self {
        let connection_string = Self::generate_connection_string();

        Self {
            child_process: None,
            ipc_server: None,
            connection_string,
            state: SidecarState::Stopped,
            last_health_check: std::time::Instant::now(),
            last_heartbeat: std::time::Instant::now(),
            heartbeat_interval: std::time::Duration::from_secs(30),
            initial_response_received: false,
            sidecar_metadata: None,
        }
    }

    pub fn new_with_connection_string(connection_string: String) -> Self {
        Self {
            child_process: None,
            ipc_server: None,
            connection_string,
            state: SidecarState::Stopped,
            last_health_check: std::time::Instant::now(),
            last_heartbeat: std::time::Instant::now(),
            heartbeat_interval: std::time::Duration::from_secs(30),
            initial_response_received: false,
            sidecar_metadata: None,
        }
    }

    pub async fn start(&mut self) -> Result<(), String> {
        if self.state != SidecarState::Stopped {
            return Err(format!("Cannot start sidecar: current state is {:?}", self.state));
        }

        self.state = SidecarState::Starting;

        let mut ipc_server = IPCServer::new(self.connection_string.clone());
        ipc_server.start().await?;

        self.ipc_server = Some(ipc_server);
        self.state = SidecarState::Running;
        self.last_health_check = std::time::Instant::now();

        Ok(())
    }

    pub async fn start_sidecar_and_ipc(
        &mut self,
        sidecar_path: &str,
        connection_string: &str,
    ) -> Result<(), String> {
        if self.state != SidecarState::Stopped {
            return Err(format!("Cannot start sidecar: current state is {:?}", self.state));
        }

        self.state = SidecarState::Starting;

        // Start IPC server
        let ipc_server = IPCServer::new(connection_string.to_string());
        self.ipc_server = Some(ipc_server);

        // Start sidecar process
        self.start_sidecar_process(sidecar_path, connection_string).await?;

        // Wait for initial response from sidecar
        println!("⏳ Waiting for initial response from sidecar...");
        self.wait_for_initial_response().await?;

        self.state = SidecarState::Running;
        self.last_health_check = std::time::Instant::now();

        Ok(())
    }

    async fn start_sidecar_process(
        &mut self,
        sidecar_path: &str,
        connection_string: &str,
    ) -> Result<(), String> {
        use std::process::Stdio;
        use tokio::process::Command;

        // Set environment variables
        let mut env_vars = std::env::vars().collect::<std::collections::HashMap<_, _>>();
        env_vars.insert("NARRALEAF_IPC_CONNECTION".to_string(), connection_string.to_string());

        // Determine command
        let (program, args) = if sidecar_path.ends_with(".js") || sidecar_path.ends_with(".mjs") {
            ("node", vec![sidecar_path.to_string()])
        } else {
            (sidecar_path, vec![])
        };

        // Start process
        let child = Command::new(program)
            .args(&args)
            .envs(&env_vars)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .map_err(|e| format!("Failed to start sidecar process: {}", e))?;

        self.child_process = Some(child);

        // Give the sidecar time to initialize
        tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;

        Ok(())
    }

    pub async fn stop(&mut self) -> Result<(), String> {
        if self.state == SidecarState::Stopped {
            return Ok(());
        }

        self.state = SidecarState::Stopping;

        // Stop IPC server
        if let Some(mut ipc_server) = self.ipc_server.take() {
            ipc_server.stop().await?;
        }

        // Kill child process
        if let Some(mut child) = self.child_process.take() {
            let _ = child.kill().await;
        }

        self.state = SidecarState::Stopped;

        Ok(())
    }

    pub fn is_running(&self) -> bool {
        matches!(self.state, SidecarState::Running)
    }

    pub fn get_state(&self) -> &SidecarState {
        &self.state
    }

    pub fn get_connection_string(&self) -> &str {
        &self.connection_string
    }

    /**
     * Wait for initial response from sidecar
     * This ensures the sidecar is properly initialized and reports its metadata
     */
    async fn wait_for_initial_response(&mut self) -> Result<(), String> {
        let start_time = std::time::Instant::now();
        let timeout = std::time::Duration::from_secs(30); // 30 second timeout

        while start_time.elapsed() < timeout {
            // Check if we have any connected clients
            if let Some(ipc_server) = &self.ipc_server {
                let connected_clients = ipc_server.get_connected_clients().await;

                if !connected_clients.is_empty() {
                    // We have connected clients, but we need to wait for the initial response
                    // The initial response will be processed in the message handler
                    // For now, we'll just wait a bit more to ensure the sidecar has time to send it
                    tokio::time::sleep(std::time::Duration::from_millis(100)).await;
                    continue;
                }
            }

            // Sleep and check again
            tokio::time::sleep(std::time::Duration::from_millis(500)).await;
        }

        // Check if initial response was received
        if !self.initial_response_received {
            return Err("Timeout waiting for initial response from sidecar".to_string());
        }

        println!("✅ Initial response received successfully");
        Ok(())
    }

    /**
     * Mark initial response as received and store metadata
     */
    pub fn set_initial_response_received(&mut self, metadata: SidecarMetadata) {
        self.initial_response_received = true;
        self.sidecar_metadata = Some(metadata);
        println!("📡 Initial response processed and stored");
    }

    fn generate_connection_string() -> String {
        use uuid::Uuid;
        format!("narraleaf-ipc-{}", Uuid::new_v4().simple())
    }

    pub async fn monitor_sidecar_health(&mut self) {
        while self.state == SidecarState::Running {
            // Check if child process is still running
            if let Some(ref mut child) = self.child_process {
                match child.try_wait() {
                    Ok(Some(exit_status)) => {
                        println!("⚠️  Sidecar process exited with status: {}", exit_status);
                        self.state = SidecarState::Failed;

                        // Trigger main process shutdown since sidecar died
                        self.trigger_main_process_shutdown().await;
                        break;
                    }
                    Ok(None) => {
                        // Process is still running
                        self.last_health_check = std::time::Instant::now();
                    }
                    Err(e) => {
                        println!("⚠️  Error checking sidecar process status: {}", e);
                        self.state = SidecarState::Failed;
                        self.trigger_main_process_shutdown().await;
                        break;
                    }
                }
            } else {
                self.state = SidecarState::Failed;
                self.trigger_main_process_shutdown().await;
                break;
            }

            // Send heartbeat if interval has passed
            if self.last_heartbeat.elapsed() >= self.heartbeat_interval {
                if let Err(e) = self.send_heartbeat().await {
                    println!("Heartbeat failed: {}", e);
                    // Continue monitoring even if heartbeat fails
                }
            }

            // Sleep for a shorter interval to check heartbeat timing
            tokio::time::sleep(std::time::Duration::from_secs(5)).await;
        }
    }

    /**
     * Trigger main process shutdown when sidecar dies
     */
    async fn trigger_main_process_shutdown(&self) {
        println!("🔄 Sidecar died, triggering main process shutdown...");

        // Send a special request to trigger main process shutdown
        if let Some(ipc_server) = &self.ipc_server {
            let connected_clients = ipc_server.get_connected_clients().await;
            if !connected_clients.is_empty() {
                let client_id = &connected_clients[0];

                // Send a shutdown request to the main process
                let shutdown_message = crate::communication::SidecarMessage::SidecarRequest {
                    id: uuid::Uuid::new_v4().to_string(),
                    request_type: "tauri:shutdown".to_string(),
                    payload: serde_json::json!({
                        "reason": "sidecar_died",
                        "message": "Sidecar process terminated unexpectedly"
                    }),
                    response_channel: format!("shutdown_response_{}", std::time::SystemTime::now()
                        .duration_since(std::time::UNIX_EPOCH)
                        .unwrap_or_default()
                        .as_millis()),
                };

                if let Err(e) = ipc_server.send_to_client(client_id, &shutdown_message).await {
                    println!("Failed to send shutdown request: {}", e);
                }
            }
        }
    }

    /**
     * Send a narraleaf: request from sidecar to Rust (for tauri: operations)
     */
    pub async fn send_sidecar_request(
        &self,
        request_type: &str,
        payload: serde_json::Value,
    ) -> Result<serde_json::Value, String> {
        if let Some(ipc_server) = &self.ipc_server {
            let message_id = uuid::Uuid::new_v4().to_string();
            let response_channel = format!("sidecar_response_{}", message_id);

            let message = crate::communication::SidecarMessage::SidecarRequest {
                id: message_id.clone(),
                request_type: request_type.to_string(),
                payload: payload.clone(),
                response_channel: response_channel.clone(),
            };

            println!("Sending sidecar request: {} -> {:?}", request_type, message);

            // Get connected clients
            let connected_clients = ipc_server.get_connected_clients().await;
            if connected_clients.is_empty() {
                return Err("No Rust clients connected".to_string());
            }

            // Send to the first connected client (typically the main Rust process)
            let client_id = &connected_clients[0];

            match ipc_server.send_to_client(client_id, &message).await {
                Ok(_) => {
                    println!("Sidecar request sent successfully to client: {}", client_id);

                    // Return a pending response - actual response will come asynchronously
                    Ok(serde_json::json!({
                        "message_id": message_id,
                        "request_type": request_type,
                        "status": "request_sent",
                        "note": "Response will be delivered asynchronously"
                    }))
                },
                Err(e) => {
                    println!("Failed to send sidecar request: {}", e);
                    Err(format!("Failed to send request: {}", e))
                }
            }
        } else {
            Err("IPC server not available".to_string())
        }
    }

    /**
     * Send a heartbeat ping to the main Rust process
     */
    pub async fn send_heartbeat(&mut self) -> Result<(), String> {
        if let Some(ipc_server) = &self.ipc_server {
            let timestamp = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis() as u64;

            let message = crate::communication::SidecarMessage::SidecarRequest {
                id: uuid::Uuid::new_v4().to_string(),
                request_type: "tauri:ping".to_string(),
                payload: serde_json::json!({
                    "timestamp": timestamp,
                    "source": "sidecar"
                }),
                response_channel: format!("heartbeat_response_{}", timestamp),
            };

            let connected_clients = ipc_server.get_connected_clients().await;
            if connected_clients.is_empty() {
                return Err("No Rust clients connected for heartbeat".to_string());
            }

            let client_id = &connected_clients[0];
            match ipc_server.send_to_client(client_id, &message).await {
                Ok(_) => {
                    println!("Heartbeat sent to Rust process at {}", timestamp);
                    self.last_heartbeat = std::time::Instant::now();
                    Ok(())
                },
                Err(e) => {
                    println!("Failed to send heartbeat: {}", e);
                    Err(format!("Failed to send heartbeat: {}", e))
                }
            }
        } else {
            Err("IPC server not available for heartbeat".to_string())
        }
    }

    /**
     * Send a sidecar message to connected Rust processes
     */
    pub async fn send_sidecar_message(
        &self,
        message: &crate::communication::SidecarMessage,
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
}

impl Drop for SidecarManager {
    fn drop(&mut self) {
        if self.state != SidecarState::Stopped {
            println!("Warning: SidecarManager dropped while still running");
        }
    }
}

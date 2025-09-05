/*!
 * NodeJS Sidecar Manager
 *
 * This module manages the lifecycle and communication with the NodeJS sidecar process.
 * It provides a simple, focused API for Tauri plugin integration.
 */

use crate::ipc::IPCServer;
use tauri::{AppHandle, Manager};

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
    app_handle: Option<AppHandle>,
    debug_mode: bool,
}

impl SidecarManager {
    pub fn new(connection_string: String, app_handle: AppHandle, debug_mode: bool) -> Self {

        Self {
            child_process: None,
            ipc_server: None,
            connection_string,
            state: SidecarState::Stopped,
            last_health_check: std::time::Instant::now(),
            app_handle: Some(app_handle),
            debug_mode,
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
        if self.debug_mode {
            println!("[SIDECAR] Starting sidecar and IPC server...");
            println!("[SIDECAR] Sidecar path: {}", sidecar_path);
            println!("[SIDECAR] Connection string: {}", connection_string);
            println!("[SIDECAR] Current state: {:?}", self.state);
        }

        if self.state != SidecarState::Stopped {
            println!("[SIDECAR] ERROR: Cannot start sidecar: current state is {:?}", self.state);
            return Err(format!("Cannot start sidecar: current state is {:?}", self.state));
        }

        self.state = SidecarState::Starting;
        if self.debug_mode {
            println!("[SIDECAR] State changed to: {:?}", self.state);
        }

        // Start IPC server with app handle for tauri operations
        if self.debug_mode {
            println!("[SIDECAR] Starting IPC server...");
        }
        let mut ipc_server = if let Some(app_handle) = &self.app_handle {
            if self.debug_mode {
                println!("[SIDECAR] Using app handle for IPC server");
            }
            IPCServer::with_app_handle(connection_string.to_string(), app_handle.clone())
        } else {
            println!("[SIDECAR] WARNING: No app handle available, using basic IPC server");
            IPCServer::new(connection_string.to_string())
        };
        
        // Actually start the IPC server before starting sidecar
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
        
        // Store the server before starting sidecar process
        self.ipc_server = Some(ipc_server);
        if self.debug_mode {
            println!("[SIDECAR] IPC server stored and initialized");
        }

        // Start sidecar process
        if self.debug_mode {
            println!("[SIDECAR] Starting sidecar process...");
        }
        self.start_sidecar_process(sidecar_path, connection_string).await?;

        self.state = SidecarState::Running;
        self.last_health_check = std::time::Instant::now();
        if self.debug_mode {
            println!("[SIDECAR] Sidecar and IPC server started successfully");
            println!("[SIDECAR] Final state: {:?}", self.state);
        }

        Ok(())
    }

    async fn start_sidecar_process(
        &mut self,
        sidecar_path: &str,
        connection_string: &str,
    ) -> Result<(), String> {
        use std::process::Stdio;
        use tokio::process::Command;

        if self.debug_mode {
            println!("[SIDECAR] Starting sidecar process...");
            println!("[SIDECAR] Original sidecar path: {}", sidecar_path);
            println!("[SIDECAR] Connection string: {}", connection_string);
        }

        // Set environment variables
        let mut env_vars = std::env::vars().collect::<std::collections::HashMap<_, _>>();
        env_vars.insert("NARRALEAF_IPC_CONNECTION".to_string(), connection_string.to_string());
        if self.debug_mode {
            println!("[SIDECAR] Environment variables set: NARRALEAF_IPC_CONNECTION={}", connection_string);
        }

        // Get the full path to the sidecar executable
        let full_sidecar_path = if sidecar_path.contains('/') || sidecar_path.contains('\\') {
            // If it's a relative path, resolve it relative to the resource directory
            if let Some(app_handle) = &self.app_handle {
                let resource_dir = app_handle.path().resource_dir()
                    .map_err(|e| format!("Failed to get resource directory: {}", e))?;
                let resolved_path = resource_dir.join(sidecar_path);
                if self.debug_mode {
                    println!("[SIDECAR] Resource directory: {:?}", resource_dir);
                    println!("[SIDECAR] Resolved sidecar path: {:?}", resolved_path);
                }
                resolved_path
            } else {
                return Err("Cannot resolve sidecar path without app handle".to_string());
            }
        } else {
            // If it's just a filename, assume it's in PATH
            let path_buf = std::path::PathBuf::from(sidecar_path);
            if self.debug_mode {
                println!("[SIDECAR] Using PATH-based sidecar path: {:?}", path_buf);
            }
            path_buf
        };

        // Determine command
        let (program, args) = if sidecar_path.ends_with(".js") || sidecar_path.ends_with(".mjs") {
            let cmd = ("node".to_string(), vec![sidecar_path.to_string()]);
            if self.debug_mode {
                println!("[SIDECAR] Detected JavaScript file, using Node.js");
                println!("[SIDECAR] Command: node {}", sidecar_path);
            }
            cmd
        } else {
            let program_str = full_sidecar_path.to_string_lossy().to_string();
            let cmd = (program_str.clone(), vec![]);
            if self.debug_mode {
                println!("[SIDECAR] Command: {}", program_str);
            }
            cmd
        };

        if self.debug_mode {
            println!("[SIDECAR] Final program: {}", program);
            println!("[SIDECAR] Arguments: {:?}", args);
            println!("[SIDECAR] Spawning sidecar process...");
        }
        
        // In debug mode, show the full command line being executed
        if self.debug_mode {
            let full_command = if args.is_empty() {
                program.clone()
            } else {
                format!("{} {}", program, args.join(" "))
            };
            println!("[DEBUG] Executing sidecar command: {}", full_command);
            println!("[DEBUG] Environment variables:");
            for (key, value) in &env_vars {
                if key.starts_with("NARRALEAF") {
                    println!("[DEBUG]   {}={}", key, value);
                }
            }
        }
        
        let child = Command::new(&program)
            .args(&args)
            .envs(&env_vars)
            .stdout(if self.debug_mode { Stdio::inherit() } else { Stdio::piped() })
            .stderr(if self.debug_mode { Stdio::inherit() } else { Stdio::piped() })
            .spawn()
            .map_err(|e| {
                println!("[SIDECAR] ERROR: Failed to start sidecar process: {}", e);
                println!("[SIDECAR] Program: {}", program);
                println!("[SIDECAR] Args: {:?}", args);
                format!("Failed to start sidecar process: {}", e)
            })?;

        println!("[SIDECAR] Sidecar process spawned successfully");
        println!("[SIDECAR] Process ID: {:?}", child.id());
        
        if self.debug_mode {
            println!("[DEBUG] Sidecar output will be redirected to main console");
        }

        self.child_process = Some(child);

        // Give the sidecar time to initialize
        println!("[SIDECAR] Waiting for sidecar initialization (500ms)...");
        tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
        println!("[SIDECAR] Sidecar initialization wait completed");

        Ok(())
    }

    pub async fn stop(&mut self) -> Result<(), String> {
        println!("[SIDECAR] Stopping sidecar manager...");
        println!("[SIDECAR] Current state: {:?}", self.state);

        if self.state == SidecarState::Stopped {
            println!("[SIDECAR] INFO: Sidecar is already stopped");
            return Ok(());
        }

        self.state = SidecarState::Stopping;
        println!("[SIDECAR] State changed to: {:?}", self.state);

        // Stop IPC server
        println!("[SIDECAR] Stopping IPC server...");
        if let Some(mut ipc_server) = self.ipc_server.take() {
            println!("[SIDECAR] IPC server found, stopping...");
            ipc_server.stop().await?;
            println!("[SIDECAR] IPC server stopped successfully");
        } else {
            println!("[SIDECAR] INFO: No IPC server to stop");
        }

        // Kill child process with timeout
        println!("[SIDECAR] Terminating sidecar process...");
        if let Some(mut child) = self.child_process.take() {
            println!("[SIDECAR] Child process found, killing...");
            
            // First try graceful termination
            let _ = child.kill().await;
            
            // Wait for process to exit with timeout
            let timeout = tokio::time::Duration::from_secs(3);
            match tokio::time::timeout(timeout, child.wait()).await {
                Ok(exit_status) => {
                    println!("[SIDECAR] Child process terminated gracefully: {:?}", exit_status);
                }
                Err(_) => {
                    println!("[SIDECAR] Child process did not exit within timeout, force killing...");
                    // Force kill if timeout
                    let _ = child.kill().await;
                    // Give it a moment to actually die
                    tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
                }
            }
        } else {
            println!("[SIDECAR] INFO: No child process to terminate");
        }

        self.state = SidecarState::Stopped;
        println!("[SIDECAR] Sidecar manager stopped successfully");
        println!("[SIDECAR] Final state: {:?}", self.state);

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

    pub async fn listen_sidecar_status(&mut self) {
        if self.debug_mode {
            println!("[SIDECAR] Starting sidecar status monitoring...");
            println!("[DEBUG] Debug mode enabled - enhanced monitoring active");
        }
        let mut health_check_count = 0;
        
        while self.state == SidecarState::Running {
            health_check_count += 1;
            // Only log health checks in debug mode to reduce noise
            if self.debug_mode {
                println!("[DEBUG] Health check #{} - Checking sidecar process status...", health_check_count);
            }
            
            // Check if child process is still running
            if let Some(ref mut child) = self.child_process {
                match child.try_wait() {
                    Ok(Some(exit_status)) => {
                        println!("[SIDECAR] ERROR: Sidecar process exited with status: {}", exit_status);
                        println!("[SIDECAR] Exit code: {:?}", exit_status);
                        self.state = SidecarState::Failed;
                        println!("[SIDECAR] State changed to: {:?}", self.state);

                        // Trigger main process shutdown since sidecar died
                        println!("[SIDECAR] CRITICAL: Sidecar process died, triggering main process shutdown...");
                        self.trigger_main_process_shutdown().await;
                        break;
                    }
                    Ok(None) => {
                        // Process is still running
                        self.last_health_check = std::time::Instant::now();
                        // Only log in debug mode to reduce noise
                        if self.debug_mode {
                            println!("[DEBUG] Sidecar process is still running (PID: {:?})", child.id());
                        }
                    }
                    Err(e) => {
                        println!("[SIDECAR] ERROR: Error checking sidecar process status: {}", e);
                        println!("[SIDECAR] State changed to: {:?}", self.state);
                        self.state = SidecarState::Failed;
                        println!("[SIDECAR] CRITICAL: Error occurred, triggering main process shutdown...");
                        self.trigger_main_process_shutdown().await;
                        break;
                    }
                }
            } else {
                println!("[SIDECAR] ERROR: No child process found");
                self.state = SidecarState::Failed;
                println!("[SIDECAR] State changed to: {:?}", self.state);
                println!("[SIDECAR] CRITICAL: No child process, triggering main process shutdown...");
                self.trigger_main_process_shutdown().await;
                break;
            }

            // Sleep for a shorter interval
            if self.debug_mode {
                println!("[SIDECAR] Waiting 5 seconds before next health check...");
            }
            tokio::time::sleep(std::time::Duration::from_secs(5)).await;
        }
        
        println!("[SIDECAR] Sidecar status monitoring stopped (final state: {:?})", self.state);
    }

    pub async fn check_health(&mut self, iteration: usize) -> bool {
        if self.debug_mode {
            println!("[DEBUG] Health check #{} - Checking sidecar process status...", iteration);
        }

        // 仅在 Running 状态下执行检查
        if self.state != SidecarState::Running {
            return false;
        }

        if let Some(ref mut child) = self.child_process {
            match child.try_wait() {
                Ok(Some(exit_status)) => {
                    println!("[SIDECAR] ERROR: Sidecar process exited with status: {}", exit_status);
                    self.state = SidecarState::Failed;

                    self.trigger_main_process_shutdown().await;
                    return false;
                }
                Ok(None) => {
                    self.last_health_check = std::time::Instant::now();
                    if self.debug_mode {
                        println!("[DEBUG] Sidecar process is still running (PID: {:?})", child.id());
                    }
                }
                Err(e) => {
                    println!("[SIDECAR] ERROR: Error checking sidecar process status: {}", e);
                    self.state = SidecarState::Failed;
                    self.trigger_main_process_shutdown().await;
                    return false;
                }
            }
        } else {
            println!("[SIDECAR] ERROR: No child process found during health check");
            self.state = SidecarState::Failed;
            self.trigger_main_process_shutdown().await;
            return false;
        }

        true
    }

    /**
     * Trigger main process shutdown when sidecar dies
     */
    async fn trigger_main_process_shutdown(&self) {
        println!("[SIDECAR] CRITICAL: Sidecar died, triggering main process shutdown...");
        println!("[SIDECAR] Current sidecar state: {:?}", self.state);
        println!("[SIDECAR] Connection string: {}", self.connection_string);

        if let Some(app_handle) = &self.app_handle {
            println!("[SIDECAR] App handle available, exiting Tauri application...");
            println!("[SIDECAR] Calling app_handle.exit(0)...");
            app_handle.exit(0);
        } else {
            println!("[SIDECAR] WARNING: No app handle available, cannot trigger main process shutdown");
            println!("[SIDECAR] This might indicate a configuration issue");
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
        if self.debug_mode {
            println!("[SIDECAR] Sending sidecar request...");
            println!("[SIDECAR] Request type: {}", request_type);
            println!("[SIDECAR] Payload: {:?}", payload);
            println!("[SIDECAR] Current state: {:?}", self.state);
        }

        if let Some(ipc_server) = &self.ipc_server {
            let message_id = uuid::Uuid::new_v4().to_string();
            let response_channel = format!("sidecar_response_{}", message_id);

            let message = crate::communication::SidecarMessage::RuntimeRequest {
                id: message_id.clone(),
                request_type: request_type.to_string(),
                payload: payload.clone(),
                response_channel: response_channel.clone(),
            };

            if self.debug_mode {
                println!("[SIDECAR] Message ID: {}", message_id);
                println!("[SIDECAR] Response channel: {}", response_channel);
                println!("[SIDECAR] Sending sidecar request: {} -> {:?}", request_type, message);
            }

            // Get connected clients
            let connected_clients = ipc_server.get_connected_clients().await;
            if self.debug_mode {
                println!("[SIDECAR] Connected clients: {:?}", connected_clients);
            }
            
            if connected_clients.is_empty() {
                println!("[SIDECAR] ERROR: No Rust clients connected");
                return Err("No Rust clients connected".to_string());
            }

            // Send to the first connected client (typically the main Rust process)
            let client_id = &connected_clients[0];
            if self.debug_mode {
                println!("[SIDECAR] Target client ID: {}", client_id);
            }

            match ipc_server.send_to_client(client_id, &message).await {
                Ok(_) => {
                    if self.debug_mode {
                        println!("[SIDECAR] Sidecar request sent successfully to client: {}", client_id);
                    }

                    // Return a pending response - actual response will come asynchronously
                    let response = serde_json::json!({
                        "message_id": message_id,
                        "request_type": request_type,
                        "status": "request_sent",
                        "note": "Response will be delivered asynchronously"
                    });
                    if self.debug_mode {
                        println!("[SIDECAR] Returning response: {:?}", response);
                    }
                    Ok(response)
                },
                Err(e) => {
                    println!("[SIDECAR] ERROR: Failed to send sidecar request: {}", e);
                    println!("[SIDECAR] Client ID: {}", client_id);
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
            println!("[SIDECAR] WARNING: SidecarManager dropped while still running");
        }
    }
}

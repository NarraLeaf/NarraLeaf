/*!
 * Sidecar Manager
 *
 * Main manager that coordinates the sidecar process, communication,
 * and lifecycle management.
 * 
 * NEW ARCHITECTURE:
 * - No longer manages window creation (handled by Tauri)
 * - Receives window proxy through onReady events
 * - Focuses on sidecar process and IPC communication only
 */

use tauri::AppHandle;
use super::state::SidecarState;
use super::process::SidecarProcess;
use super::communication::SidecarCommunication;

/**
 * Sidecar Manager
 *
 * Manages the NodeJS sidecar process and handles communication with it.
 * 
 * In the new architecture, this manager:
 * - Only handles sidecar process lifecycle
 * - Manages IPC communication with sidecar
 * - Receives window events from Tauri (onReady, onClose)
 * - No longer creates or manages windows directly
 */
pub struct SidecarManager {
    process: SidecarProcess,
    communication: SidecarCommunication,
    app_handle: Option<AppHandle>,
    pub state: SidecarState,
}

impl SidecarManager {
    pub fn new(connection_string: String, app_handle: AppHandle, debug_mode: bool) -> Self {
        Self {
            process: SidecarProcess::new(debug_mode),
            communication: SidecarCommunication::new(connection_string, debug_mode),
            app_handle: Some(app_handle),
            state: SidecarState::Stopped,
        }
    }

    /**
     * Start the sidecar and IPC server
     */
    pub async fn start(&mut self) -> Result<(), String> {
        if !self.process.get_state().can_start() {
            return Err(format!("Cannot start sidecar: current state is {:?}", self.process.get_state()));
        }

        self.process.set_state(SidecarState::Starting);
        self.state = SidecarState::Starting;

        // Initialize IPC server first
        self.communication.initialize_ipc_server(self.app_handle.as_ref()).await?;

        // Start sidecar process
        if let Some(app_handle) = &self.app_handle {
            self.process.start_sidecar_process(
                "narraleaf-sidecar.exe", // Default sidecar name
                self.communication.get_connection_string(),
                app_handle,
            ).await?;
        } else {
            return Err("Cannot start sidecar without app handle".to_string());
        }

        self.process.set_state(SidecarState::Running);
        self.state = SidecarState::Running;
        Ok(())
    }

    /**
     * Start sidecar and IPC with custom sidecar path
     */
    pub async fn start_sidecar_and_ipc(
        &mut self,
        sidecar_path: &str,
        connection_string: &str,
    ) -> Result<(), String> {
        if !self.process.get_state().can_start() {
            return Err(format!("Cannot start sidecar: current state is {:?}", self.process.get_state()));
        }

        self.process.set_state(SidecarState::Starting);
        self.state = SidecarState::Starting;

        // Initialize IPC server first
        self.communication.initialize_ipc_server(self.app_handle.as_ref()).await?;

        // Start sidecar process
        if let Some(app_handle) = &self.app_handle {
            self.process.start_sidecar_process(sidecar_path, connection_string, app_handle).await?;
        } else {
            return Err("Cannot start sidecar without app handle".to_string());
        }

        self.process.set_state(SidecarState::Running);
        self.state = SidecarState::Running;
        Ok(())
    }

    /**
     * Stop the sidecar and IPC server
     */
    pub async fn stop(&mut self) -> Result<(), String> {
        println!("[SIDECAR] Stopping sidecar manager...");
        println!("[SIDECAR] Current state: {:?}", self.process.get_state());

        if *self.process.get_state() == SidecarState::Stopped {
            println!("[SIDECAR] INFO: Sidecar is already stopped");
            return Ok(());
        }

        self.process.set_state(SidecarState::Stopping);
        self.state = SidecarState::Stopping;
        println!("[SIDECAR] State changed to: {:?}", self.process.get_state());

        // Stop sidecar process FIRST to avoid reconnection attempts
        self.process.stop_sidecar_process().await?;

        // Then stop IPC server
        self.communication.stop_ipc_server().await?;

        self.process.set_state(SidecarState::Stopped);
        self.state = SidecarState::Stopped;
        println!("[SIDECAR] Sidecar manager stopped successfully");
        println!("[SIDECAR] Final state: {:?}", self.process.get_state());

        Ok(())
    }

    /**
     * Immediately kill only the sidecar process without touching IPC server.
     * Used for fast shutdown when the sidecar requested app quit.
     */
    pub async fn kill_sidecar_only(&mut self) -> Result<(), String> {
        println!("[SIDECAR] kill_sidecar_only: terminating sidecar process immediately...");
        if *self.process.get_state() == SidecarState::Stopped {
            println!("[SIDECAR] INFO: Sidecar already stopped");
            return Ok(());
        }

        self.process.set_state(SidecarState::Stopping);
        self.state = SidecarState::Stopping;
        self.process.stop_sidecar_process().await?;
        self.process.set_state(SidecarState::Stopped);
        self.state = SidecarState::Stopped;
        println!("[SIDECAR] kill_sidecar_only completed");
        Ok(())
    }

    /**
     * Check if the sidecar is running
     */
    pub fn is_running(&self) -> bool {
        self.process.is_running()
    }

    /**
     * Get the current state
     */
    pub fn get_state(&self) -> &SidecarState {
        &self.state
    }

    /**
     * Get the connection string
     */
    pub fn get_connection_string(&self) -> &str {
        self.communication.get_connection_string()
    }

    /**
     * Get IPC server reference (for external access)
     */
    pub fn get_ipc_server(&self) -> Option<&crate::ipc::IPCServer> {
        self.communication.get_ipc_server()
    }

    /**
     * Monitor sidecar status
     */
    pub async fn listen_sidecar_status(&mut self) {
        let debug_mode = self.communication.debug_mode;
        if debug_mode {
            println!("[SIDECAR] Starting sidecar status monitoring...");
            println!("[DEBUG] Debug mode enabled - enhanced monitoring active");
        }
        let mut health_check_count = 0;
        
        while self.state == SidecarState::Running {
            health_check_count += 1;
            // Only log health checks in debug mode to reduce noise
            if debug_mode {
                println!("[DEBUG] Health check #{} - Checking sidecar process status...", health_check_count);
            }
            
            // Check if child process is still running
            if !self.process.check_health(health_check_count).await {
                println!("[SIDECAR] ERROR: Sidecar process health check failed");
                self.process.set_state(SidecarState::Failed);
                self.state = SidecarState::Failed;
                println!("[SIDECAR] State changed to: {:?}", self.process.get_state());

                // Trigger main process shutdown since sidecar died
                println!("[SIDECAR] CRITICAL: Sidecar process died, triggering main process shutdown...");
                self.trigger_main_process_shutdown().await;
                break;
            }

            // Sleep for a shorter interval
            if debug_mode {
                println!("[SIDECAR] Waiting 5 seconds before next health check...");
            }
            tokio::time::sleep(std::time::Duration::from_secs(5)).await;
        }
        
        println!("[SIDECAR] Sidecar status monitoring stopped (final state: {:?})", self.state);
    }

    /**
     * Check health of the sidecar
     */
    pub async fn check_health(&mut self, iteration: usize) -> bool {
        self.process.check_health(iteration).await
    }

    /**
     * Send a sidecar request
     */
    pub async fn send_sidecar_request(
        &self,
        request_type: &str,
        payload: serde_json::Value,
    ) -> Result<serde_json::Value, String> {
        self.communication.send_sidecar_request(request_type, payload).await
    }

    /**
     * Send a sidecar message
     */
    pub async fn send_sidecar_message(
        &self,
        message: &crate::communication::SidecarMessage,
    ) -> Result<(), String> {
        self.communication.send_sidecar_message(message).await
    }

    /**
     * Trigger main process shutdown when sidecar dies
     */
    async fn trigger_main_process_shutdown(&self) {
        println!("[SIDECAR] CRITICAL: Sidecar died, triggering main process shutdown...");
        println!("[SIDECAR] Current sidecar state: {:?}", self.process.get_state());
        println!("[SIDECAR] Connection string: {}", self.communication.get_connection_string());

        if let Some(app_handle) = &self.app_handle {
            println!("[SIDECAR] App handle available, exiting Tauri application...");
            println!("[SIDECAR] Calling app_handle.exit(0)...");
            app_handle.exit(0);
        } else {
            println!("[SIDECAR] WARNING: No app handle available, cannot trigger main process shutdown");
            println!("[SIDECAR] This might indicate a configuration issue");
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

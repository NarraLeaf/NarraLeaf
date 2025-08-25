/*!
 * NodeJS Sidecar Manager
 * 
 * This module manages the lifecycle and communication with the NodeJS sidecar process.
 * The sidecar contains the main NarraLeaf application logic and APIs.
 * 
 * Communication flow:
 * 1. Rust process starts NodeJS sidecar as a subprocess
 * 2. Communication happens via Unix Domain Socket (Unix) or Named Pipe (Windows)
 * 3. Requests are serialized as JSON and sent over the socket
 * 4. Responses are received and deserialized back to JSON
 * 5. Initial resource mappings are synchronized on startup
 */

use serde_json::Value;
use std::process::{Command, Child, Stdio};
use tokio::time::{sleep, Duration};
use std::collections::HashMap;

use crate::communication::CommunicationManager;

/**
 * Sidecar Manager
 * 
 * Manages the NodeJS sidecar process and handles communication with it.
 * Uses the new CommunicationManager for robust communication.
 */
#[derive(Debug)]
pub struct SidecarManager {
    child_process: Option<Child>,
    pub communication_manager: Option<CommunicationManager>,
    connection_string: String,
    is_initialized: bool,
    resource_mappings: HashMap<String, Value>,
}

impl SidecarManager {
    /**
     * Create a new SidecarManager instance
     */
    pub fn new() -> Self {
        let connection_string = Self::generate_connection_string();
        
        Self {
            child_process: None,
            communication_manager: None,
            connection_string,
            is_initialized: false,
            resource_mappings: HashMap::new(),
        }
    }

    /**
     * Start the NodeJS sidecar process
     * 
     * @param security_token - The security token to pass to the sidecar
     * @returns Result indicating success or failure
     */
    pub async fn start(&mut self, security_token: &str) -> Result<(), String> {
        // Get the sidecar binary path
        let sidecar_path = self.get_sidecar_path()?;
        
        // Start the NodeJS sidecar process
        let child = Command::new(&sidecar_path)
            .arg("--security-token")
            .arg(security_token)
            .arg("--connection-string")
            .arg(&self.connection_string)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .map_err(|e| format!("Failed to start sidecar process: {}", e))?;

        // Wait a bit for the process to start
        sleep(Duration::from_millis(500)).await;
        
        // Initialize communication manager
        let mut comm_manager = CommunicationManager::new(self.connection_string.clone());
        comm_manager.start().await?;
        
        // Wait for initial handshake
        sleep(Duration::from_millis(1000)).await;
        
        // Request initial resource mappings
        self.sync_initial_mappings(&mut comm_manager).await?;
        
        // Store the communication manager
        self.communication_manager = Some(comm_manager);
        self.child_process = Some(child);
        self.is_initialized = true;
        
        println!("NodeJS sidecar started successfully with connection: {}", self.connection_string);
        
        Ok(())
    }

    /**
     * Send a request to the NodeJS sidecar
     * 
     * @param request_type - Type of request (e.g., "saveGame")
     * @param payload - Request payload
     * @returns Result with response data or error
     */
    pub async fn send_request(&self, request_type: &str, payload: &Value) -> Result<Value, String> {
        if !self.is_initialized {
            return Err("Sidecar not initialized".to_string());
        }
        
        if let Some(comm_manager) = &self.communication_manager {
            comm_manager.send_request(request_type, payload).await
        } else {
            Err("Communication manager not available".to_string())
        }
    }

    /**
     * Stop the sidecar process
     */
    pub fn stop(&mut self) {
        if let Some(sender) = &self.communication_manager {
            // Communication manager will handle cleanup
        }
        
        if let Some(mut child) = self.child_process.take() {
            let _ = child.kill();
            let _ = child.wait();
        }
        
        self.communication_manager = None;
        self.is_initialized = false;
    }

    /**
     * Get the path to the sidecar binary
     * 
     * The sidecar binary is bundled with the application and located relative to the main executable.
     */
    fn get_sidecar_path(&self) -> Result<String, String> {
        #[cfg(target_os = "windows")]
        let sidecar_name = "njs.exe";
        #[cfg(not(target_os = "windows"))]
        let sidecar_name = "njs";
        
        // In development, look in the dist directory
        #[cfg(debug_assertions)]
        {
            let path = format!("../dist/sidecar/{}", sidecar_name);
            if std::path::Path::new(&path).exists() {
                return Ok(path);
            }
        }
        
        // In production, the sidecar is bundled with the app
        #[cfg(not(debug_assertions))]
        {
            let exe_dir = std::env::current_exe()
                .map_err(|e| format!("Failed to get executable directory: {}", e))?
                .parent()
                .ok_or("Failed to get parent directory")?
                .to_path_buf();
            
            let sidecar_path = exe_dir.join(sidecar_name);
            return Ok(sidecar_path.to_string_lossy().to_string());
        }
        
        Err("Sidecar binary not found".to_string())
    }

    /**
     * Generate a unique connection string for this sidecar instance
     * 
     * @returns Connection string (pipe name or socket path)
     */
    fn generate_connection_string() -> String {
        let instance_id = uuid::Uuid::new_v4();
        
        #[cfg(target_os = "windows")]
        {
            format!("\\\\.\\pipe\\narraleaf-sidecar-{}", instance_id)
        }
        
        #[cfg(not(target_os = "windows"))]
        {
            let temp_dir = std::env::temp_dir();
            temp_dir.join(format!("narraleaf-sidecar-{}.sock", instance_id))
                .to_string_lossy()
                .to_string()
        }
    }

    /**
     * Synchronize initial resource mappings from NodeJS sidecar
     * 
     * This is called during startup to get the initial resource mapping table.
     * 
     * @param comm_manager - Communication manager instance
     * @returns Result indicating success or failure
     */
    async fn sync_initial_mappings(&mut self, comm_manager: &mut CommunicationManager) -> Result<(), String> {
        println!("Requesting initial resource mappings from NodeJS sidecar...");
        
        // Request initial mappings
        comm_manager.request_initial_mappings().await?;
        
        // Wait for mappings to be received
        let mut attempts = 0;
        const MAX_ATTEMPTS: u32 = 10;
        
        while attempts < MAX_ATTEMPTS {
            sleep(Duration::from_millis(500)).await;
            
            let mappings = comm_manager.get_resource_mappings().await;
            if !mappings.is_empty() {
                self.resource_mappings = mappings;
                println!("Received {} initial resource mappings", self.resource_mappings.len());
                return Ok(());
            }
            
            attempts += 1;
            println!("Waiting for resource mappings... (attempt {}/{})", attempts, MAX_ATTEMPTS);
        }
        
        // If no mappings received, use default empty mappings
        println!("No initial mappings received, using empty mapping table");
        self.resource_mappings = HashMap::new();
        Ok(())
    }

    /**
     * Get current resource mappings
     * 
     * @returns Current resource mappings
     */
    pub fn get_resource_mappings(&self) -> &HashMap<String, Value> {
        &self.resource_mappings
    }

    /**
     * Update resource mappings
     * 
     * @param mappings - New resource mappings
     */
    pub fn update_resource_mappings(&mut self, mappings: HashMap<String, Value>) {
        self.resource_mappings = mappings;
        println!("Updated resource mappings: {} entries", self.resource_mappings.len());
    }

    /**
     * Check if sidecar is healthy
     * 
     * @returns True if sidecar is healthy, false otherwise
     */
    pub async fn is_healthy(&self) -> bool {
        if !self.is_initialized {
            return false;
        }
        
        if let Some(comm_manager) = &self.communication_manager {
            // Send a simple ping request to check health
            let ping_payload = serde_json::json!({"ping": true});
            match comm_manager.send_request("ping", &ping_payload).await {
                Ok(_) => true,
                Err(_) => false,
            }
        } else {
            false
        }
    }

    /**
     * Get sidecar status information
     * 
     * @returns Status information as JSON
     */
    pub fn get_status(&self) -> Value {
        serde_json::json!({
            "initialized": self.is_initialized,
            "connection_string": self.connection_string,
            "resource_mappings_count": self.resource_mappings.len(),
            "child_process_running": self.child_process.is_some(),
            "communication_manager_active": self.communication_manager.is_some()
        })
    }
}

impl Drop for SidecarManager {
    fn drop(&mut self) {
        self.stop();
    }
}

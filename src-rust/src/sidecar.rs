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

use std::process::{Child};
use std::collections::HashMap;
use serde_json::Value;
use crate::ipc::IPCServer;

/**
 * Sidecar Manager
 * 
 * Manages the NodeJS sidecar process and handles communication with it.
 * Uses the IPCServer for robust communication.
 */
pub struct SidecarManager {
    child_process: Option<Child>,
    pub ipc_server: Option<IPCServer>,
    connection_string: String,
    is_initialized: bool,
}

impl SidecarManager {
    /**
     * Create a new SidecarManager instance
     */
    pub fn new() -> Self {
        let connection_string = Self::generate_connection_string();
        
        Self {
            child_process: None,
            ipc_server: None,
            connection_string,
            is_initialized: false,
        }
    }

    /**
     * Start the NodeJS sidecar process
     * 
     * @param security_token - The security token to pass to the sidecar
     * @returns Result indicating success or failure
     */
    pub async fn start(&mut self, _security_token: &str) -> Result<(), String> {
        // For testing purposes, we'll just start the IPC server
        // In a real implementation, you would start the NodeJS process here
        
        // Initialize IPC server
        let mut ipc_server = IPCServer::new(self.connection_string.clone());
        ipc_server.start().await?;
        
        // Store the IPC server
        self.ipc_server = Some(ipc_server);
        self.is_initialized = true;
        
        println!("Sidecar manager started successfully with connection: {}", self.connection_string);
        
        Ok(())
    }

    /**
     * Stop the NodeJS sidecar process
     * 
     * @returns Result indicating success or failure
     */
    pub async fn stop(&mut self) -> Result<(), String> {
        if let Some(mut ipc_server) = self.ipc_server.take() {
            ipc_server.stop().await?;
        }
        
        if let Some(mut child) = self.child_process.take() {
            let _ = child.kill();
        }
        
        self.is_initialized = false;
        println!("Sidecar manager stopped");
        
        Ok(())
    }

    /**
     * Check if the sidecar is running
     * 
     * @returns True if the sidecar is running
     */
    pub fn is_running(&self) -> bool {
        self.is_initialized
    }

    /**
     * Get the connection string for the sidecar
     * 
     * @returns The connection string
     */
    pub fn get_connection_string(&self) -> &str {
        &self.connection_string
    }

    /**
     * Generate a unique connection string for this instance
     * 
     * @returns A unique connection string
     */
    fn generate_connection_string() -> String {
        use std::time::{SystemTime, UNIX_EPOCH};
        
        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_millis();
        
        format!("narraleaf-ipc-{}", timestamp)
    }

    /**
     * Get the path to the NodeJS sidecar binary
     * 
     * @returns The path to the sidecar binary
     */
    fn get_sidecar_path(&self) -> Result<String, String> {
        // For testing, return a placeholder
        // In a real implementation, this would resolve the actual path
        Ok("node".to_string())
    }

    /**
     * Sync initial resource mappings with the sidecar
     * 
     * @param ipc_server - The IPC server to use for communication
     * @returns Result indicating success or failure
     */
    async fn sync_initial_mappings(&self, _ipc_server: &mut IPCServer) -> Result<(), String> {
        // For testing, just return success
        // In a real implementation, this would sync actual resource mappings
        Ok(())
    }
}

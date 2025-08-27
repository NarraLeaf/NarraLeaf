/*!
 * IPC Configuration Management
 * 
 * Handles configuration for the IPC server
 */

use serde::{Deserialize, Serialize};
use std::path::PathBuf;

/// IPC Server Configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IPCConfig {
    /// Connection string (pipe name or socket path)
    pub connection_string: String,
    
    /// Maximum number of concurrent clients
    pub max_clients: usize,
    
    /// Client timeout in seconds
    pub client_timeout: u64,
    
    /// Server loop delay in milliseconds
    pub server_loop_delay: u64,
    
    /// Enable debug logging
    pub debug_logging: bool,
}

impl Default for IPCConfig {
    fn default() -> Self {
        Self {
            connection_string: Self::default_connection_string(),
            max_clients: 100,
            client_timeout: 30,
            server_loop_delay: 10,
            debug_logging: false,
        }
    }
}

impl IPCConfig {
    /// Get default connection string based on platform
    fn default_connection_string() -> String {
        #[cfg(target_os = "windows")]
        {
            r"\\.\pipe\narralearf-ipc".to_string()
        }
        
        #[cfg(not(target_os = "windows"))]
        {
            "/tmp/narralearf-ipc.sock".to_string()
        }
    }

    /// Load configuration from file
    pub fn from_file(path: &PathBuf) -> Result<Self, Box<dyn std::error::Error>> {
        let content = std::fs::read_to_string(path)?;
        let config: IPCConfig = serde_json::from_str(&content)?;
        Ok(config)
    }

    /// Save configuration to file
    pub fn save_to_file(&self, path: &PathBuf) -> Result<(), Box<dyn std::error::Error>> {
        let content = serde_json::to_string_pretty(self)?;
        std::fs::write(path, content)?;
        Ok(())
    }

    /// Validate configuration
    pub fn validate(&self) -> Result<(), String> {
        if self.connection_string.is_empty() {
            return Err("Connection string cannot be empty".to_string());
        }
        
        if self.max_clients == 0 {
            return Err("Max clients must be greater than 0".to_string());
        }
        
        if self.client_timeout == 0 {
            return Err("Client timeout must be greater than 0".to_string());
        }
        
        if self.server_loop_delay == 0 {
            return Err("Server loop delay must be greater than 0".to_string());
        }
        
        Ok(())
    }
}

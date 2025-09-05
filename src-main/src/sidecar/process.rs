/*!
 * Sidecar Process Management
 *
 * Handles the actual process spawning, monitoring, and lifecycle management
 * of the NodeJS sidecar process.
 */

use tauri::{AppHandle, Manager};
use super::state::SidecarState;

/**
 * Sidecar Process Manager
 *
 * Manages the actual NodeJS sidecar process lifecycle
 */
pub struct SidecarProcess {
    child_process: Option<tokio::process::Child>,
    pub state: SidecarState,
    last_health_check: std::time::Instant,
    debug_mode: bool,
}

impl SidecarProcess {
    pub fn new(debug_mode: bool) -> Self {
        Self {
            child_process: None,
            state: SidecarState::Stopped,
            last_health_check: std::time::Instant::now(),
            debug_mode,
        }
    }

    /**
     * Start the sidecar process
     */
    pub async fn start_sidecar_process(
        &mut self,
        sidecar_path: &str,
        connection_string: &str,
        app_handle: &AppHandle,
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
            let resource_dir = app_handle.path().resource_dir()
                .map_err(|e| format!("Failed to get resource directory: {}", e))?;
            let resolved_path = resource_dir.join(sidecar_path);
            if self.debug_mode {
                println!("[SIDECAR] Resource directory: {:?}", resource_dir);
                println!("[SIDECAR] Resolved sidecar path: {:?}", resolved_path);
            }
            resolved_path
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

    /**
     * Stop the sidecar process
     */
    pub async fn stop_sidecar_process(&mut self) -> Result<(), String> {
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

        Ok(())
    }

    /**
     * Check if the sidecar process is still running
     */
    pub async fn check_health(&mut self, iteration: usize) -> bool {
        if self.debug_mode {
            println!("[DEBUG] Health check #{} - Checking sidecar process status...", iteration);
        }

        // Only check in Running state
        if self.state != SidecarState::Running {
            return false;
        }

        if let Some(ref mut child) = self.child_process {
            match child.try_wait() {
                Ok(Some(exit_status)) => {
                    println!("[SIDECAR] ERROR: Sidecar process exited with status: {}", exit_status);
                    self.state = SidecarState::Failed;
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
                    return false;
                }
            }
        } else {
            println!("[SIDECAR] ERROR: No child process found during health check");
            self.state = SidecarState::Failed;
            return false;
        }

        true
    }

    /**
     * Get the current state
     */
    pub fn get_state(&self) -> &SidecarState {
        &self.state
    }

    /**
     * Set the current state
     */
    pub fn set_state(&mut self, state: SidecarState) {
        self.state = state;
    }

    /**
     * Check if the process is running
     */
    pub fn is_running(&self) -> bool {
        self.state.is_running()
    }
}

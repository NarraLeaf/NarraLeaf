/*!
 * IPC Server Core
 * 
 * Main server implementation that orchestrates all components
 */

use std::sync::Arc;
use tokio::sync::oneshot;
use tokio::time::{sleep, Duration};
use uuid::Uuid;

use crate::ipc::types::{ServerState, ClientConnection};
use crate::ipc::platform::listener::{create_listener, accept_connection};
use crate::ipc::client::{handle_client, cleanup_disconnected_clients, send_message_to_client_by_id};


/**
 * Manages the IPC server that NodeJS sidecar connects to
 */
pub struct IPCServer {
    connection_string: String,
    server_state: Arc<ServerState>,
    shutdown_tx: Option<oneshot::Sender<()>>,
}

impl IPCServer {
    /**
     * Create a new IPC server
     *
     * @param connection_string - Connection string (pipe name or socket path)
     * @returns New IPCServer instance
     */
    pub fn new(connection_string: String) -> Self {
        Self {
            connection_string,
            server_state: Arc::new(ServerState::new()),
            shutdown_tx: None,
        }
    }

    /**
     * Create a new IPC server with app handle
     *
     * @param connection_string - Connection string (pipe name or socket path)
     * @param app_handle - Tauri app handle for tauri operations
     * @returns New IPCServer instance
     */
    pub fn with_app_handle(connection_string: String, app_handle: tauri::AppHandle) -> Self {
        Self {
            connection_string,
            server_state: Arc::new(ServerState::with_app_handle(app_handle)),
            shutdown_tx: None,
        }
    }



    /**
     * Start the IPC server
     * 
     * @returns Result indicating success or failure
     */
    pub async fn start(&mut self) -> Result<(), String> {
        if *self.server_state.is_running.read().await {
            return Err("Server is already running".to_string());
        }

        // Create shutdown channel
        let (shutdown_tx, shutdown_rx) = oneshot::channel();
        self.shutdown_tx = Some(shutdown_tx);

        // Start server loop
        let connection_string = self.connection_string.clone();
        let server_state = Arc::clone(&self.server_state);

        tokio::spawn(async move {
            Self::server_loop(connection_string, server_state, shutdown_rx).await;
        });

        // Wait a bit for server to start
        sleep(Duration::from_millis(100)).await;

        Ok(())
    }

    /**
     * Stop the IPC server
     * 
     * @returns Result indicating success or failure
     */
    pub async fn stop(&mut self) -> Result<(), String> {
        if let Some(shutdown_tx) = self.shutdown_tx.take() {
            let _ = shutdown_tx.send(());
        }

        // Update running status
        {
            let mut running = self.server_state.is_running.write().await;
            *running = false;
        }

        // Close all client connections
        let mut clients = self.server_state.clients.write().await;
        clients.clear();

        Ok(())
    }



    /**
     * Send message to specific client
     * 
     * @param client_id - ID of the client to send to
     * @param message - Message to send
     * @returns Result indicating success or failure
     */
    pub async fn send_to_client(&self, client_id: &str, message: &crate::communication::SidecarMessage) -> Result<(), String> {
        send_message_to_client_by_id(client_id, &self.server_state, message).await
    }

    /**
     * Get list of connected clients
     * 
     * @returns List of client IDs
     */
    pub async fn get_connected_clients(&self) -> Vec<String> {
        crate::ipc::client::get_connected_clients(&self.server_state).await
    }

    /**
     * Check if server is running
     *
     * @returns True if server is running
     */
    pub async fn is_running(&self) -> bool {
        *self.server_state.is_running.read().await
    }

    /**
     * Wait for server to be ready to accept connections
     * 
     * @param timeout_ms - Maximum time to wait in milliseconds
     * @returns Result indicating if server is ready
     */
    pub async fn wait_for_ready(&self, timeout_ms: u64) -> Result<(), String> {
        let start_time = std::time::Instant::now();
        let timeout = std::time::Duration::from_millis(timeout_ms);
        let mut last_status_log = std::time::Instant::now();
        
        println!("Waiting for IPC server to become ready (timeout: {}ms)...", timeout_ms);
        
        while start_time.elapsed() < timeout {
            if self.is_running().await {
                println!("IPC server is running, verifying listener readiness...");
                // Give a small additional delay for the listener to be fully established
                tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
                println!("IPC server is fully ready to accept connections");
                return Ok(());
            }
            
            // Log status every second
            if last_status_log.elapsed() >= std::time::Duration::from_millis(1000) {
                let elapsed = start_time.elapsed().as_millis();
                println!("Still waiting for IPC server... ({}ms elapsed)", elapsed);
                last_status_log = std::time::Instant::now();
            }
            
            // Poll every 50ms
            tokio::time::sleep(tokio::time::Duration::from_millis(50)).await;
        }
        
        let elapsed = start_time.elapsed().as_millis();
        Err(format!("IPC server failed to become ready within {}ms (actual wait: {}ms)", timeout_ms, elapsed))
    }

    /**
     * Get server state (for internal use)
     *
     * @returns Reference to server state
     */
    pub fn get_server_state(&self) -> &Arc<crate::ipc::types::ServerState> {
        &self.server_state
    }

    /**
     * Main server loop
     */
    async fn server_loop(
        connection_string: String,
        server_state: Arc<ServerState>,
        mut shutdown_rx: oneshot::Receiver<()>,
    ) {
        println!("[SERVER] Starting server loop for: {}", connection_string);

        // Start listening for connections
        let listener = match create_listener(&connection_string).await {
            Ok(listener) => {
                println!("[SERVER] Listener created successfully");
                listener
            },
            Err(e) => {
                println!("[SERVER] Failed to create listener: {}", e);
                // Make sure to set running status to false on failure
                {
                    let mut running = server_state.is_running.write().await;
                    *running = false;
                }
                return;
            }
        };

        // Update running status only after successful listener creation
        {
            let mut running = server_state.is_running.write().await;
            *running = true;
        }
        println!("[SERVER] Server state set to running");

        println!("IPC Server started on: {}", connection_string);

        // Track last client activity for auto-shutdown
        let mut last_client_activity = std::time::Instant::now();
        let auto_shutdown_timeout = Duration::from_secs(15); // 15 seconds timeout

        loop {
            // Check for shutdown signal
            if shutdown_rx.try_recv().is_ok() {
                println!("Shutdown signal received");
                break;
            }

            // Accept new connections with timeout
            match tokio::time::timeout(
                Duration::from_millis(100),
                accept_connection(&listener)
            ).await {
                Ok(Ok(stream)) => {
                    let client_id = Uuid::new_v4().to_string();
                    println!("New client connected: {}", client_id);

                    // Update last activity time
                    last_client_activity = std::time::Instant::now();

                    // Add client to list
                    {
                        let mut clients_guard = server_state.clients.write().await;
                        clients_guard.insert(
                            client_id.clone(),
                            ClientConnection {
                                id: client_id.clone(),
                                last_seen: std::time::Instant::now(),
                                platform_stream: stream,
                            },
                        );
                    }

                    // Start client handler
                    let server_state_clone = Arc::clone(&server_state);
                    let client_id_clone = client_id.clone();

                    tokio::spawn(async move {
                        handle_client(client_id_clone, server_state_clone).await;
                    });
                }
                Ok(Err(e)) => {
                    // Connection error
                    if e.kind() != std::io::ErrorKind::WouldBlock && 
                       e.kind() != std::io::ErrorKind::TimedOut {
                        println!("Error accepting connection: {}", e);
                    }
                }
                Err(_) => {
                    // Timeout - this is normal, continue loop
                }
            }

            // Clean up disconnected clients
            cleanup_disconnected_clients(&server_state).await;

            // Check for auto-shutdown condition
            let current_clients = {
                let clients_guard = server_state.clients.read().await;
                clients_guard.len()
            };

            if current_clients == 0 {
                // No clients connected, check if we should auto-shutdown
                let time_since_last_activity = last_client_activity.elapsed();
                if time_since_last_activity >= auto_shutdown_timeout {
                    println!("No clients connected for {} seconds, auto-shutting down IPC server", 
                             time_since_last_activity.as_secs());
                    break;
                }
            } else {
                // Clients are connected, update activity time
                last_client_activity = std::time::Instant::now();
            }

            // Small delay to prevent busy waiting
            sleep(Duration::from_millis(10)).await;
        }

        // Update running status
        {
            let mut running = server_state.is_running.write().await;
            *running = false;
        }

        println!("IPC Server stopped");
    }
}

impl Drop for IPCServer {
    fn drop(&mut self) {
        // Ensure server is stopped
        if let Some(shutdown_tx) = self.shutdown_tx.take() {
            let _ = shutdown_tx.send(());
        }
    }
}

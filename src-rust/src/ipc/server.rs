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
use crate::ipc::handlers::{PingHandler, VersionHandler, EchoHandler, StatusHandler};

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
        let mut server = Self {
            connection_string,
            server_state: Arc::new(ServerState::new()),
            shutdown_tx: None,
        };

        // Register default handlers
        server.register_default_handlers();

        server
    }

    /**
     * Register default message handlers
     */
    fn register_default_handlers(&mut self) {
        let state = Arc::clone(&self.server_state);
        tokio::spawn(async move {
            let mut handlers = state.message_handlers.write().await;
            handlers.insert("ping".to_string(), Box::new(PingHandler));
            handlers.insert("version".to_string(), Box::new(VersionHandler));
            handlers.insert("echo".to_string(), Box::new(EchoHandler));
            handlers.insert("status".to_string(), Box::new(StatusHandler));
        });
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
     * Register a message handler
     * 
     * @param message_type - Type of message to handle
     * @param handler - Message handler implementation
     */
    pub async fn register_handler(
        &self,
        message_type: &str,
        handler: Box<dyn crate::ipc::types::MessageHandler + Send + Sync>,
    ) {
        let mut handlers = self.server_state.message_handlers.write().await;
        handlers.insert(message_type.to_string(), handler);
    }

    /**
     * Send message to all connected clients
     * 
     * @param message - Message to send
     * @returns Result indicating success or failure
     */
    pub async fn broadcast_message(&self, message: &crate::communication::SidecarMessage) -> Result<(), String> {
        let clients = self.server_state.clients.read().await;
        
        for client in clients.values() {
            if let Err(e) = crate::ipc::client::send_message_to_client(client, message).await {
                println!("Failed to send message to client {}: {}", client.id, e);
            }
        }

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
     * Main server loop
     */
    async fn server_loop(
        connection_string: String,
        server_state: Arc<ServerState>,
        mut shutdown_rx: oneshot::Receiver<()>,
    ) {
        // Update running status
        {
            let mut running = server_state.is_running.write().await;
            *running = true;
        }

        // Start listening for connections
        let mut listener = match create_listener(&connection_string).await {
            Ok(listener) => listener,
            Err(e) => {
                println!("Failed to create listener: {}", e);
                return;
            }
        };

        println!("IPC Server started on: {}", connection_string);

        loop {
            // Check for shutdown signal
            if shutdown_rx.try_recv().is_ok() {
                println!("Shutdown signal received");
                break;
            }

            // Accept new connections with timeout
            match tokio::time::timeout(
                Duration::from_millis(100),
                accept_connection(&mut listener)
            ).await {
                Ok(Ok(stream)) => {
                    let client_id = Uuid::new_v4().to_string();
                    println!("New client connected: {}", client_id);

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

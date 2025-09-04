/*!
 * Client Connection Management
 * 
 * Handles individual client connections and their lifecycle
 */

use std::sync::Arc;
use tokio::time::{sleep, Duration};

use crate::ipc::types::{ClientConnection, ServerState};
use crate::ipc::platform::stream::read_from_stream;
use crate::ipc::message::process_message;

/// Handle individual client connection
pub async fn handle_client(
    client_id: String,
    server_state: Arc<ServerState>,
) {
    let mut buffer = Vec::new();
    
    loop {
        // Get client connection
        let clients_guard = server_state.clients.read().await;
        if clients_guard.get(&client_id).is_none() {
            break; // Client disconnected
        }

        // Read data from client
        let data = {
            let clients_guard_read = server_state.clients.read().await;
            let platform_stream_arc = match clients_guard_read.get(&client_id) {
                Some(client) => client.platform_stream.clone(),
                None => break, // Client disconnected
            };
            drop(clients_guard_read);

            let mut locked_stream = platform_stream_arc.lock().await;
            match read_from_stream(&mut *locked_stream).await {
                Ok(data) => data,
                Err(_) => break, // Client disconnected or error
            }
        };

        // Add to buffer
        buffer.extend(data);

        // Process complete messages
        while buffer.len() >= 8 {
            // Read message length (8 hex chars)
            let length_str = String::from_utf8_lossy(&buffer[..8]);
            let message_length = match usize::from_str_radix(&length_str, 16) {
                Ok(len) => len,
                Err(_) => {
                    buffer.clear();
                    break;
                }
            };

            let total_length = 8 + message_length;
            if buffer.len() < total_length {
                break; // Incomplete message
            }

            // Extract and parse message
            let message_data = &buffer[8..total_length];
            // Only log significant messages to reduce noise
            if message_data.len() > 200 {
                println!("[CLIENT] Received message data ({} bytes): {}", message_data.len(), String::from_utf8_lossy(message_data));
            }
            
            let message = match serde_json::from_slice::<crate::communication::SidecarMessage>(message_data) {
                Ok(msg) => {
                    // Only log significant messages to reduce noise
                    if message_data.len() > 200 {
                        println!("[CLIENT] Successfully parsed message: {:?}", msg);
                    }
                    msg
                },
                Err(e) => {
                    println!("[CLIENT] Failed to parse message: {}", e);
                    buffer.drain(..total_length);
                    continue;
                }
            };

            // Handle message
            // Only log significant messages to reduce noise
            if message_data.len() > 200 {
                println!("[CLIENT] Processing message for client: {}", client_id);
            }
            process_message(&message, &client_id, &server_state).await;

            // Remove processed message
            buffer.drain(..total_length);
        }

        // Update last seen time
        drop(clients_guard);
        {
            let mut clients_guard = server_state.clients.write().await;
            if let Some(client) = clients_guard.get_mut(&client_id) {
                client.last_seen = std::time::Instant::now();
            }
        }

        // Small delay
        sleep(Duration::from_millis(10)).await;
    }

    // Remove client when disconnected
    let mut clients_guard = server_state.clients.write().await;
    clients_guard.remove(&client_id);
    println!("Client disconnected: {}", client_id);
}

/// Clean up disconnected clients
pub async fn cleanup_disconnected_clients(server_state: &Arc<ServerState>) {
    let mut clients_guard = server_state.clients.write().await;
    let now = std::time::Instant::now();
    let timeout = Duration::from_secs(30);
    
    clients_guard.retain(|_, client| {
        now.duration_since(client.last_seen) < timeout
    });
}

/// Send message to specific client
pub async fn send_message_to_client(
    client: &mut ClientConnection,
    message: &crate::communication::SidecarMessage,
) -> Result<(), String> {
    let stream_arc = client.platform_stream.clone();
    let mut locked_stream = stream_arc.lock().await;
    crate::ipc::platform::stream::send_message_to_stream(&mut *locked_stream, message).await
}

/// Send message to client by ID
pub async fn send_message_to_client_by_id(
    client_id: &str,
    server_state: &Arc<ServerState>,
    message: &crate::communication::SidecarMessage,
) -> Result<(), String> {
    // Only log significant messages to reduce noise
    if let crate::communication::SidecarMessage::ServiceRequest { request_type, .. } = message {
        if request_type.contains("game") || request_type.contains("save") || request_type.contains("load") {
            println!("[CLIENT] Attempting to send message to client: {}", client_id);
            println!("[CLIENT] Message type: {:?}", message);
        }
    }
    
    // Use a read lock to fetch the stream, then drop the lock before awaiting I/O
    let (_client_count, stream_arc_opt) = {
        let clients_guard_read = server_state.clients.read().await;
        let count = clients_guard_read.len();
        let opt = clients_guard_read.get(client_id).map(|c| c.platform_stream.clone());
        (count, opt)
    };

    // Only log client count changes to reduce noise

    if let Some(stream_arc) = stream_arc_opt {
        // Only log significant messages to reduce noise
        if let crate::communication::SidecarMessage::ServiceRequest { request_type, .. } = message {
            if request_type.contains("game") || request_type.contains("save") || request_type.contains("load") {
                println!("[CLIENT] Client found, sending message...");
            }
        }
        let mut locked_stream = stream_arc.lock().await;
        match crate::ipc::platform::stream::send_message_to_stream(&mut *locked_stream, message).await {
            Ok(()) => {
                // Only log significant messages to reduce noise
                if let crate::communication::SidecarMessage::ServiceRequest { request_type, .. } = message {
                    if request_type.contains("game") || request_type.contains("save") || request_type.contains("load") {
                        println!("[CLIENT] Message sent successfully to client: {}", client_id);
                    }
                }
                Ok(())
            }
            Err(e) => {
                println!("[CLIENT] ERROR: Failed to send message to client {}: {}", client_id, e);
                Err(e)
            }
        }
    } else {
        // Reacquire a read lock just to log available clients
        let available_clients: Vec<String> = {
            let clients_guard_read = server_state.clients.read().await;
            clients_guard_read.keys().cloned().collect()
        };
        println!("[CLIENT] ERROR: Client {} not found", client_id);
        println!("[CLIENT] Available clients: {:?}", available_clients);
        Err(format!("Client {} not found", client_id))
    }
}

/// Get list of connected clients
pub async fn get_connected_clients(server_state: &Arc<ServerState>) -> Vec<String> {
    let clients = server_state.clients.read().await;
    clients.keys().cloned().collect()
}

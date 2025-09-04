/*!
 * Platform-specific listener implementations
 */

use crate::ipc::types::PlatformListener;

/// Create platform-specific listener
pub async fn create_listener(connection_string: &str) -> Result<PlatformListener, String> {
    #[cfg(target_os = "windows")]
    {
        // For Windows, convert connection string to a valid pipe name
        // Extract a meaningful name from the connection string, or use a default
        let pipe_name = if connection_string.is_empty() || connection_string == "default" {
            "narraleaf_ipc".to_string()
        } else {
            // Clean the connection string to create a valid pipe name
            connection_string
                .chars()
                .filter(|c| c.is_alphanumeric() || *c == '_' || *c == '-')
                .collect::<String>()
        };

        // Ensure pipe name is not empty
        let pipe_name = if pipe_name.is_empty() {
            "narraleaf_ipc".to_string()
        } else {
            pipe_name
        };

        // Create the full pipe path
        let full_pipe_name = format!(r"\\.\pipe\{}", pipe_name);

        // Only log in debug mode to reduce noise
        // println!("Creating Windows named pipe listener: {}", full_pipe_name);
        Ok(PlatformListener::NamedPipe(full_pipe_name))
    }

    #[cfg(not(target_os = "windows"))]
    {
        let socket_path = PathBuf::from(connection_string);

        // Remove existing socket file if it exists
        if socket_path.exists() {
            std::fs::remove_file(&socket_path)
                .map_err(|e| format!("Failed to remove existing socket: {}", e))?;
        }

        let listener = tokio::net::UnixListener::bind(&socket_path)
            .map_err(|e| format!("Failed to bind to socket: {}", e))?;

        Ok(PlatformListener::Unix(listener))
    }
}

/// Accept new connection from platform-specific listener
pub async fn accept_connection(listener: &PlatformListener) -> Result<crate::ipc::types::PlatformStream, std::io::Error> {
    match listener {
        #[cfg(target_os = "windows")]
        PlatformListener::NamedPipe(pipe_name) => {
            use tokio::net::windows::named_pipe::{ServerOptions, NamedPipeServer, PipeMode};

            // Create a named pipe server instance with default options
            let server: NamedPipeServer = ServerOptions::new()
                // Ensure duplex communication so server can read and write
                .access_inbound(true)
                .access_outbound(true)
                // Use byte mode to match length-prefixed stream protocol
                .pipe_mode(PipeMode::Byte)
                .first_pipe_instance(false) // Allow multiple instances
                .max_instances(100)
                .in_buffer_size(65536)
                .out_buffer_size(65536)
                .create(pipe_name)
                .map_err(|e| {
                    println!("Failed to create named pipe server '{}': {}", pipe_name, e);
                    e
                })?;

            // Wait for client connection
            server.connect().await.map_err(|e| {
                println!("Failed to accept connection on pipe '{}': {}", pipe_name, e);
                e
            })?;

            // Connection successful, no need to log to reduce noise
            Ok(crate::ipc::types::PlatformStream::NamedPipe(server))
        }

        #[cfg(not(target_os = "windows"))]
        PlatformListener::Unix(unix_listener) => {
            let (stream, _) = unix_listener.accept().await?;
            Ok(crate::ipc::types::PlatformStream::Unix(stream))
        }
    }
}

/*!
 * Platform-specific listener implementations
 */

use crate::ipc::types::PlatformListener;

/// Create platform-specific listener
pub async fn create_listener(_connection_string: &str) -> Result<PlatformListener, String> {
    #[cfg(target_os = "windows")]
    {
        // For Windows, we'll create a named pipe server
        // Note: This is a simplified approach
        Err("Windows named pipe server not yet implemented".to_string())
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
        PlatformListener::NamedPipe(_) => {
            // Windows implementation would go here
            Err(std::io::Error::new(
                std::io::ErrorKind::Other,
                "Windows not implemented",
            ))
        }
        
        #[cfg(not(target_os = "windows"))]
        PlatformListener::Unix(unix_listener) => {
            let (stream, _) = unix_listener.accept().await?;
            Ok(crate::ipc::types::PlatformStream::Unix(stream))
        }
    }
}

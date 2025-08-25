/*!
 * Platform-specific stream operations
 */

use crate::ipc::types::PlatformStream;
use crate::communication::SidecarMessage;

/// Read data from platform-specific stream
pub async fn read_from_stream(stream: &PlatformStream) -> Result<Vec<u8>, std::io::Error> {
    match stream {
        #[cfg(target_os = "windows")]
        PlatformStream::NamedPipe(pipe) => {
            // Windows implementation would go here
            Err(std::io::Error::new(
                std::io::ErrorKind::Other,
                "Windows not implemented",
            ))
        }
        
        #[cfg(not(target_os = "windows"))]
        PlatformStream::Unix(stream) => {
            use tokio::io::AsyncReadExt;
            let mut stream = stream.try_clone().await
                .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e))?;
            
            let mut temp_buffer = [0u8; 1024];
            let bytes_read = stream.read(&mut temp_buffer).await?;
            
            Ok(temp_buffer[..bytes_read].to_vec())
        }
    }
}

/// Write data to platform-specific stream
pub async fn write_to_stream(stream: &PlatformStream, data: &[u8]) -> Result<(), std::io::Error> {
    match stream {
        #[cfg(target_os = "windows")]
        PlatformStream::NamedPipe(pipe) => {
            // Windows implementation would go here
            println!("Writing to Windows named pipe: {} bytes", data.len());
            Ok(())
        }
        
        #[cfg(not(target_os = "windows"))]
        PlatformStream::Unix(stream) => {
            use tokio::io::AsyncWriteExt;
            let mut stream = stream.try_clone().await
                .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e))?;
            
            stream.write_all(data).await?;
            stream.flush().await?;
            
            Ok(())
        }
    }
}

/// Send message to platform-specific stream
pub async fn send_message_to_stream(
    stream: &PlatformStream,
    message: &SidecarMessage,
) -> Result<(), String> {
    let message_json = serde_json::to_string(message)
        .map_err(|e| format!("Failed to serialize message: {}", e))?;
    
    // Add message length prefix
    let message_with_length = format!("{:08x}{}", message_json.len(), message_json);
    
    write_to_stream(stream, message_with_length.as_bytes()).await
        .map_err(|e| format!("Failed to write to stream: {}", e))
}

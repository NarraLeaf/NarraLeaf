/*!
 * Platform-specific stream operations
 */

use crate::ipc::types::PlatformStream;
use crate::communication::SidecarMessage;

/// Read data from platform-specific stream
pub async fn read_from_stream(stream: &mut PlatformStream) -> Result<Vec<u8>, std::io::Error> {
    match stream {
        #[cfg(target_os = "windows")]
        PlatformStream::NamedPipe(pipe) => {
            use tokio::io::AsyncReadExt;
            use tokio::time::{timeout, Duration};

            let mut temp_buffer = [0u8; 1024];
            // Prevent holding the stream lock for too long if no data yet
            let bytes_read = match timeout(Duration::from_millis(10), pipe.read(&mut temp_buffer)).await {
                Ok(Ok(n)) => n,
                Ok(Err(e)) => return Err(e),
                Err(_) => 0, // timed out, no data now
            };
            if bytes_read == 0 {
                // No data available right now; return empty vector
                // Debug log to trace read behavior on Windows pipes
                // Removed noisy logging for normal operation
            } else {
                // Only log significant reads to reduce noise
                if bytes_read > 100 {
                    println!("[STREAM] Windows NamedPipe read {} bytes", bytes_read);
                }
            }

            Ok(temp_buffer[..bytes_read].to_vec())
        }

        #[cfg(not(target_os = "windows"))]
        PlatformStream::Unix(stream) => {
            use tokio::io::AsyncReadExt;
            let mut stream = stream.try_clone().await
                .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e))?;

            let mut temp_buffer = [0u8; 1024];
            let bytes_read = stream.read(&mut temp_buffer).await?;
            if bytes_read == 0 {
                // No data available right now; return empty vector
                // Removed noisy logging for normal operation
            } else {
                // Only log significant reads to reduce noise
                if bytes_read > 100 {
                    println!("[STREAM] Unix socket read {} bytes", bytes_read);
                }
            }

            Ok(temp_buffer[..bytes_read].to_vec())
        }
    }
}

/// Write data to platform-specific stream
pub async fn write_to_stream(stream: &mut PlatformStream, data: &[u8]) -> Result<(), std::io::Error> {
    match stream {
        #[cfg(target_os = "windows")]
        PlatformStream::NamedPipe(pipe) => {
            use tokio::io::AsyncWriteExt;

            // Only log significant writes to reduce noise
            if data.len() > 100 {
                println!("[STREAM] Windows NamedPipe write {} bytes", data.len());
            }
            pipe.write_all(data).await?;
            pipe.flush().await?;
            // Removed flush confirmation to reduce noise

            Ok(())
        }

        #[cfg(not(target_os = "windows"))]
        PlatformStream::Unix(stream) => {
            use tokio::io::AsyncWriteExt;
            let mut stream = stream.try_clone().await
                .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e))?;

            // Only log significant writes to reduce noise
            if data.len() > 100 {
                println!("[STREAM] Unix socket write {} bytes", data.len());
            }
            stream.write_all(data).await?;
            stream.flush().await?;
            // Removed flush confirmation to reduce noise

            Ok(())
        }
    }
}

/// Send message to platform-specific stream
pub async fn send_message_to_stream(
    stream: &mut PlatformStream,
    message: &SidecarMessage,
) -> Result<(), String> {
    let message_json = serde_json::to_string(message)
        .map_err(|e| format!("Failed to serialize message: {}", e))?;

    // Add message length prefix
    let message_with_length = format!("{:08x}{}", message_json.len(), message_json);
    // Only log significant messages to reduce noise
    if message_json.len() > 200 {
        println!("[STREAM] Preparing to send message: type={:?}, json_len={}, total_len={}", message, message_json.len(), message_with_length.len());
    }

    write_to_stream(stream, message_with_length.as_bytes()).await
        .map_err(|e| format!("Failed to write to stream: {}", e))
}

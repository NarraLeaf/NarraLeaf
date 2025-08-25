use narraleaf_host::ipc::IPCServer;
use narraleaf_host::communication::PROTOCOL_VERSION;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("Starting NarraLeaf IPC Test Server...");
    println!("Protocol Version: {}", PROTOCOL_VERSION);
    
    // Create IPC server
    let mut server = IPCServer::new("narraleaf-ipc".to_string());
    
    // Start the server
    match server.start().await {
        Ok(()) => {
            println!("IPC Server started successfully");
        }
        Err(e) => {
            eprintln!("Failed to start IPC server: {}", e);
            return Err(e.into());
        }
    }
    
    // Keep the server running
    println!("Server is running. Press Ctrl+C to stop.");
    
    // Wait for shutdown signal
    tokio::signal::ctrl_c().await?;
    
    println!("Shutting down server...");
    
    // Stop the server
    if let Err(e) = server.stop().await {
        eprintln!("Error stopping server: {}", e);
    }
    
    println!("Server stopped.");
    Ok(())
}


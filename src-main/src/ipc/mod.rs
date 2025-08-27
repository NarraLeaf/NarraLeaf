/*!
 * IPC Module for Rust Tauri Host
 * 
 * This module provides the IPC functionality for communicating with NodeJS sidecar.
 * It is organized into several submodules for better separation of concerns.
 */

pub mod server;
pub mod client;
pub mod message;

pub mod types;
pub mod platform;
pub mod config;
pub mod error;

// Re-export main types for convenience
pub use server::IPCServer;
pub use types::ClientConnection;
pub use config::IPCConfig;

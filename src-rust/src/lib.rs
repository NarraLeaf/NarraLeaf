/*!
 * NarraLeaf Tauri Host
 * 
 * This is the main Rust process that serves as the Tauri host.
 * It provides a secure layer between the renderer (React) and the NodeJS sidecar process.
 * 
 * Architecture:
 * Renderer <-> Rust (Tauri Host) <-> NodeJS Sidecar (njs)
 * 
 * Key responsibilities:
 * - Provide a single IPC endpoint: request_ipc(type, payload, token)
 * - Validate requests with security tokens
 * - Forward authenticated requests to NodeJS sidecar
 * - Manage the NodeJS sidecar process lifecycle
 * - Handle custom protocol requests (app://)
 */

// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

pub mod sidecar;
pub mod communication;
pub mod ipc;

// Re-export main types for convenience
pub use communication::{SidecarMessage, PROTOCOL_VERSION};
pub use ipc::IPCServer;


/*!
 * NarraLeaf Tauri Plugin Library
 *
 * A Tauri plugin library that provides secure IPC communication and sidecar management
 * for NarraLeaf applications. This library can be used by Tauri applications to add
 * advanced features like Node.js sidecar processes, secure IPC channels, and custom protocols.
 *
 * ## Features
 *
 * - IPC communication with Node.js sidecar processes
 * - Node.js sidecar process management
 * - Custom protocol handling (app://)
 * - Operation execution framework
 * - Platform-specific optimizations
 *
 * ## Usage
 *
 * Add this to your `Cargo.toml`:
 * ```toml
 * [dependencies]
 * narraleaf-host = { version = "0.1.0", features = ["tauri-plugin"] }
 * ```
 *
 * Then in your `main.rs`:
 * ```rust
 * fn main() {
 *     tauri::Builder::default()
 *         .plugin(narraleaf_host::init())
 *         .run(tauri::generate_context!())
 *         .expect("error while running tauri application");
 * }
 * ```
 */

pub mod sidecar;
pub mod communication;
pub mod ipc;
pub mod tauri;
pub mod tauri_handlers;
mod operations;

// Re-export main types for convenience
pub use communication::{SidecarMessage, PROTOCOL_VERSION};
pub use ipc::IPCServer;
pub use sidecar::SidecarManager;
pub use tauri::{init, PluginState};
pub use tauri_handlers::{execute_tauri_operation, TauriOperationExecutor, OperationResult};


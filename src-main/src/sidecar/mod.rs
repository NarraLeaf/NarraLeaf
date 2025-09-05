/*!
 * NodeJS Sidecar Manager Module
 *
 * This module manages the lifecycle and communication with the NodeJS sidecar process.
 * It provides a simple, focused API for Tauri plugin integration.
 */

pub mod manager;
pub mod process;
pub mod state;
pub mod communication;

// Re-export main types
pub use manager::SidecarManager;
pub use state::SidecarState;

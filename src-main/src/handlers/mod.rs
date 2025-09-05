/*!
 * Tauri Operation Handlers Module
 *
 * This module provides organized handlers for different Tauri operations.
 * Each submodule handles a specific category of operations.
 */

pub mod window;
pub mod app;
pub mod filesystem;
pub mod clipboard;
pub mod dialog;
pub mod shell;
pub mod executor;

// Re-export main types
pub use executor::TauriOperationExecutor;
pub use executor::execute_tauri_operation;

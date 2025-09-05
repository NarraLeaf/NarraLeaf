/*!
 * Tauri Operation Handlers
 *
 * This module provides dedicated handlers for Tauri system operations.
 * It handles window management and application lifecycle operations
 * requested from the NodeJS sidecar via the tauri:* namespace.
 * 
 * This file now serves as a compatibility layer that re-exports
 * the new modular handler structure.
 */

pub use crate::handler_types::*;
pub use crate::operations::OperationResult;
pub use crate::handlers::*;
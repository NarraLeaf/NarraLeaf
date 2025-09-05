/*!
 * Sidecar State Management
 *
 * Defines the lifecycle state of the sidecar process and related state management.
 */

/**
 * Lifecycle state of the sidecar process
 */
#[derive(Debug, Clone, PartialEq)]
pub enum SidecarState {
    Stopped,
    Starting,
    Running,
    Stopping,
    Failed,
}

impl SidecarState {
    /**
     * Check if the sidecar is currently running
     */
    pub fn is_running(&self) -> bool {
        matches!(self, SidecarState::Running)
    }

    /**
     * Check if the sidecar can be started
     */
    pub fn can_start(&self) -> bool {
        matches!(self, SidecarState::Stopped)
    }

    /**
     * Check if the sidecar can be stopped
     */
    pub fn can_stop(&self) -> bool {
        matches!(self, SidecarState::Running | SidecarState::Starting)
    }
}

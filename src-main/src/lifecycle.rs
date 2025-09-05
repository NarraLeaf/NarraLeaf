use std::sync::Arc;
use std::process;
use crate::tauri::get_global_plugin_state;
use crate::sidecar::SidecarState;

/// Reasons that can trigger application shutdown
#[derive(Debug)]
pub enum ShutdownReason {
    SidecarRequested,
    WindowRequested,
    FatalError(String),
    Signal(String),
    SidecarDied,
}

/// Centralised lifecycle manager that handles graceful shutdown
pub struct LifecycleManager;

impl LifecycleManager {
    /// Perform graceful shutdown. This function is **idempotent** – subsequent
    /// calls after the first one become no-ops.
    pub async fn shutdown(reason: ShutdownReason) {
        println!("[LIFECYCLE] Shutdown requested – reason: {:?}", reason);

        // Perform cleanup in a detached task so we don't get stuck if it hangs.
        if let Some(state_arc) = get_global_plugin_state() {
            tokio::spawn(async move {
                let mut manager = state_arc.sidecar_manager.lock().await;
                if *manager.get_state() != SidecarState::Stopped {
                    if let Err(e) = manager.stop().await {
                        eprintln!("[LIFECYCLE] Failed to stop sidecar: {}", e);
                    }
                }
            });
        }

        // Give cleanup at most 2 s then exit.
        tokio::spawn(async {
            tokio::time::sleep(std::time::Duration::from_secs(2)).await;
            println!("[LIFECYCLE] Forcing process exit");
            let _ = std::io::Write::flush(&mut std::io::stdout());
            process::exit(0);
        });
    }
}

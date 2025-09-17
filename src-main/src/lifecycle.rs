use std::process;
use crate::tauri::get_global_plugin_state;
use crate::sidecar::SidecarState;

/// Reasons that can trigger application shutdown
#[derive(Debug)]
pub enum ShutdownReason {
    SidecarRequested,
    MainWindowClosed,  // NEW: Main window close triggers exit
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

        match reason {
            // Sidecar explicitly requested app quit:
            // 1) kill sidecar immediately
            // 2) allow exit and trigger app exit now
            ShutdownReason::SidecarRequested => {
                if let Some(state_arc) = get_global_plugin_state() {
                    {
                        let mut manager = state_arc.sidecar_manager.lock().await;
                        let _ = manager.kill_sidecar_only().await;
                    }
                    state_arc
                        .allow_exit
                        .store(true, std::sync::atomic::Ordering::SeqCst);
                    // Trigger tauri exit immediately
                    state_arc.app_handle.exit(0);
                } else {
                    // Fallback: if no state, force process exit
                    println!("[LIFECYCLE] No plugin state; forcing immediate exit");
                    process::exit(0);
                }
            }

            // Main window closed - this is the primary exit path in new architecture
            ShutdownReason::MainWindowClosed => {
                if let Some(state_arc) = get_global_plugin_state() {
                    // Notify sidecar about window close
                    let sidecar_manager = state_arc.sidecar_manager.lock().await;
                    let payload = serde_json::json!({
                        "label": "main",
                        "timestamp": std::time::SystemTime::now()
                            .duration_since(std::time::UNIX_EPOCH)
                            .unwrap_or_default()
                            .as_millis()
                    });
                    let _ = sidecar_manager
                        .send_sidecar_request("sidecar:window.on_close", payload)
                        .await;
                    
                    // Allow exit and trigger app exit
                    state_arc.allow_exit.store(true, std::sync::atomic::Ordering::SeqCst);
                    state_arc.app_handle.exit(0);
                } else {
                    println!("[LIFECYCLE] No plugin state; forcing immediate exit");
                    process::exit(0);
                }
            }

            // For other reasons, perform fast stop (kill first due to reordered stop),
            // then request tauri exit immediately. Keep 2s hard-exit as safety.
            _ => {
                if let Some(state_arc) = get_global_plugin_state() {
                    let app_handle = state_arc.app_handle.clone();
                    let state_arc_clone = state_arc.clone();
                    tokio::spawn(async move {
                        let mut manager = state_arc_clone.sidecar_manager.lock().await;
                        if *manager.get_state() != SidecarState::Stopped {
                            if let Err(e) = manager.stop().await {
                                eprintln!("[LIFECYCLE] Failed to stop sidecar: {}", e);
                            }
                        }
                    });

                    state_arc
                        .allow_exit
                        .store(true, std::sync::atomic::Ordering::SeqCst);
                    // Ask tauri to exit now; Exit handler will still run
                    app_handle.exit(0);

                    // Safety hard-exit if something still hangs
                    tokio::spawn(async {
                        tokio::time::sleep(std::time::Duration::from_secs(2)).await;
                        println!("[LIFECYCLE] Forcing process exit");
                        let _ = std::io::Write::flush(&mut std::io::stdout());
                        process::exit(0);
                    });
                } else {
                    // No state; force exit quickly
                    println!("[LIFECYCLE] No plugin state; forcing immediate exit");
                    process::exit(0);
                }
            }
        }
    }
}

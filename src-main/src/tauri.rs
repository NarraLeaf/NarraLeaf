/*!
 * NarraLeaf Tauri Plugin
 *
 * This module provides the Tauri plugin implementation for NarraLeaf.
 * It exposes secure IPC communication and sidecar management functionality
 * to Tauri applications.
 */

use tauri::{plugin::Builder, plugin::TauriPlugin, AppHandle, Manager};
use std::sync::Arc;
use tokio::sync::Mutex;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use uuid::Uuid;
use std::time::Duration;
use std::sync::atomic::AtomicBool;

use crate::sidecar::SidecarManager;
use crate::communication::PROTOCOL_VERSION;
use crate::lifecycle::{LifecycleManager, ShutdownReason};

use std::sync::OnceLock;

/**
 * Global reference to plugin state for IPC protocol handler
 */
static GLOBAL_PLUGIN_STATE: OnceLock<Arc<PluginState>> = OnceLock::new();

/**
 * Get global plugin state safely
 */
pub fn get_global_plugin_state() -> Option<Arc<PluginState>> {
    GLOBAL_PLUGIN_STATE.get().cloned()
}

/**
 * Check if debug mode is enabled via command line arguments
 */
fn is_debug_mode_enabled() -> bool {
    let args: Vec<String> = std::env::args().collect();
    args.iter().any(|arg| arg == "--debug" || arg == "-d")
}

/**
 * Plugin state shared across the Tauri app
 */
pub struct PluginState {
    pub sidecar_manager: Arc<Mutex<SidecarManager>>,
    pub app_handle: AppHandle,
    pub debug_mode: bool,
    pub allow_exit: AtomicBool,
    pub main_window_ready: AtomicBool,
}

/**
 * IPC request payload from renderer
 * Now includes id field for proper request-response correlation
 */
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IPCRequest {
    pub id: String,
    pub request_type: String,
    pub payload: Value,
}

/**
 * IPC response to renderer
 * Now includes id field for proper request-response correlation
 */
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IPCResponse {
    pub id: String,
    pub success: bool,
    pub data: Option<Value>,
    pub error: Option<String>,
}

/**
 * Initialize the NarraLeaf plugin
 *
 * This function creates and returns a Tauri plugin that provides
 * NarraLeaf functionality to your Tauri application.
 * 
 * NEW ARCHITECTURE:
 * - Tauri automatically creates and manages a single main window
 * - Sidecar receives window proxy through onReady event
 * - Window close triggers automatic application exit
 * - No window creation requests from sidecar
 */
pub fn init() -> TauriPlugin<tauri::Wry> {
    Builder::new("narraleaf")
        .register_uri_scheme_protocol("app", |app, request| {
            use std::fs;
            use std::path::PathBuf;

            // Parse URI and extract path after scheme://authority (support app://localhost and http(s)://app.localhost)
            let uri_str = request.uri().to_string();
            let after_scheme = match uri_str.find("://") {
                Some(pos) => &uri_str[pos + 3..],
                None => uri_str.as_str(),
            };
            let mut path_part: String = match after_scheme.find('/') {
                Some(idx) => after_scheme[idx..].to_string(),
                None => "/".into(),
            };

            // Strip query/hash
            if let Some(idx) = path_part.find(['?', '#']) { path_part.truncate(idx); }

            // Normalize path: remove leading "/./" and collapse redundant segments
            while path_part.starts_with("/./") {
                path_part = path_part.replacen("/./", "/", 1);
            }
            // Sanitize to prevent path traversal and compute final relative path
            let mut safe_segments: Vec<&str> = Vec::new();
            for seg in path_part.split('/') {
                if seg.is_empty() || seg == "." { continue; }
                if seg == ".." { let _ = safe_segments.pop(); continue; }
                safe_segments.push(seg);
            }
            let mut rel_path = safe_segments.join("/");
            if rel_path.is_empty() { rel_path = "index.html".into(); }

            // Build candidate base directories in order of preference
            let mut candidates: Vec<PathBuf> = Vec::new();
            if let Ok(resource_dir) = app.app_handle().path().resource_dir() {
                candidates.push(resource_dir.join("client"));
                candidates.push(resource_dir.join("dist").join("client"));
            }
            if let Ok(mut exe_dir) = std::env::current_exe() {
                exe_dir.pop();
                candidates.push(exe_dir.join("resources").join("client"));
                candidates.push(exe_dir.join("dist").join("client"));
            }
            if let Ok(cwd) = std::env::current_dir() {
                candidates.push(cwd.join("dist").join("client"));
            }

            // If authority hints at a specific area, we could switch, but for now treat all the same
            let mut chosen_file: Option<PathBuf> = None;
            for base in candidates {
                let candidate = base.join(&rel_path);
                // If candidate is a dir, fallback to index.html inside it
                let final_path = if candidate.is_dir() {
                    candidate.join("index.html")
                } else {
                    candidate
                };
                // Ensure final_path is inside base to avoid traversal
                let in_base = match (final_path.canonicalize(), base.canonicalize()) {
                    (Ok(f), Ok(b)) => f.starts_with(&b),
                    _ => true,
                };
                if in_base && final_path.exists() {
                    chosen_file = Some(final_path);
                    break;
                }
            }

            match chosen_file {
                Some(file_path) => {
                    let data = fs::read(&file_path).unwrap_or_else(|_| b"Not Found".to_vec());
                    let mime_type = mime_guess::from_path(&file_path).first_or(mime::TEXT_PLAIN);
                    tauri::http::Response::builder()
                        .header("Content-Type", mime_type.essence_str())
                        .status(200)
                        .body(data)
                        .unwrap()
                }
                None => {
                    let body = b"Not Found".to_vec();
                    tauri::http::Response::builder()
                        .header("Content-Type", "text/plain")
                        .status(404)
                        .body(body)
                        .unwrap()
                }
            }
        })
        .invoke_handler(tauri::generate_handler![crate::ipc_protocol::ipc_request_command])
        .setup(move |app, _api| {
            // Check if debug mode is enabled
            let debug_mode = is_debug_mode_enabled();
            if debug_mode {
                println!("Initializing NarraLeaf Tauri Runtime plugin...");
                println!("Protocol version: {}", PROTOCOL_VERSION);
                println!("DEBUG MODE ENABLED: Sidecar output will be redirected to main console");
            }

            // Generate random socket connection string and start IPC server
            let connection_string = format!("narraleaf-ipc-{}", Uuid::new_v4().simple());

            // Create plugin state
            let sidecar_manager = Arc::new(Mutex::new(SidecarManager::new(connection_string.clone(), app.app_handle().clone(), debug_mode)));
            let plugin_state = PluginState {
                sidecar_manager: Arc::clone(&sidecar_manager),
                app_handle: app.app_handle().clone(),
                debug_mode,
                allow_exit: AtomicBool::new(false),
                main_window_ready: AtomicBool::new(false),
            };

            // Store the plugin state
            let plugin_state_arc = Arc::new(plugin_state);
            app.manage(plugin_state_arc.clone());

            // Store global reference for IPC protocol handler
            let _ = GLOBAL_PLUGIN_STATE.set(plugin_state_arc.clone());

            // Setup main window ready event listener
            setup_main_window_ready_listener(&app.app_handle(), plugin_state_arc.clone());

            // Start sidecar process with socket connection string as parameter
            let connection_string_clone = connection_string.clone();
            let sidecar_manager_clone: Arc<tokio::sync::Mutex<SidecarManager>> = Arc::clone(&plugin_state_arc.sidecar_manager);

            // Start sidecar in a separate task
            tokio::spawn(async move {
                println!("Starting sidecar lifecycle management...");

                // Get mutable access to the sidecar manager
                {
                    let mut manager = sidecar_manager_clone.lock().await;

                    // Start the sidecar process
                    let sidecar_path = if cfg!(target_os = "windows") {
                        "resources/service/sidecar.exe"
                    } else {
                        "resources/service/sidecar"
                    };
                    if let Err(e) = manager.start_sidecar_and_ipc(sidecar_path, &connection_string_clone).await {
                        eprintln!("Failed to start sidecar: {}", e);
                        manager.state = crate::sidecar::SidecarState::Failed;
                        return;
                    } else if debug_mode {
                        println!("Sidecar started successfully with connection: {}", connection_string_clone);
                        println!("Plugin initialization completed");
                        println!("Note: Main window will be automatically created and managed by Tauri");
                    }
                } // manager lock dropped here

                // Spawn separate task for health monitoring so that the lock isn't held across sleeps
                tokio::spawn(monitor_sidecar(sidecar_manager_clone.clone(), debug_mode));
            });

            if debug_mode {
                println!("NarraLeaf plugin initialized successfully");
                println!("Global operations completed");
                println!("Waiting for main window to be ready...");
            }
            Ok(())
        })
        .on_event(move |app, event| {
            match event {
                tauri::RunEvent::ExitRequested { api, .. } => {
                    if let Some(state) = get_global_plugin_state() {
                        if state.allow_exit.load(std::sync::atomic::Ordering::SeqCst) {
                            println!("[LIFECYCLE] ExitAllowed – proceeding to exit");
                            // Do NOT call prevent_exit so Tauri can shut down normally
                        } else {
                            println!("[LIFECYCLE] Tauri ExitRequested intercepted – initiating graceful shutdown");
                            // Prevent immediate exit to allow cleanup
                            api.prevent_exit();
                            // Trigger our unified lifecycle shutdown handler
                            tauri::async_runtime::spawn(async {
                                LifecycleManager::shutdown(ShutdownReason::Signal("ExitRequested".into())).await;
                            });
                        }
                    } else {
                        println!("[LIFECYCLE] Plugin state unavailable, initiating forced shutdown");
                        api.prevent_exit();
                        tauri::async_runtime::spawn(async {
                            LifecycleManager::shutdown(ShutdownReason::Signal("ExitRequested (no state)".into())).await;
                        });
                    }
                }
                tauri::RunEvent::Exit => {
                    println!("Tauri app is exiting, stopping sidecar...");

                    // Get the sidecar manager and stop it synchronously
                    let app_handle = app.clone();
                    
                    // Use blocking spawn and wait for completion to ensure sidecar is fully stopped
                    let (tx, rx) = std::sync::mpsc::channel();
                    std::thread::spawn(move || {
                        // Create a new runtime for this thread to handle async operations
                        let rt = tokio::runtime::Runtime::new().unwrap();
                        rt.block_on(async {
                            // Retrieve the managed state as `Arc<PluginState>` instead of `PluginState`
                            if let Some(state_arc) = app_handle.try_state::<Arc<PluginState>>() {
                                // Clone to extend lifetime outside of the if block if needed
                                let state = state_arc.as_ref();
                                let mut manager = state.sidecar_manager.lock().await;
                                println!("[EXIT] Stopping sidecar manager synchronously...");
                                if let Err(e) = manager.stop().await {
                                    eprintln!("[EXIT] Error stopping sidecar during app exit: {}", e);
                                } else {
                                    println!("[EXIT] Sidecar stopped successfully during app exit");
                                }
                            } else {
                                eprintln!("[EXIT] Could not access plugin state during app exit");
                            }
                        });
                        // Signal completion
                        let _ = tx.send(());
                    });
                    
                    // Wait for sidecar to stop (with timeout)
                    match rx.recv_timeout(std::time::Duration::from_secs(2)) {
                        Ok(_) => println!("[EXIT] Sidecar cleanup completed successfully"),
                        Err(_) => {
                            eprintln!("[EXIT] Sidecar cleanup timeout (2s), forcing exit now");
                            // Force terminate the entire process to avoid hanging
                            std::process::exit(0);
                        },
                    }
                }
                _ => {}
            }
        })
        .build()
}

/**
 * Setup main window ready event listener
 * This function sets up listeners for the main window lifecycle events
 */
fn setup_main_window_ready_listener(app: &tauri::AppHandle, plugin_state: Arc<PluginState>) {
    // Get the main window (should be created by Tauri automatically)
    if let Some(main_window) = app.get_webview_window("main") {
        println!("Setting up main window ready listener");
        
        let plugin_state_clone = plugin_state.clone();
        let app_handle_clone = app.app_handle().clone();
        
        // Listen for window ready event
        main_window.on_window_event(move |event| {
            match event {
                tauri::WindowEvent::CloseRequested { .. } => {
                    println!("Main window close requested - triggering application exit");
                    let app_handle = app_handle_clone.clone();
                    tokio::spawn(async move {
                        if let Some(plugin_state) = get_global_plugin_state() {
                            // Notify sidecar about window close
                            let sidecar_manager = plugin_state.sidecar_manager.lock().await;
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
                            
                            // Allow exit and trigger application shutdown
                            plugin_state.allow_exit.store(true, std::sync::atomic::Ordering::SeqCst);
                            app_handle.exit(0);
                        }
                    });
                }
                tauri::WindowEvent::Focused(_) => {
                    // Main window is focused and ready
                    if !plugin_state_clone.main_window_ready.load(std::sync::atomic::Ordering::SeqCst) {
                        println!("Main window is ready - notifying sidecar");
                        plugin_state_clone.main_window_ready.store(true, std::sync::atomic::Ordering::SeqCst);
                        
                        // Notify sidecar that main window is ready
                        tokio::spawn(async move {
                            if let Some(plugin_state) = get_global_plugin_state() {
                                let sidecar_manager = plugin_state.sidecar_manager.lock().await;
                                let payload = serde_json::json!({
                                    "window_label": "main",
                                    "timestamp": std::time::SystemTime::now()
                                        .duration_since(std::time::UNIX_EPOCH)
                                        .unwrap_or_default()
                                        .as_millis()
                                });
                                let _ = sidecar_manager
                                    .send_sidecar_request("sidecar:window.on_ready", payload)
                                    .await;
                            }
                        });
                    }
                }
                _ => {}
            }
        });
    } else {
        println!("Warning: Main window not found at startup - this may indicate a configuration issue");
    }
}

// =====================
// Sidecar monitoring
// =====================
async fn monitor_sidecar(sidecar_manager: Arc<Mutex<SidecarManager>>, debug_mode: bool) {
    let mut iteration: usize = 0;
    loop {
        iteration += 1;
        let should_continue = {
            let mut manager = sidecar_manager.lock().await;
            manager.check_health(iteration).await
        };

        if !should_continue {
            println!("[SIDECAR] Detected sidecar failure – requesting application shutdown");
            // Gracefully shut down the whole Tauri application
            LifecycleManager::shutdown(ShutdownReason::SidecarDied).await;
            break;
        }

        // Sleep 5s between checks (same interval as之前)
        if debug_mode {
            println!("[SIDECAR] Waiting 5 seconds before next health check (monitor task)...");
        }
        tokio::time::sleep(Duration::from_secs(5)).await;
    }

    println!("[SIDECAR] Sidecar monitoring task stopped");
}

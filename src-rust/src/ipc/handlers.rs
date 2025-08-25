/*!
 * Message Handlers
 * 
 * Contains implementations of various message handlers
 */

use crate::ipc::types::MessageHandler;
use crate::communication::SidecarMessage;
use serde_json::Value;

/// Default ping handler
pub struct PingHandler;

impl MessageHandler for PingHandler {
    fn handle_message(&self, message: &SidecarMessage) -> Result<Option<SidecarMessage>, String> {
        match message {
            SidecarMessage::Ping { timestamp } => {
                Ok(Some(SidecarMessage::Pong { timestamp: *timestamp }))
            }
            _ => Ok(None)
        }
    }
}

/// Default version check handler
pub struct VersionHandler;

impl MessageHandler for VersionHandler {
    fn handle_message(&self, message: &SidecarMessage) -> Result<Option<SidecarMessage>, String> {
        match message {
            SidecarMessage::VersionCheck { version } => {
                let compatible = *version == crate::communication::PROTOCOL_VERSION;
                Ok(Some(SidecarMessage::VersionResponse {
                    version: crate::communication::PROTOCOL_VERSION,
                    compatible,
                }))
            }
            _ => Ok(None)
        }
    }
}

/// Echo handler for testing
pub struct EchoHandler;

impl MessageHandler for EchoHandler {
    fn handle_message(&self, message: &SidecarMessage) -> Result<Option<SidecarMessage>, String> {
        match message {
            SidecarMessage::Request { id, request_type, payload } => {
                if request_type == "echo" {
                    Ok(Some(SidecarMessage::Response {
                        id: id.clone(),
                        success: true,
                        data: payload.clone(),
                        error: None,
                    }))
                } else {
                    Ok(None)
                }
            }
            _ => Ok(None)
        }
    }
}

/// Status handler for system information
pub struct StatusHandler;

impl MessageHandler for StatusHandler {
    fn handle_message(&self, message: &SidecarMessage) -> Result<Option<SidecarMessage>, String> {
        match message {
            SidecarMessage::Request { id, request_type, payload } => {
                if request_type == "status" {
                    let status_data = serde_json::json!({
                        "platform": std::env::consts::OS,
                        "arch": std::env::consts::ARCH,
                        "timestamp": std::time::SystemTime::now()
                            .duration_since(std::time::UNIX_EPOCH)
                            .unwrap_or_default()
                            .as_secs()
                    });
                    
                    Ok(Some(SidecarMessage::Response {
                        id: id.clone(),
                        success: true,
                        data: Some(status_data),
                        error: None,
                    }))
                } else {
                    Ok(None)
                }
            }
            _ => Ok(None)
        }
    }
}

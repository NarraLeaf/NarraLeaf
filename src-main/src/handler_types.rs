use serde::{Deserialize, Serialize};

/**
 * Window creation payload
 */
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WindowCreatePayload {
    pub label: String,
    pub title: String,
    pub width: f64,
    pub height: f64,
    pub url: Option<String>,
    pub x: Option<f64>,
    pub y: Option<f64>,
    pub center: Option<bool>,
    pub decorations: Option<bool>,
    pub always_on_top: Option<bool>,
    pub skip_taskbar: Option<bool>,
    pub show: Option<bool>,
    pub resizable: Option<bool>,
    pub closable: Option<bool>,
    pub minimizable: Option<bool>,
    pub maximizable: Option<bool>,
    pub focus: Option<bool>,
    pub transparent: Option<bool>,
    pub fullscreen: Option<bool>,
}

/**
 * Window maximization payload
 */
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WindowMaximizePayload {
    pub label: Option<String>,
}

impl Default for WindowMaximizePayload {
    fn default() -> Self {
        Self { label: None }
    }
}

/**
 * Window minimization payload
 */
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WindowMinimizePayload {
    pub label: Option<String>,
}

impl Default for WindowMinimizePayload {
    fn default() -> Self {
        Self { label: None }
    }
}

/**
 * Window close payload
 */
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WindowClosePayload {
    pub label: Option<String>,
}

impl Default for WindowClosePayload {
    fn default() -> Self {
        Self { label: None }
    }
}

/**
 * Application quit payload
 */
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppQuitPayload {
    pub reason: Option<String>,
}

impl Default for AppQuitPayload {
    fn default() -> Self {
        Self { reason: None }
    }
}

/**
 * Window show payload
 */
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WindowShowPayload {
    pub label: Option<String>,
}

impl Default for WindowShowPayload {
    fn default() -> Self {
        Self { label: None }
    }
}

/**
 * Window hide payload
 */
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WindowHidePayload {
    pub label: Option<String>,
}

impl Default for WindowHidePayload {
    fn default() -> Self {
        Self { label: None }
    }
}

/**
 * Window focus payload
 */
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WindowFocusPayload {
    pub label: Option<String>,
}

impl Default for WindowFocusPayload {
    fn default() -> Self {
        Self { label: None }
    }
}

/**
 * Window position payload
 */
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WindowPositionPayload {
    pub label: Option<String>,
    pub x: f64,
    pub y: f64,
}

impl Default for WindowPositionPayload {
    fn default() -> Self {
        Self {
            label: None,
            x: 0.0,
            y: 0.0,
        }
    }
}

/**
 * Window size payload
 */
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WindowSizePayload {
    pub label: Option<String>,
    pub width: f64,
    pub height: f64,
}

impl Default for WindowSizePayload {
    fn default() -> Self {
        Self {
            label: None,
            width: 800.0,
            height: 600.0,
        }
    }
}

/**
 * Window title payload
 */
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WindowTitlePayload {
    pub label: Option<String>,
    pub title: String,
}

impl Default for WindowTitlePayload {
    fn default() -> Self {
        Self {
            label: None,
            title: "NarraLeaf".to_string(),
        }
    }
}

/**
 * Window center payload
 */
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WindowCenterPayload {
    pub label: Option<String>,
}

impl Default for WindowCenterPayload {
    fn default() -> Self {
        Self { label: None }
    }
}

/**
 * Window decorations payload
 */
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WindowDecorationsPayload {
    pub label: Option<String>,
    pub decorations: bool,
}

impl Default for WindowDecorationsPayload {
    fn default() -> Self {
        Self {
            label: None,
            decorations: true,
        }
    }
}

/**
 * Window resizable payload
 */
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WindowResizablePayload {
    pub label: Option<String>,
    pub resizable: bool,
}

impl Default for WindowResizablePayload {
    fn default() -> Self {
        Self {
            label: None,
            resizable: true,
        }
    }
}

/**
 * Window closable payload
 */
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WindowClosablePayload {
    pub label: Option<String>,
    pub closable: bool,
}

impl Default for WindowClosablePayload {
    fn default() -> Self {
        Self {
            label: None,
            closable: true,
        }
    }
}

/**
 * Window minimizable payload
 */
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WindowMinimizablePayload {
    pub label: Option<String>,
    pub minimizable: bool,
}

impl Default for WindowMinimizablePayload {
    fn default() -> Self {
        Self {
            label: None,
            minimizable: true,
        }
    }
}

/**
 * Window maximizable payload
 */
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WindowMaximizablePayload {
    pub label: Option<String>,
    pub maximizable: bool,
}

impl Default for WindowMaximizablePayload {
    fn default() -> Self {
        Self {
            label: None,
            maximizable: true,
        }
    }
}

/**
 * Window transparent payload
 */
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WindowTransparentPayload {
    pub label: Option<String>,
    pub transparent: bool,
}

impl Default for WindowTransparentPayload {
    fn default() -> Self {
        Self {
            label: None,
            transparent: false,
        }
    }
}

/**
 * Window fullscreen payload
 */
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WindowFullscreenPayload {
    pub label: Option<String>,
    pub fullscreen: bool,
}

impl Default for WindowFullscreenPayload {
    fn default() -> Self {
        Self {
            label: None,
            fullscreen: false,
        }
    }
}

/**
 * File system read text file payload
 */
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FsReadTextFilePayload {
    pub path: String,
}

/**
 * File system write text file payload
 */
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FsWriteTextFilePayload {
    pub path: String,
    pub contents: String,
}

/**
 * File system read binary file payload
 */
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FsReadBinaryFilePayload {
    pub path: String,
}

/**
 * File system write binary file payload
 */
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FsWriteBinaryFilePayload {
    pub path: String,
    pub contents: Vec<u8>,
}

/**
 * File system exists payload
 */
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FsExistsPayload {
    pub path: String,
}

/**
 * File system mkdir payload
 */
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FsMkdirPayload {
    pub path: String,
    pub options: Option<MkdirOptions>,
}

/**
 * File system remove payload
 */
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FsRemovePayload {
    pub path: String,
    pub options: Option<RemoveOptions>,
}

/**
 * File system copy file payload
 */
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FsCopyFilePayload {
    pub from: String,
    pub to: String,
}

/**
 * File system rename payload
 */
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FsRenamePayload {
    pub from: String,
    pub to: String,
}

/**
 * File system read dir payload
 */
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FsReadDirPayload {
    pub path: String,
    pub options: Option<ReadDirOptions>,
}

/**
 * Dialog open payload
 */
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DialogOpenPayload {
    pub options: Option<DialogOpenOptions>,
}

/**
 * Dialog save payload
 */
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DialogSavePayload {
    pub options: Option<DialogSaveOptions>,
}

/**
 * Dialog message payload
 */
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DialogMessagePayload {
    pub message: String,
    pub options: Option<DialogMessageOptions>,
}

/**
 * Dialog ask payload
 */
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DialogAskPayload {
    pub message: String,
    pub options: Option<DialogAskOptions>,
}

/**
 * Clipboard write text payload
 */
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClipboardWriteTextPayload {
    pub text: String,
}

impl Default for ClipboardWriteTextPayload {
    fn default() -> Self {
        Self { text: String::new() }
    }
}

/**
 * App get version payload
 */
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppGetVersionPayload {}

/**
 * App get name payload
 */
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppGetNamePayload {}

/**
 * App get tauri version payload
 */
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppGetTauriVersionPayload {}

/**
 * App show payload
 */
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppShowPayload {}

/**
 * App hide payload
 */
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppHidePayload {}

/**
 * App get metadata payload
 */
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppGetMetadataPayload {}





/**
 * Shell open payload
 */
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ShellOpenPayload {
    pub path: String,
    pub options: Option<ShellOpenOptions>,
}

// Supporting structs for options
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MkdirOptions {
    pub recursive: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RemoveOptions {
    pub recursive: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReadDirOptions {
    pub recursive: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DialogOpenOptions {
    pub default_path: Option<String>,
    pub filters: Option<Vec<FileFilter>>,
    pub multiple: Option<bool>,
    pub directory: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DialogSaveOptions {
    pub default_path: Option<String>,
    pub filters: Option<Vec<FileFilter>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DialogMessageOptions {
    pub title: Option<String>,
    pub kind: Option<String>, // "info", "warning", "error"
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DialogAskOptions {
    pub title: Option<String>,
    pub kind: Option<String>, // "info", "warning", "error"
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileFilter {
    pub name: String,
    pub extensions: Vec<String>,
}



#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ShellOpenOptions {
    pub with: Option<String>, // command to use for opening
}
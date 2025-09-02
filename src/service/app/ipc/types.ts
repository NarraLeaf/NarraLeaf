/**
 * IPC Communication Types
 * 
 * TypeScript definitions matching the Rust communication.rs protocol
 */

import { RuntimeRequestPayload, RuntimeRequestTypes } from "./protocol";

/**
 * Communication Protocol Version
 */
export const PROTOCOL_VERSION = 1;
export const MAX_MESSAGE_SIZE = 1024 * 1024; // 1MB

/**
 * Message types for communication - matching Rust SidecarMessage enum
 */
export type SidecarMessage =
  | RequestMessage
  | ResponseMessage
  | VersionCheckMessage
  | VersionResponseMessage;

/**
 * Request from TypeScript to Rust
 */
export interface RequestMessage<T extends RuntimeRequestTypes = any> {
  type: 'Request';
  id: string;
  request_type: T;
  payload: RuntimeRequestPayload[T];
}

/**
 * Response from Rust to TypeScript
 */
export type ResponseMessage<T = any> =
  | {
    type: 'Response';
    id: string;
    success: true;
    data: T;
  }
  | {
    type: 'Response';
    id: string;
    success: false;
    error: string;
  };

/**
 * Protocol version check
 */
export interface VersionCheckMessage {
  type: 'VersionCheck';
  version: number;
}

/**
 * Protocol version response
 */
export interface VersionResponseMessage {
  type: 'VersionResponse';
  version: number;
  compatible: boolean;
}

/**
 * Connection status
 */
export enum ConnectionStatus {
  Disconnected = 'Disconnected',
  Connecting = 'Connecting',
  Connected = 'Connected',
  Failed = 'Failed',
}

/**
 * Message handler interface
 */
export interface MessageHandler {
  handleMessage(message: SidecarMessage): Promise<SidecarMessage | null>;
}

/**
 * Message with length prefix for transmission
 */
export interface TransmittedMessage {
  length: number;
  data: Buffer;
}



// ============================================================================
// Window Management Types
// ============================================================================

/**
 * Window creation configuration
 */
export interface WindowCreatePayload {
  label: string;
  title: string;
  width: number;
  height: number;
  x?: number;
  y?: number;
  center?: boolean;
  decorations?: boolean;
  always_on_top?: boolean;
  skip_taskbar?: boolean;
  show?: boolean;
  resizable?: boolean;
  closable?: boolean;
  minimizable?: boolean;
  maximizable?: boolean;
  focus?: boolean;
  transparent?: boolean;
  fullscreen?: boolean;
}

/**
 * Window maximize configuration
 */
export interface WindowMaximizePayload {
  label?: string;
}

/**
 * Window minimize configuration
 */
export interface WindowMinimizePayload {
  label?: string;
}

/**
 * Window close configuration
 */
export interface WindowClosePayload {
  label?: string;
}

/**
 * Window show configuration
 */
export interface WindowShowPayload {
  label?: string;
}

/**
 * Window hide configuration
 */
export interface WindowHidePayload {
  label?: string;
}

/**
 * Window focus configuration
 */
export interface WindowFocusPayload {
  label?: string;
}

/**
 * Window position configuration
 */
export interface WindowPositionPayload {
  label?: string;
  x: number;
  y: number;
}

/**
 * Window size configuration
 */
export interface WindowSizePayload {
  label?: string;
  width: number;
  height: number;
}

/**
 * Window title configuration
 */
export interface WindowTitlePayload {
  label?: string;
  title: string;
}

/**
 * Window center configuration
 */
export interface WindowCenterPayload {
  label?: string;
}

/**
 * Window decorations configuration
 */
export interface WindowDecorationsPayload {
  label?: string;
  decorations: boolean;
}

/**
 * Window resizable configuration
 */
export interface WindowResizablePayload {
  label?: string;
  resizable: boolean;
}

/**
 * Window closable configuration
 */
export interface WindowClosablePayload {
  label?: string;
  closable: boolean;
}

/**
 * Window minimizable configuration
 */
export interface WindowMinimizablePayload {
  label?: string;
  minimizable: boolean;
}

/**
 * Window maximizable configuration
 */
export interface WindowMaximizablePayload {
  label?: string;
  maximizable: boolean;
}

/**
 * Window transparent configuration
 */
export interface WindowTransparentPayload {
  label?: string;
  transparent: boolean;
}

/**
 * Window fullscreen configuration
 */
export interface WindowFullscreenPayload {
  label?: string;
  fullscreen: boolean;
}

// ============================================================================
// Dialog Types
// ============================================================================

/**
 * Open dialog options
 */
export interface OpenDialogOptions {
  default_path?: string;
  filters?: FileFilter[];
  multiple?: boolean;
  directory?: boolean;
}

/**
 * Save dialog options
 */
export interface SaveDialogOptions {
  default_path?: string;
  filters?: FileFilter[];
}

/**
 * File filter
 */
export interface FileFilter {
  name: string;
  extensions: string[];
}

/**
 * Message dialog options
 */
export interface MessageDialogOptions {
  title?: string;
  kind?: 'info' | 'warning' | 'error';
}

/**
 * Confirm dialog options
 */
export interface ConfirmDialogOptions {
  title?: string;
  kind?: 'info' | 'warning' | 'error';
}

// ============================================================================
// Shell Types
// ============================================================================

/**
 * Shell open options
 */
export interface OpenOptions {
  with?: string;
}

// ============================================================================
// Base Types
// ============================================================================

/**
 * Error type
 */
export interface Error {
  message: string;
  code?: string;
  details?: any;
}

// ============================================================================
// File System Types
// ============================================================================

/**
 * File system read text file payload
 */
export interface FsReadTextFilePayload {
  path: string;
}

/**
 * File system write text file payload
 */
export interface FsWriteTextFilePayload {
  path: string;
  contents: string;
}

/**
 * File system read binary file payload
 */
export interface FsReadBinaryFilePayload {
  path: string;
}

/**
 * File system write binary file payload
 */
export interface FsWriteBinaryFilePayload {
  path: string;
  contents: Uint8Array;
}

/**
 * File system exists payload
 */
export interface FsExistsPayload {
  path: string;
}

/**
 * File system mkdir payload
 */
export interface FsMkdirPayload {
  path: string;
  options?: MkdirOptions;
}

/**
 * File system remove payload
 */
export interface FsRemovePayload {
  path: string;
  options?: RemoveOptions;
}

/**
 * File system copy file payload
 */
export interface FsCopyFilePayload {
  from: string;
  to: string;
}

/**
 * File system rename payload
 */
export interface FsRenamePayload {
  from: string;
  to: string;
}

/**
 * File system read dir payload
 */
export interface FsReadDirPayload {
  path: string;
  options?: ReadDirOptions;
}

/**
 * Mkdir options
 */
export interface MkdirOptions {
  recursive?: boolean;
}

/**
 * Remove options
 */
export interface RemoveOptions {
  recursive?: boolean;
}

/**
 * Read directory options
 */
export interface ReadDirOptions {
  recursive?: boolean;
}

// ============================================================================
// App Types
// ============================================================================

/**
 * App quit payload
 */
export interface AppQuitPayload {
  reason?: string;
}

/**
 * App get version payload
 */
export interface AppGetVersionPayload {}

/**
 * App get name payload
 */
export interface AppGetNamePayload {}

/**
 * App get tauri version payload
 */
export interface AppGetTauriVersionPayload {}

/**
 * App show payload
 */
export interface AppShowPayload {}

/**
 * App hide payload
 */
export interface AppHidePayload {}

/**
 * App get metadata payload
 */
export interface AppGetMetadataPayload {}

// ============================================================================
// Clipboard Types
// ============================================================================

/**
 * Clipboard write text payload
 */
export interface ClipboardWriteTextPayload {
  text: string;
}

// ============================================================================
// Shell Types
// ============================================================================

/**
 * Shell open payload
 */
export interface ShellOpenPayload {
  path: string;
  options?: ShellOpenOptions;
}

/**
 * Shell open options
 */
export interface ShellOpenOptions {
  with?: string;
}
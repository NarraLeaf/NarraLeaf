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
  title?: string;
  width?: number;
  height?: number;
  x?: number;
  y?: number;
  center?: boolean;
  decorations?: boolean;
  alwaysOnTop?: boolean;
  skipTaskbar?: boolean;
  theme?: 'Light' | 'Dark';
  titleBarStyle?: 'Visible' | 'Transparent' | 'Overlay';
}

/**
 * Window maximize configuration
 */
export interface WindowMaximizePayload {
  label: string;
}

/**
 * Window minimize configuration
 */
export interface WindowMinimizePayload {
  label: string;
}

/**
 * Window close configuration
 */
export interface WindowClosePayload {
  label: string;
}

/**
 * Window show configuration
 */
export interface WindowShowPayload {
  label: string;
}

/**
 * Window hide configuration
 */
export interface WindowHidePayload {
  label: string;
}

/**
 * Window focus configuration
 */
export interface WindowFocusPayload {
  label: string;
}

/**
 * Window position configuration
 */
export interface WindowPositionPayload {
  label: string;
  x: number;
  y: number;
}

/**
 * Window size configuration
 */
export interface WindowSizePayload {
  label: string;
  width: number;
  height: number;
}

/**
 * Window title configuration
 */
export interface WindowTitlePayload {
  label: string;
  title: string;
}

/**
 * Window center configuration
 */
export interface WindowCenterPayload {
  label: string;
}

/**
 * Window decorations configuration
 */
export interface WindowDecorationsPayload {
  label: string;
  decorations: boolean;
}

// ============================================================================
// Dialog Types
// ============================================================================

/**
 * Open dialog options
 */
export interface OpenDialogOptions {
  defaultPath?: string;
  filters?: FileFilter[];
  multiple?: boolean;
  directory?: boolean;
  recursive?: boolean;
}

/**
 * Save dialog options
 */
export interface SaveDialogOptions {
  defaultPath?: string;
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
  type?: 'info' | 'warning' | 'error';
  title?: string;
  okLabel?: string;
}

/**
 * Confirm dialog options
 */
export interface ConfirmDialogOptions {
  type?: 'info' | 'warning' | 'error';
  title?: string;
  okLabel?: string;
  cancelLabel?: string;
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
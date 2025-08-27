/**
 * IPC Communication Types
 * 
 * TypeScript definitions matching the Rust communication.rs protocol
 */

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
  | PingMessage
  | PongMessage
  | VersionCheckMessage
  | VersionResponseMessage
  | ConnectedMessage;

/**
 * Request from TypeScript to Rust
 */
export interface RequestMessage {
  type: 'Request';
  id: string;
  request_type: string;
  payload: any;
}

/**
 * Response from Rust to TypeScript
 */
export interface ResponseMessage {
  type: 'Response';
  id: string;
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * Health check ping
 */
export interface PingMessage {
  type: 'Ping';
  timestamp: number;
}

/**
 * Health check pong
 */
export interface PongMessage {
  type: 'Pong';
  timestamp: number;
}

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
 * Connection established notification
 */
export interface ConnectedMessage {
  type: 'Connected';
  timestamp: number;
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

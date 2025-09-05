/*!
 * IPC Client Types
 *
 * Type definitions for IPC client functionality including events,
 * connection status, and message handling interfaces.
 */

import { SidecarMessage, ServiceRequestMessage, ServiceResponseMessage, RuntimeRequestMessage, RuntimeResponseMessage, VersionResponseMessage, ConnectionStatus } from '../types';

/**
 * Event types that can be emitted by the IPC client
 */
export interface IPCEvents {
    // Connection events
    connected: () => void;
    disconnected: () => void;
    connecting: () => void;
    reconnectFailed: () => void;
    reconnected: () => void;
    
    // Message events
    message: (message: SidecarMessage) => void;
    serviceRequest: (message: ServiceRequestMessage) => void;
    serviceResponse: (message: ServiceResponseMessage) => void;
    runtimeRequest: (message: RuntimeRequestMessage) => void;
    runtimeResponse: (message: RuntimeResponseMessage) => void;
    versionResponse: (message: any) => void;
    
    // Error events
    error: (error: Error) => void;
    ipcError: (error: Error) => void;
    clientError: (error: Error) => void;
    
    // State events
    stateChanged: (status: ConnectionStatus) => void;
}

/**
 * Connection configuration options
 */
export interface ConnectionConfig {
    socketName: string;
    autoReconnect: boolean;
    maxReconnectAttempts: number;
    reconnectDelay: number;
}

/**
 * Connection statistics
 */
export interface ConnectionStats {
    connected: boolean;
    reconnectAttempts: number;
    pendingRequests: number;
    registeredHandlers: number;
    socketPath: string;
}

/**
 * Pending request information
 */
export interface PendingRequest {
    resolve: Function;
    reject: Function;
    timeout: NodeJS.Timeout;
}

import { Logger } from '@/service/utils/logger';
import { EventEmitter } from 'events';
import * as net from 'net';
import * as os from 'os';
import * as path from 'path';
import { RuntimeRequestPayload, RuntimeRequestResult, RuntimeRequestTypes, ServiceRequestPayload, ServiceRequestTypes } from './protocol';
import {
    ConnectionStatus,
    MAX_MESSAGE_SIZE,
    MessageHandler,
    ServiceRequestMessage,
    ServiceResponseMessage,
    SidecarMessage,
    RuntimeRequestMessage,
    RuntimeResponseMessage,
    VersionResponseMessage
} from './types';
import { IPC_PROTOCOL_VERSION } from '../constants';

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
 * Cross-platform IPC communication class using Unix Domain Socket (Linux/macOS) 
 * or Named Pipe (Windows) for Tauri main process communication
 * 
 * Now implements the same protocol as Rust communication.rs with enhanced event handling
 */
export class MainServiceIPCClient extends EventEmitter {
    private client: net.Socket | null = null;
    private socketPath: string;
    private connected: boolean = false;
    private isConnecting: boolean = false;
    private reconnectInterval: NodeJS.Timeout | null = null;
    private reconnectAttempts: number = 0;
    private maxReconnectAttempts: number = 3;
    private reconnectDelay: number = 500;
    private messageHandlers: Map<string, MessageHandler> = new Map();
    private messageBuffer: Buffer = Buffer.alloc(0);
    private messageIdCounter: number = 0;
    private pendingRequests: Map<string, { resolve: Function; reject: Function; timeout: NodeJS.Timeout }> = new Map();
    private eventListeners: Map<string, Set<Function>> = new Map();
    private autoReconnect: boolean = true;

    constructor(socketName: string, private logger: Logger) {
        super();
        this.socketPath = this.getSocketPath(socketName);
        this.setupEventHandlers();
        this.setupDefaultHandlers();
        this.setupProcessExitHandlers();
    }

    /**
     * Register a custom message handler for specific request types
     */
    public registerHandler<T extends ServiceRequestTypes = any>(requestType: T, handler: MessageHandler): void {
        if (this.messageHandlers.has(requestType)) {
            this.logger.warn(`Handler for ${requestType} already registered`);
        }

        this.messageHandlers.set(requestType, handler);
        this.logger.debug(`Registered handler for: ${requestType}`);
    }

    /**
     * Unregister a message handler
     */
    public unregisterHandler(requestType: ServiceRequestTypes): boolean {
        const removed = this.messageHandlers.delete(requestType);
        if (removed) {
            this.logger.debug(`Unregistered handler for: ${requestType}`);
        }
        return removed;
    }

    /**
     * Add event listener with type safety
     */
    public addEventListener<K extends keyof IPCEvents>(event: K, listener: IPCEvents[K]): void {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, new Set());
        }
        this.eventListeners.get(event)!.add(listener);
        this.on(event, listener);
    }

    /**
     * Remove event listener
     */
    public removeEventListener<K extends keyof IPCEvents>(event: K, listener: IPCEvents[K]): void {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            listeners.delete(listener);
            this.off(event, listener);
        }
    }

    public onMessage<T extends ServiceRequestTypes = any>(requestType: T, callback: (payload: ServiceRequestPayload[T]) => void): VoidFunction {
        const handler = (message: ServiceRequestMessage) => {
            if (message.request_type === requestType) {
                callback(message.payload);
            }
        };
        
        this.addEventListener('serviceRequest', handler);

        return () => {
            this.removeEventListener('serviceRequest', handler);
        };
    }

    /**
     * Set auto-reconnect behavior
     */
    public setAutoReconnect(enabled: boolean): void {
        this.autoReconnect = enabled;
        if (!enabled && this.reconnectInterval) {
            clearTimeout(this.reconnectInterval);
            this.reconnectInterval = null;
        }
    }

    /**
     * Connect to the IPC server
     */
    public async connect(): Promise<void> {
        // If already connected, simply return
        if (this.connected) {
            this.logger.warn('Already connected, skip connect');
            return;
        }

        // If a connection attempt is in progress, avoid re-entrant connects
        if (this.isConnecting) {
            this.logger.info('Connection attempt already in progress, skip duplicate connect');
            return;
        }

        // If there is a stale client socket, clean it before reconnecting
        if (this.client) {
            this.logger.warn('Stale client socket found, cleaning up before connect');
            try { this.client.removeAllListeners(); } catch {}
            try { this.client.destroy(); } catch {}
            this.client = null;
        }

        this.isConnecting = true;
        this.emit('connecting');
        this.emit('stateChanged', ConnectionStatus.Connecting);

        return new Promise((resolve, reject) => {
            try {
                if (os.platform() === 'win32') {
                    // Windows: Connect to named pipe
                    this.connectToNamedPipe(() => {
                        this.isConnecting = false;
                        resolve();
                    }, (error) => {
                        this.isConnecting = false;
                        reject(error);
                    });
                } else {
                    // Unix-like: Connect to Unix domain socket
                    this.connectToUnixSocket(() => {
                        this.isConnecting = false;
                        resolve();
                    }, (error) => {
                        this.isConnecting = false;
                        reject(error);
                    });
                }
            } catch (error) {
                this.isConnecting = false;
                reject(error as Error);
            }
        });
    }

    /**
     * Send message to the connected peer with length prefix (matching Rust protocol)
     */
    public send(message: SidecarMessage): boolean {
        if (!this.connected || !this.client) {
            this.logger.error('Not connected to server');
            return false;
        }

        try {
            const jsonString = JSON.stringify(message);
            const messageBuffer = Buffer.from(jsonString, 'utf8');
            const lengthHex = messageBuffer.length.toString(16).padStart(8, '0');
            const lengthBuffer = Buffer.from(lengthHex, 'utf8');
            
            // Send: [8-byte hex length][message data]
            this.client.write(lengthBuffer);
            this.client.write(messageBuffer);
            
            this.logger.debug(`Sent message: ${message.type} (${messageBuffer.length} bytes)`);
            return true;
        } catch (error) {
            this.logger.error('Failed to send message:' + (error as Error).message);
            return false;
        }
    }

    /**
     * Send a runtime request message and wait for response (tauri: operations)
     */
    public async sendRuntimeRequest<T extends RuntimeRequestTypes = any>(
        ...args: [
            T,
            ...RuntimeRequestPayload[T] extends null ? [] : [RuntimeRequestPayload[T]]
        ]
    ): Promise<RuntimeResponseMessage<RuntimeRequestResult[T]>> {
        const requestType = args[0];
        const payload = (args.length > 1 ? args[1] : null) as any;

        return new Promise((resolve, reject) => {
            const requestId = (++this.messageIdCounter).toString();
            const responseChannel = `response_${requestId}`;
            const request: RuntimeRequestMessage = {
                type: 'RuntimeRequest',
                id: requestId,
                request_type: requestType,
                payload: payload ?? null,
                response_channel: responseChannel
            };

            // Set up timeout
            const timeout = setTimeout(() => {
                this.pendingRequests.delete(requestId);
                reject(new Error(`Runtime request timeout for ${requestType}`));
            }, 10000); // 10 second timeout

            // Store pending request
            this.pendingRequests.set(requestId, { resolve, reject, timeout });

            // Send runtime request
            if (!this.send(request)) {
                this.pendingRequests.delete(requestId);
                clearTimeout(timeout);
                reject(new Error('Failed to send runtime request'));
                return;
            }

            this.logger.debug(`Sent runtime request: ${requestType} (ID: ${requestId})`);
        });
    }



    /**
     * Send ping message
     */
    public ping(): Promise<RuntimeResponseMessage<RuntimeRequestResult["tauri:ping"]>> {
        return this.sendRuntimeRequest("tauri:ping");
    }

    /**
     * Close the connection and cleanup
     */
    public async close(): Promise<void> {
        this.setAutoReconnect(false);
        
        if (this.reconnectInterval) {
            clearTimeout(this.reconnectInterval);
            this.reconnectInterval = null;
        }

        // Clear pending requests
        this.pendingRequests.forEach(({ reject, timeout }) => {
            clearTimeout(timeout);
            reject(new Error('Connection closed'));
        });
        this.pendingRequests.clear();

        if (this.client) {
            this.client.destroy();
            this.client = null;
        }

        this.connected = false;
        this.messageBuffer = Buffer.alloc(0);
        this.emit('stateChanged', ConnectionStatus.Disconnected);
    }

    /**
     * Check if currently connected
     */
    public getConnected(): boolean {
        return this.connected;
    }

    /**
     * Get current connection status
     */
    public getConnectionStatus(): ConnectionStatus {
        if (this.connected) {
            return ConnectionStatus.Connected;
        } else if (this.reconnectInterval) {
            return ConnectionStatus.Connecting;
        } else {
            return ConnectionStatus.Disconnected;
        }
    }

    /**
     * Set reconnection options
     */
    public setReconnectOptions(maxAttempts: number, delay: number): void {
        this.maxReconnectAttempts = maxAttempts;
        this.reconnectDelay = delay;
    }

    /**
     * Get statistics about the connection
     */
    public getStats() {
        return {
            connected: this.connected,
            reconnectAttempts: this.reconnectAttempts,
            pendingRequests: this.pendingRequests.size,
            registeredHandlers: this.messageHandlers.size,
            socketPath: this.socketPath
        };
    }

    /**
     * Connect to Windows named pipe
     */
    private connectToNamedPipe(resolve: () => void, reject: (error: Error) => void): void {
        if (!net) {
            reject(new Error('Net module not available'));
            return;
        }

        this.client = net.connect(this.socketPath, () => {
            this.logger.info(`Connected to named pipe: ${this.socketPath}`);
            this.connected = true;
            this.reconnectAttempts = 0;
            this.emit('connected');
            this.emit('stateChanged', ConnectionStatus.Connected);
            
            resolve();
        });

        this.setupClientHandlers(reject);
    }

    /**
     * Get platform-specific socket path
     */
    private getSocketPath(socketName: string): string {
        const platform = os.platform();

        if (platform === 'win32') {
            // Windows: Use named pipe
            return `\\\\.\\pipe\\${socketName}`;
        } else {
            // Unix-like systems: Use Unix domain socket
            const tmpDir = os.tmpdir();
            return path.join(tmpDir, `${socketName}.sock`);
        }
    }

    /**
     * Setup event handlers
     */
    private setupEventHandlers(): void {
        this.on('error', (error) => {
            this.logger.error('IPC Error:' + (error as Error).message);
            this.emit('ipcError', error);
        });

        this.on('close', () => {
            this.connected = false;
            this.emit('disconnected');
            this.emit('stateChanged', ConnectionStatus.Disconnected);
            if (this.autoReconnect) {
                this.attemptReconnect();
            }
        });
    }

    /**
     * Setup default message handlers
     */
    private setupDefaultHandlers(): void {
        // Register default handlers for common request types
        this.registerHandler("sidecar:ping", {
            handleMessage: async (message) => {
                return {
                    type: 'ServiceResponse',
                    id: (message as ServiceRequestMessage).id,
                    success: true,
                    data: Date.now()
                } as ServiceResponseMessage;
            }
        });
    }

    /**
     * Setup process exit handlers to ensure clean shutdown
     */
    private setupProcessExitHandlers(): void {
        // Handle process exit signals
        const cleanup = () => {
            this.logger.info('[App] Process exit signal received, cleaning up IPC connection...');
            this.setAutoReconnect(false);
            
            // Force immediate cleanup
            this.close().catch(err => {
                this.logger.error('[App] Error during cleanup: ' + (err as Error).message);
            }).finally(() => {
                // Ensure process exits after cleanup
                setTimeout(() => {
                    this.logger.info('[App] Forcing process exit after cleanup');
                    process.exit(0);
                }, 100);
            });
        };

        // Handle SIGTERM, SIGINT (Ctrl+C), and other exit signals
        process.on('SIGTERM', cleanup);
        process.on('SIGINT', cleanup);
        process.on('exit', () => cleanup());
        
        // Handle uncaught exceptions
        process.on('uncaughtException', (err: Error) => {
            this.logger.error('[App] Uncaught exception: ' + err.message);
            cleanup();
            process.exit(1);
        });
        
        process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
            this.logger.error('[App] Unhandled rejection at: ' + promise + ' reason: ' + reason);
            cleanup();
            process.exit(1);
        });
    }

    /**
     * Connect to Unix domain socket
     */
    private connectToUnixSocket(resolve: () => void, reject: (error: Error) => void): void {
        if (!net) {
            reject(new Error('Net module not available'));
            return;
        }

        this.client = net.connect(this.socketPath, () => {
            this.logger.info(`Connected to Unix socket: ${this.socketPath}`);
            this.connected = true;
            this.reconnectAttempts = 0;
            this.emit('connected');
            this.emit('stateChanged', ConnectionStatus.Connected);
            
            resolve();
        });

        this.setupClientHandlers(reject);
    }

    /**
     * Setup client event handlers with message parsing (matching Rust protocol)
     */
    private setupClientHandlers(reject: (error: Error) => void): void {
        if (!this.client) {
            reject(new Error('Client not connected'));
            return;
        }

        this.client.on('data', (data: Buffer) => {
            // Add incoming data to buffer
            this.messageBuffer = Buffer.concat([this.messageBuffer, data]);
            
            // Process complete messages
            this.processMessageBuffer();
        });

        this.client.on('close', () => {
            // Ensure state reset on close
            this.connected = false;
            this.isConnecting = false;
            this.client = null;
            this.emit('disconnected');
            this.emit('stateChanged', ConnectionStatus.Disconnected);
            if (this.autoReconnect) {
                this.attemptReconnect();
            }
        });

        this.client.on('error', (error: Error) => {
            // Reset state on error so subsequent connect attempts are allowed
            this.logger.error('Client error:' + (error as Error).message);
            this.connected = false;
            this.isConnecting = false;
            try { this.client?.removeAllListeners(); } catch {}
            try { this.client?.destroy(); } catch {}
            this.client = null;
            this.emit('clientError', error);
            reject(error);
        });
    }

    /**
     * Process message buffer with length prefix protocol (matching Rust)
     */
    private processMessageBuffer(): void {
        while (this.messageBuffer.length >= 8) {
            // Read message length (8 hex chars)
            const lengthStr = this.messageBuffer.toString('utf8', 0, 8);
            const messageLength = parseInt(lengthStr, 16);
            
            if (isNaN(messageLength) || messageLength > MAX_MESSAGE_SIZE) {
                this.logger.error('Invalid message length:' + lengthStr);
                this.messageBuffer = Buffer.alloc(0);
                return;
            }

            const totalLength = 8 + messageLength;
            if (this.messageBuffer.length < totalLength) {
                break; // Incomplete message
            }

            // Extract and parse message
            const messageData = this.messageBuffer.slice(8, totalLength);
            try {
                const message = JSON.parse(messageData.toString('utf8')) as SidecarMessage;
                this.handleIncomingMessage(message);
            } catch (error) {
                this.logger.error('Failed to parse message:' + (error as Error).message);
            }

            // Remove processed message
            this.messageBuffer = this.messageBuffer.slice(totalLength);
        }
    }

    /**
     * Handle incoming message with enhanced routing
     */
    private async handleIncomingMessage(message: SidecarMessage): Promise<void> {
        this.logger.debug(`Received message: ${message.type}`);
        
        // Emit general message event
        this.emit('message', message);

        // Handle specific message types
        switch (message.type) {
            case 'ServiceRequest':
                this.emit('serviceRequest', message);
                await this.handleServiceRequest(message as ServiceRequestMessage);
                break;
            case 'RuntimeResponse':
                this.emit('runtimeResponse', message);
                await this.handleRuntimeResponse(message as RuntimeResponseMessage);
                break;
            case 'VersionResponse':
                this.emit('versionResponse', message);
                break;
            case 'VersionCheck':
                await this.handleVersionCheck(message);
                break;
            default:
                this.logger.error('Unhandled message type:' + (message as any).type);
        }
    }

    /**
     * Handle incoming service request messages (from Rust to Sidecar)
     */
    private async handleServiceRequest(request: ServiceRequestMessage): Promise<void> {
        const handler = this.messageHandlers.get(request.request_type);
        if (handler) {
            try {
                const response = await handler.handleMessage(request);
                if (response) {
                    this.send(response);
                }
            } catch (error) {
                this.logger.error(`Handler error for ${request.request_type}:` + (error as Error).message);
                // Send error response
                const errorResponse: ServiceResponseMessage<never> = {
                    type: 'ServiceResponse',
                    id: request.id,
                    success: false as false,
                    error: (error as Error).message
                };
                this.send(errorResponse);
            }
        } else {
            const errorResponse: ServiceResponseMessage<never> = {
                type: 'ServiceResponse',
                id: request.id,
                success: false as false,
                error: `No handler registered for service request type: ${request.request_type}`
            };
            this.send(errorResponse);

            this.logger.error(`No handler registered for service request type: ${request.request_type}`);
        }
    }

    /**
     * Handle incoming runtime response messages (from Rust to Sidecar)
     */
    private async handleRuntimeResponse(response: RuntimeResponseMessage): Promise<void> {
        const pending = this.pendingRequests.get(response.id);
        if (pending) {
            clearTimeout(pending.timeout);
            this.pendingRequests.delete(response.id);
            
            if (response.success) {
                pending.resolve(response);
            } else {
                const errorMessage = 'error' in response ? response.error : 'Runtime request failed';
                pending.reject(new Error(errorMessage));
            }
        }
    }

    /**
     * Handle version check messages
     */
    private async handleVersionCheck(message: any): Promise<void> {
        const versionResponse: VersionResponseMessage = {
            type: 'VersionResponse',
            version: IPC_PROTOCOL_VERSION,
            compatible: message.version === IPC_PROTOCOL_VERSION
        };
        this.send(versionResponse);
    }

    /**
     * Attempt to reconnect after disconnection
     */
    private attemptReconnect(): void {
        if (!this.autoReconnect) {
            return;
        }

        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            this.logger.warn('Max reconnection attempts reached');
            this.emit('reconnectFailed');
            this.emit('stateChanged', ConnectionStatus.Failed);
            return;
        }

        if (this.reconnectInterval) {
            clearTimeout(this.reconnectInterval);
        }

        this.reconnectInterval = setTimeout(async () => {
            this.reconnectAttempts++;
            this.logger.info(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
            this.emit('stateChanged', ConnectionStatus.Connecting);

            try {
                await this.connect();
                this.logger.info('Reconnected successfully');
                this.emit('reconnected');
                this.emit('stateChanged', ConnectionStatus.Connected);
            } catch (error) {
                this.logger.error('Reconnection failed:' + (error as Error).message);
                this.attemptReconnect();
            }
        }, this.reconnectDelay * this.reconnectAttempts);
    }
}

/**
 * Utility class for creating IPC instances
 */
export class IPCManager {
    private static instances = new Map<string, MainServiceIPCClient>();

    /**
     * Create or get an IPC client instance
     */
    static createClient(socketName: string, logger: Logger): MainServiceIPCClient {
        const key = `client:${socketName}`;
        if (!this.instances.has(key)) {
            const instance = new MainServiceIPCClient(socketName, logger);
            this.instances.set(key, instance);
        }
        return this.instances.get(key)!;
    }

    /**
     * Close all IPC instances
     */
    static async closeAll(): Promise<void> {
        const closePromises = Array.from(this.instances.values()).map(instance => instance.close());
        await Promise.all(closePromises);
        this.instances.clear();
    }
}

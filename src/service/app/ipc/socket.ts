import { Logger } from '@/service/utils/logger';
import { EventEmitter } from 'events';
import * as net from 'net';
import * as os from 'os';
import * as path from 'path';
import { RuntimeRequestPayload, RuntimeRequestResult, RuntimeRequestTypes } from './protocol';
import {
    ConnectionStatus,
    MAX_MESSAGE_SIZE,
    MessageHandler,
    RequestMessage,
    ResponseMessage,
    SidecarMessage,
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
    request: (message: RequestMessage) => void;
    response: (message: ResponseMessage) => void;
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
    private reconnectInterval: NodeJS.Timeout | null = null;
    private reconnectAttempts: number = 0;
    private maxReconnectAttempts: number = 5;
    private reconnectDelay: number = 1000;
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
    }

    /**
     * Register a custom message handler for specific request types
     */
    public registerHandler(requestType: string, handler: MessageHandler): void {
        if (this.messageHandlers.has(requestType)) {
            this.logger.warn(`Handler for ${requestType} already registered`);
        }

        this.messageHandlers.set(requestType, handler);
        this.logger.debug(`Registered handler for: ${requestType}`);
    }

    /**
     * Unregister a message handler
     */
    public unregisterHandler(requestType: string): boolean {
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
        if (this.client) {
            throw new Error('Already connected');
        }

        this.emit('connecting');
        this.emit('stateChanged', ConnectionStatus.Connecting);

        return new Promise((resolve, reject) => {
            try {
                if (os.platform() === 'win32') {
                    // Windows: Connect to named pipe
                    this.connectToNamedPipe(resolve, reject);
                } else {
                    // Unix-like: Connect to Unix domain socket
                    this.connectToUnixSocket(resolve, reject);
                }
            } catch (error) {
                reject(error);
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
     * Send a request message and wait for response
     */
    public async sendRequest<T extends RuntimeRequestTypes = any>(
        // requestType: T,
        // payload: RuntimeRequestPayload[T]
        ...args: [
            T,
            ...RuntimeRequestPayload[T] extends null ? [] : [RuntimeRequestPayload[T]]
        ]
    ): Promise<ResponseMessage<RuntimeRequestResult[T]>> {
        const requestType = args[0];
        const payload = args[1];

        return new Promise((resolve, reject) => {
            const requestId = (++this.messageIdCounter).toString();
            const request: RequestMessage = {
                type: 'Request',
                id: requestId,
                request_type: requestType,
                payload
            };

            // Set up timeout
            const timeout = setTimeout(() => {
                this.pendingRequests.delete(requestId);
                reject(new Error(`Request timeout for ${requestType}`));
            }, 10000); // 10 second timeout

            // Store pending request
            this.pendingRequests.set(requestId, { resolve, reject, timeout });

            // Send request
            if (!this.send(request)) {
                this.pendingRequests.delete(requestId);
                clearTimeout(timeout);
                reject(new Error('Failed to send request'));
                return;
            }

            this.logger.debug(`Sent request: ${requestType} (ID: ${requestId})`);
        });
    }

    /**
     * Send ping message
     */
    public ping(): Promise<ResponseMessage<RuntimeRequestResult["tauri:ping"]>> {
        return this.sendRequest("tauri:ping");
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
        this.registerHandler('tauri:ping', {
            handleMessage: async (message) => {
                return {
                    type: 'Response',
                    id: (message as RequestMessage).id,
                    success: true,
                    data: Date.now()
                } as ResponseMessage;
            }
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
            this.connected = false;
            this.emit('disconnected');
            this.emit('stateChanged', ConnectionStatus.Disconnected);
            if (this.autoReconnect) {
                this.attemptReconnect();
            }
        });

        this.client.on('error', (error: Error) => {
            this.logger.error('Client error:' + (error as Error).message);
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
            case 'Request':
                this.emit('request', message);
                await this.handleRequest(message as RequestMessage);
                break;
            case 'Response':
                this.emit('response', message);
                await this.handleResponse(message as ResponseMessage);
                break;
            case 'VersionResponse':
                this.emit('versionResponse', message);
                break;
            case 'VersionCheck':
                await this.handleVersionCheck(message);
                break;
            default:
                this.logger.debug('Unhandled message type:' + (message as any).type);
        }
    }

    /**
     * Handle incoming request messages
     */
    private async handleRequest(request: RequestMessage): Promise<void> {
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
                const errorResponse: ResponseMessage<never> = {
                    type: 'Response',
                    id: request.id,
                    success: false as false,
                    error: (error as Error).message
                };
                this.send(errorResponse);
            }
        } else {
            this.logger.debug(`No handler registered for request type: ${request.request_type}`);
        }
    }

    /**
     * Handle incoming response messages
     */
    private async handleResponse(response: ResponseMessage): Promise<void> {
        const pending = this.pendingRequests.get(response.id);
        if (pending) {
            clearTimeout(pending.timeout);
            this.pendingRequests.delete(response.id);
            
            if (response.success) {
                pending.resolve(response);
            } else {
                const errorMessage = 'error' in response ? response.error : 'Request failed';
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
            version: message.version,
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

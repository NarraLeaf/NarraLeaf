import { Logger } from '@/main_legacy/utils/logger';
import { EventEmitter } from 'events';
import net from 'net';
import * as os from 'os';
import * as path from 'path';
import { RuntimeRequestPayload, RuntimeRequestTypes } from './protocol';
import {
    ConnectionStatus,
    MAX_MESSAGE_SIZE,
    MessageHandler,
    RequestMessage,
    ResponseMessage,
    SidecarRequestMessage,
    SidecarResponseMessage,
    SidecarMessage
} from './types';

/**
 * Cross-platform IPC communication class using Unix Domain Socket (Linux/macOS) 
 * or Named Pipe (Windows) for Tauri main process communication
 * 
 * Now implements the same protocol as Rust communication.rs
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

    constructor(socketName: string, private logger: Logger) {
        super();
        this.socketPath = this.getSocketPath(socketName);
        this.setupEventHandlers();
    }

    /**
     * Register a custom message handler
     */
    public registerHandler(requestType: string, handler: MessageHandler): void {
        this.messageHandlers.set(requestType, handler);
    }

    /**
     * Connect to the IPC server
     */
    public async connect(): Promise<void> {
        if (this.client) {
            throw new Error('Already connected');
        }

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
    public async sendRequest<T extends RuntimeRequestTypes = any>(requestType: T, ...payload: RuntimeRequestPayload[T]): Promise<ResponseMessage<T>> {
        return new Promise((resolve, reject) => {
            const requestId = (++this.messageIdCounter).toString();
            const request: RequestMessage = {
                type: 'Request',
                id: requestId,
                request_type: requestType,
                payload
            };

            // Set up one-time response handler
            const responseHandler = (message: SidecarMessage) => {
                if (message.type === 'Response' && message.id === requestId) {
                    this.removeListener('message', responseHandler);
                    resolve(message as ResponseMessage);
                }
            };

            this.on('message', responseHandler);

            // Send request
            if (!this.send(request)) {
                this.removeListener('message', responseHandler);
                reject(new Error('Failed to send request'));
                return;
            }

            // Set timeout for response
            setTimeout(() => {
                this.removeListener('message', responseHandler);
                reject(new Error('Request timeout'));
            }, 10000); // 10 second timeout
        });
    }

    /**
     * Send ping message
     */
    public ping(): Promise<ResponseMessage> {
        return this.sendRequest("tauri:ping")
    }

    /**
     * Close the connection and cleanup
     */
    public async close(): Promise<void> {
        if (this.reconnectInterval) {
            clearTimeout(this.reconnectInterval);
            this.reconnectInterval = null;
        }

        if (this.client) {
            this.client.destroy();
            this.client = null;
        }

        this.connected = false;
        this.messageBuffer = Buffer.alloc(0);
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
            this.attemptReconnect();
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
            this.attemptReconnect();
        });

        this.client.on('error', (error: Error) => {
            this.logger.error('Client error:' + (error as Error).message);
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
     * Handle incoming message
     */
    private async handleIncomingMessage(message: SidecarMessage): Promise<void> {
        this.logger.debug(`Received message: ${message.type}`);
        
        // Emit message event for external handlers
        this.emit('message', message);

        // Handle specific message types
        switch (message.type) {
            case 'VersionResponse':
                this.emit('versionResponse', message);
                break;
            case 'Response':
                this.emit('response', message);
                break;
            default:
                this.logger.debug('Unhandled message type:' + message.type);
        }
    }

    /**
     * Attempt to reconnect after disconnection
     */
    private attemptReconnect(): void {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            this.logger.warn('Max reconnection attempts reached');
            this.emit('reconnectFailed');
            return;
        }

        if (this.reconnectInterval) {
            clearTimeout(this.reconnectInterval);
        }

        this.reconnectInterval = setTimeout(async () => {
            this.reconnectAttempts++;
            this.logger.info(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

            try {
                await this.connect();
                this.logger.info('Reconnected successfully');
                this.emit('reconnected');
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

export default MainServiceIPCClient;

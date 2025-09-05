/*!
 * Main Service IPC Client
 *
 * Main IPC client class that coordinates connection management,
 * message handling, and reconnection logic.
 */

import { EventEmitter } from 'events';
import { Logger } from '@/service/utils/logger';
import { RuntimeRequestPayload, RuntimeRequestResult, RuntimeRequestTypes, ServiceRequestPayload, ServiceRequestTypes } from '../protocol';
import { SidecarMessage, ServiceRequestMessage, ServiceResponseMessage, RuntimeRequestMessage, RuntimeResponseMessage, VersionResponseMessage, ConnectionStatus } from '../types';
import { ConnectionManager } from './connection';
import { MessageHandlerManager } from './messageHandler';
import { ReconnectionManager } from './reconnection';
import { IPCEvents, ConnectionConfig, ConnectionStats } from './types';

/**
 * Cross-platform IPC communication class using Unix Domain Socket (Linux/macOS) 
 * or Named Pipe (Windows) for Tauri main process communication
 * 
 * Now implements the same protocol as Rust communication.rs with enhanced event handling
 */
export class MainServiceIPCClient extends EventEmitter {
    private connectionManager: ConnectionManager;
    private messageHandler: MessageHandlerManager;
    private reconnectionManager: ReconnectionManager;
    private messageIdCounter: number = 0;
    private config: ConnectionConfig;

    constructor(socketName: string, private logger: Logger) {
        super();
        
        this.config = {
            socketName,
            autoReconnect: true,
            maxReconnectAttempts: 3,
            reconnectDelay: 500,
        };

        this.connectionManager = new ConnectionManager(socketName, logger);
        this.messageHandler = new MessageHandlerManager(logger, this);
        this.reconnectionManager = new ReconnectionManager(
            logger,
            () => this.connect(),
            (status) => this.emit('stateChanged', status)
        );

        this.setupEventHandlers();
        this.setupProcessExitHandlers();
    }

    /**
     * Register a custom message handler for specific request types
     */
    public registerHandler<T extends ServiceRequestTypes = any>(requestType: T, handler: any): void {
        this.messageHandler.registerHandler(requestType, handler);
    }

    /**
     * Unregister a message handler
     */
    public unregisterHandler(requestType: ServiceRequestTypes): boolean {
        return this.messageHandler.unregisterHandler(requestType);
    }

    /**
     * Add event listener with type safety
     */
    public addEventListener<K extends keyof IPCEvents>(event: K, listener: IPCEvents[K]): void {
        this.messageHandler.addEventListener(event, listener);
    }

    /**
     * Remove event listener
     */
    public removeEventListener<K extends keyof IPCEvents>(event: K, listener: IPCEvents[K]): void {
        this.messageHandler.removeEventListener(event, listener);
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
        this.config.autoReconnect = enabled;
        this.reconnectionManager.setAutoReconnect(enabled);
    }

    /**
     * Connect to the IPC server
     */
    public async connect(): Promise<void> {
        this.emit('connecting');
        this.emit('stateChanged', ConnectionStatus.Connecting);

        try {
            await this.connectionManager.connect();

            const clientSocket = this.connectionManager.getClient();
            if (clientSocket && !(clientSocket as any).__nl_socket_patched) {
                clientSocket.on('data', (data: Buffer) => {
                    // Emit as high-level event for the message handler to parse
                    this.emit('data', data);
                });

                clientSocket.on('close', () => {
                    // Map low-level socket close to the higher-level close event
                    this.emit('close');
                });

                // Mark as patched to avoid duplicate listeners on reconnects
                (clientSocket as any).__nl_socket_patched = true;
            }
            this.reconnectionManager.resetReconnectAttempts();
            this.emit('connected');
            this.emit('stateChanged', ConnectionStatus.Connected);
        } catch (error) {
            this.emit('error', error);
            this.emit('ipcError', error);
            throw error;
        }
    }

    /**
     * Send message to the connected peer with length prefix
     */
    public send(message: SidecarMessage): boolean {
        if (!this.connectionManager.getConnected() || !this.connectionManager.getClient()) {
            this.logger.error('Not connected to server');
            return false;
        }

        try {
            const jsonString = JSON.stringify(message);
            const messageBuffer = Buffer.from(jsonString, 'utf8');
            const lengthHex = messageBuffer.length.toString(16).padStart(8, '0');
            const lengthBuffer = Buffer.from(lengthHex, 'utf8');
            
            // Send: [8-byte hex length][message data]
            this.connectionManager.getClient()!.write(lengthBuffer);
            this.connectionManager.getClient()!.write(messageBuffer);
            
            this.logger.debug(`Sent message: ${message.type} (${messageBuffer.length} bytes)`);
            return true;
        } catch (error) {
            this.logger.error('Failed to send message:' + (error as Error).message);
            return false;
        }
    }

    /**
     * Send a runtime request message and wait for response
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
                this.messageHandler.removePendingRequest(requestId);
                reject(new Error(`Runtime request timeout for ${requestType}`));
            }, 10000); // 10 second timeout

            // Store pending request
            this.messageHandler.addPendingRequest(requestId, { resolve, reject, timeout });

            // Send runtime request
            if (!this.send(request)) {
                this.messageHandler.removePendingRequest(requestId);
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
        this.reconnectionManager.stopReconnection();
        
        // Clear pending requests
        this.messageHandler.clearPendingRequests();

        await this.connectionManager.close();
        this.emit('stateChanged', ConnectionStatus.Disconnected);
    }

    /**
     * Check if currently connected
     */
    public getConnected(): boolean {
        return this.connectionManager.getConnected();
    }

    /**
     * Get current connection status
     */
    public getConnectionStatus(): ConnectionStatus {
        return this.connectionManager.getConnectionStatus();
    }

    /**
     * Set reconnection options
     */
    public setReconnectOptions(maxAttempts: number, delay: number): void {
        this.config.maxReconnectAttempts = maxAttempts;
        this.config.reconnectDelay = delay;
        this.reconnectionManager.setReconnectOptions(maxAttempts, delay);
    }

    /**
     * Get statistics about the connection
     */
    public getStats(): ConnectionStats {
        return {
            connected: this.connectionManager.getConnected(),
            reconnectAttempts: this.reconnectionManager.getReconnectAttempts(),
            pendingRequests: this.messageHandler.getPendingRequestCount(),
            registeredHandlers: this.messageHandler.getRegisteredHandlerCount(),
            socketPath: this.connectionManager.getSocketPathString()
        };
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
            this.emit('disconnected');
            this.emit('stateChanged', ConnectionStatus.Disconnected);
            if (this.config.autoReconnect) {
                this.reconnectionManager.startReconnection();
            }
        });

        this.on('data', (data: Buffer) => {
            this.messageHandler.processData(data);
        });

        this.on('sendMessage', (message: SidecarMessage) => {
            this.send(message);
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
}

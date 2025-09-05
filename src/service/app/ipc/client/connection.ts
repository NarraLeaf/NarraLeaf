/*!
 * Connection Management
 *
 * Handles platform-specific connection logic for Unix domain sockets
 * and Windows named pipes.
 */

import * as net from 'net';
import * as os from 'os';
import * as path from 'path';
import { Logger } from '@/service/utils/logger';
import { ConnectionStatus } from '../types';

/**
 * Connection Manager
 *
 * Manages platform-specific connection logic
 */
export class ConnectionManager {
    private client: net.Socket | null = null;
    private socketPath: string;
    private connected: boolean = false;
    private isConnecting: boolean = false;
    private logger: Logger;

    constructor(socketName: string, logger: Logger) {
        this.logger = logger;
        this.socketPath = this.getSocketPath(socketName);
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
            resolve();
        });

        this.setupClientHandlers(reject);
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
            resolve();
        });

        this.setupClientHandlers(reject);
    }

    /**
     * Setup client event handlers
     */
    private setupClientHandlers(reject: (error: Error) => void): void {
        if (!this.client) {
            reject(new Error('Client not connected'));
            return;
        }

        this.client.on('close', () => {
            this.connected = false;
            this.isConnecting = false;
            this.client = null;
        });

        this.client.on('error', (error: Error) => {
            this.logger.error('Client error:' + (error as Error).message);
            this.connected = false;
            this.isConnecting = false;
            try { this.client?.removeAllListeners(); } catch {}
            try { this.client?.destroy(); } catch {}
            this.client = null;
            reject(error);
        });
    }

    /**
     * Close the connection
     */
    public async close(): Promise<void> {
        if (this.client) {
            this.client.destroy();
            this.client = null;
        }

        this.connected = false;
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
        } else if (this.isConnecting) {
            return ConnectionStatus.Connecting;
        } else {
            return ConnectionStatus.Disconnected;
        }
    }

    /**
     * Get the client socket
     */
    public getClient(): net.Socket | null {
        return this.client;
    }

    /**
     * Get the socket path
     */
    public getSocketPathString(): string {
        return this.socketPath;
    }
}

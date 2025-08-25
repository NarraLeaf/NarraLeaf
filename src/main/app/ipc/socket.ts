import { EventEmitter } from 'events';
import * as path from 'path';
import * as os from 'os';
import net from 'net';
import { Logger } from '@/cli/logger';

/**
 * Cross-platform IPC communication class using Unix Domain Socket (Linux/macOS) 
 * or Named Pipe (Windows) for Tauri main process communication
 */
export class MainServiceIPCClient extends EventEmitter {
    private client: net.Socket | null = null;
    private socketPath: string;
    private connected: boolean = false;
    private reconnectInterval: NodeJS.Timeout | null = null;
    private reconnectAttempts: number = 0;
    private maxReconnectAttempts: number = 5;
    private reconnectDelay: number = 1000;

    constructor(socketName: string, private logger: Logger) {
        super();
        this.socketPath = this.getSocketPath(socketName);
        this.setupEventHandlers();
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
     * Send message to the connected peer
     */
    public send(message: any): boolean {
        if (!this.connected || !this.client) {
            this.logger.error('Not connected to server');
            return false;
        }

        try {
            const data = JSON.stringify(message);
            this.client.write(data);
            return true;
        } catch (error) {
            this.logger.error('Failed to send message:', error as Error);
            return false;
        }
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
    }

    /**
     * Check if currently connected
     */
    public getConnected(): boolean {
        return this.connected;
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
            this.logger.error('IPC Error:', error);
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
     * Setup client event handlers
     */
    private setupClientHandlers(reject: (error: Error) => void): void {
        if (!this.client) {
            reject(new Error('Client not connected'));
            return;
        }

        this.client.on('data', (data: Buffer) => {
            try {
                const message = JSON.parse(data.toString());
                this.emit('message', message);
            } catch (error) {
                this.logger.error('Failed to parse message:', error as Error);
            }
        });

        this.client.on('close', () => {
            this.connected = false;
            this.emit('disconnected');
            this.attemptReconnect();
        });

        this.client.on('error', (error: Error) => {
            this.logger.error('Client error:', error);
            reject(error);
        });
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
                this.logger.error('Reconnection failed:', error as Error);
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

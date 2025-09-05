/*!
 * Reconnection Management
 *
 * Handles automatic reconnection logic and retry mechanisms
 * for maintaining stable IPC connections.
 */

import { Logger } from '@/service/utils/logger';
import { ConnectionStatus } from '../types';

/**
 * Reconnection Manager
 *
 * Manages automatic reconnection logic and retry mechanisms
 */
export class ReconnectionManager {
    private reconnectInterval: NodeJS.Timeout | null = null;
    private reconnectAttempts: number = 0;
    private maxReconnectAttempts: number = 3;
    private reconnectDelay: number = 500;
    private autoReconnect: boolean = true;
    private logger: Logger;
    private onReconnect: () => Promise<void>;
    private onStateChange: (status: ConnectionStatus) => void;

    constructor(
        logger: Logger,
        onReconnect: () => Promise<void>,
        onStateChange: (status: ConnectionStatus) => void
    ) {
        this.logger = logger;
        this.onReconnect = onReconnect;
        this.onStateChange = onStateChange;
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
     * Set reconnection options
     */
    public setReconnectOptions(maxAttempts: number, delay: number): void {
        this.maxReconnectAttempts = maxAttempts;
        this.reconnectDelay = delay;
    }

    /**
     * Start reconnection process
     */
    public startReconnection(): void {
        if (!this.autoReconnect) {
            return;
        }

        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            this.logger.warn('Max reconnection attempts reached');
            this.onStateChange(ConnectionStatus.Failed);
            return;
        }

        if (this.reconnectInterval) {
            clearTimeout(this.reconnectInterval);
        }

        this.reconnectInterval = setTimeout(async () => {
            this.reconnectAttempts++;
            this.logger.info(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
            this.onStateChange(ConnectionStatus.Connecting);

            try {
                await this.onReconnect();
                this.logger.info('Reconnected successfully');
                this.onStateChange(ConnectionStatus.Connected);
                this.reconnectAttempts = 0; // Reset on successful reconnection
            } catch (error) {
                this.logger.error('Reconnection failed:' + (error as Error).message);
                this.startReconnection(); // Try again
            }
        }, this.reconnectDelay * this.reconnectAttempts);
    }

    /**
     * Stop reconnection process
     */
    public stopReconnection(): void {
        if (this.reconnectInterval) {
            clearTimeout(this.reconnectInterval);
            this.reconnectInterval = null;
        }
    }

    /**
     * Reset reconnection attempts
     */
    public resetReconnectAttempts(): void {
        this.reconnectAttempts = 0;
    }

    /**
     * Get current reconnection attempts
     */
    public getReconnectAttempts(): number {
        return this.reconnectAttempts;
    }

    /**
     * Check if reconnection is in progress
     */
    public isReconnecting(): boolean {
        return this.reconnectInterval !== null;
    }

    /**
     * Get reconnection configuration
     */
    public getConfig(): {
        autoReconnect: boolean;
        maxAttempts: number;
        delay: number;
        attempts: number;
    } {
        return {
            autoReconnect: this.autoReconnect,
            maxAttempts: this.maxReconnectAttempts,
            delay: this.reconnectDelay,
            attempts: this.reconnectAttempts,
        };
    }
}

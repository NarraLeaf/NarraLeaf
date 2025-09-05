/*!
 * IPC Manager
 *
 * Utility class for creating and managing IPC client instances
 * with singleton pattern and centralized lifecycle management.
 */

import { Logger } from '@/service/utils/logger';
import { MainServiceIPCClient } from './MainServiceIPCClient';

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

    /**
     * Get all active instances
     */
    static getActiveInstances(): string[] {
        return Array.from(this.instances.keys());
    }

    /**
     * Close a specific instance
     */
    static async closeInstance(socketName: string): Promise<boolean> {
        const key = `client:${socketName}`;
        const instance = this.instances.get(key);
        if (instance) {
            await instance.close();
            this.instances.delete(key);
            return true;
        }
        return false;
    }

    /**
     * Get instance statistics
     */
    static getInstanceStats(socketName: string): any | null {
        const key = `client:${socketName}`;
        const instance = this.instances.get(key);
        return instance ? instance.getStats() : null;
    }
}

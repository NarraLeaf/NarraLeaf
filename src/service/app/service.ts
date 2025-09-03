// Utils
import { EventEmitter } from "events";
import { Hooks } from "../utils/data";
import { Logger } from "../utils/logger";

// Services
import { MainServiceIPCClient } from "./ipc/socket";
import { RuntimeManager, StorageManager } from "./managers";
import { StoreProvider } from "./managers/storage/storeProvider";
import { ServiceEvents } from "./types";


export interface AppServices {
    runtime: RuntimeManager;
}

export interface ServiceConfig {
    store: StoreProvider | undefined;
    deleteCorruptedSaves: boolean;
}

export class Service {
    private static readonly DefaultConfig: ServiceConfig = {
        store: undefined,
        deleteCorruptedSaves: true,
    };

    private config: ServiceConfig;


    public readonly hooks: Hooks;
    public readonly events: EventEmitter<ServiceEvents>;
    public readonly logger: Logger;

    public readonly ipcClient: MainServiceIPCClient;

    public readonly runtimeManager: RuntimeManager;
    public readonly storageManager: StorageManager;

    constructor(ipcClient: MainServiceIPCClient, config: Partial<ServiceConfig> = {}) {
        this.config = {
            ...Service.DefaultConfig,
            ...config,
        };

        this.hooks = new Hooks();
        this.events = new EventEmitter();
        this.logger = new Logger("Service");

        this.ipcClient = ipcClient;

        this.runtimeManager = new RuntimeManager(this.ipcClient);
        this.storageManager = new StorageManager(this);
    }

    public async prepare() {
        // Add retry logic for IPC connection with intelligent backoff
        const maxRetries = 10;
        let retries = maxRetries;
        let connected = false;

        this.logger.info("Preparing service and establishing IPC connection...");

        while (retries > 0 && !connected) {
            try {
                const attemptNum = maxRetries - retries + 1;
                this.logger.info(`Attempting to connect to IPC server (${attemptNum}/${maxRetries})...`);
                await this.ipcClient.connect();
                connected = true;
                this.logger.info("Successfully connected to IPC server");
            } catch (error) {
                retries--;
                const errorMsg = (error as Error).message;

                // Check if it's a connection refused error (server not ready yet)
                const isServerNotReady = errorMsg.includes('ENOENT') ||
                    errorMsg.includes('ECONNREFUSED') ||
                    errorMsg.includes('connect');

                if (isServerNotReady && retries > 0) {
                    // Use shorter delays for server-not-ready errors
                    const baseDelay = 200; // Start with 200ms
                    const attemptNum = maxRetries - retries;
                    const delay = Math.min(baseDelay * Math.pow(1.5, attemptNum), 2000); // Max 2s

                    this.logger.info(`IPC server not ready yet, waiting ${Math.round(delay)}ms before retry (${retries} retries left)...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                } else if (retries > 0) {
                    // For other errors, use longer delays
                    const delay = Math.min(1000 * (maxRetries - retries + 1), 5000);
                    this.logger.warn(`IPC connection failed: ${errorMsg}. Waiting ${delay}ms before retry (${retries} retries left)...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                } else {
                    this.logger.error(`Failed to connect to IPC server after ${maxRetries} attempts: ${errorMsg}`);
                    throw error;
                }
            }
        }

        await this.runtimeManager.initializeManager();
        await this.storageManager.initializeManager([this.runtimeManager]);

        this.events.emit("ready");
    }

    public getConfig(): ServiceConfig {
        return this.config;
    }

    public quit() {
        this.runtimeManager.quit();
    }
}


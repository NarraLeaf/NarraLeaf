// Interface
import { API } from "./API";

// Services
import { Service } from "../service";
import { ServiceEventCallback, ServiceEvents, ServiceEventToken } from "../types";

// IPC
import { MainServiceIPCClient } from "../ipc/socket";

// Utils
import { Logger } from "@/service/utils/logger";
import { ServiceRuntimeError, ServiceError } from "@/service/utils/error";

// Config
import { ENV_IPC_CONNECTION_STRING } from "../constants";
import type { StoreProvider } from "../managers/storage/storeProvider";

export interface AppConfig {
    store: StoreProvider | undefined;

    deleteCorruptedSaves: boolean;
}

export class App extends API {
    private service: Service;
    private isReady: boolean = false;
    
    public readonly ipcClient: MainServiceIPCClient;
    public readonly logger: Logger;

    constructor(config: AppConfig) {
        const logger = new Logger("App");
        const connectionString = getConnectionString();
        logger.info(`[App] Initializing with IPC connection: ${connectionString}`);
        const ipcClient = new MainServiceIPCClient(connectionString, logger);
        super(ipcClient, config);

        this.logger = logger;
        this.ipcClient = ipcClient;

        const serviceConfig = {
            store: config.store,
            deleteCorruptedSaves: config.deleteCorruptedSaves,
        };
        this.service = new Service(this.ipcClient, serviceConfig);
        this.init();
    }

    public onReady(callback: ServiceEventCallback<"ready">): ServiceEventToken {
        return this.registerEvent("ready", callback);
    }

    public onceAppReady(): Promise<this> {
        return new Promise((resolve) => {
            if (this.isReady) {
                resolve(this);
            } else {
                this.onReady(() => resolve(this));
            }
        });
    }

    public quit(): Promise<void> {
        return this.service.runtimeManager.quit();
    }

    private async init() {
        this.logger.info('[App] Starting app initialization...');
        await this.service.prepare();
        this.logger.info('[App] App initialization completed');
        this.isReady = true;
    }

    private registerEvent<T extends keyof ServiceEvents>(
        event: T,
        callback: ServiceEventCallback<T>
    ): ServiceEventToken {
        this.service.events.on(event, callback as any);

        return {
            cancel: () => {
                this.service.events.off(event, callback as any);
            },
        };
    }
    
    protected assertReady(): asserts this is { isReady: true } {
        if (!this.isReady) {
            throw new ServiceError("Trying to access App before it is ready");
        }
    }
}

function getConnectionString(): string {
    const connectionString = process.env[ENV_IPC_CONNECTION_STRING];
    if (!connectionString) {
        throw new ServiceRuntimeError(`Environment variable ${ENV_IPC_CONNECTION_STRING} is not set`);
    }

    return connectionString;
}


import { EventEmitter } from "events";
import { Hooks } from "../utils/data";
import { Logger } from "../utils/logger";

import { ENV_IPC_CONNECTION_STRING } from "./constants";
import { SidecarRuntimeError } from "../utils/error";

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

    public readonly logger: Logger;
    public readonly hooks: Hooks;
    public readonly events: EventEmitter<ServiceEvents>;

    public readonly ipcClient: MainServiceIPCClient;

    public readonly runtimeManager: RuntimeManager;
    public readonly storageManager: StorageManager;

    constructor(config: Partial<ServiceConfig> = {}) {
        this.config = {
            ...Service.DefaultConfig,
            ...config,
        };

        this.logger = new Logger("App");
        this.hooks = new Hooks();
        this.events = new EventEmitter();

        this.ipcClient = new MainServiceIPCClient(getConnectionString(), this.logger);

        this.runtimeManager = new RuntimeManager(this.ipcClient);
        this.storageManager = new StorageManager(this);
    }

    public async prepare() {
        await this.ipcClient.connect();

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

function getConnectionString(): string {
    const connectionString = process.env[ENV_IPC_CONNECTION_STRING];
    if (!connectionString) {
        throw new SidecarRuntimeError(`Environment variable ${ENV_IPC_CONNECTION_STRING} is not set`);
    }

    return connectionString;
}


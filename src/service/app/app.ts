import { EventEmitter } from "events";
import { Hooks } from "../utils/data";
import { Logger } from "../utils/logger";

import { ENV_IPC_CONNECTION_STRING } from "./constants";
import { SidecarRuntimeError } from "../utils/error";

import { MainServiceIPCClient } from "./ipc/socket";
import { RuntimeManager, StorageManager } from "./managers";
import { StoreProvider } from "./managers/storage/storeProvider";
import { AppEvents } from "./types";


export interface AppServices {
    runtime: RuntimeManager;
}

export interface AppConfig {
    store: StoreProvider | undefined;
    deleteCorruptedSaves: boolean;
}

export class App {
    private static readonly DefaultConfig: AppConfig = {
        store: undefined,
        deleteCorruptedSaves: true,
    };

    private config: AppConfig;

    public readonly logger: Logger;
    public readonly hooks: Hooks;
    public readonly events: EventEmitter<AppEvents>;

    public readonly ipcClient: MainServiceIPCClient;

    public readonly runtimeManager: RuntimeManager;
    public readonly storageManager: StorageManager;

    constructor(config: Partial<AppConfig> = {}) {
        this.config = {
            ...App.DefaultConfig,
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

    public getConfig(): AppConfig {
        return this.config;
    }
}

function getConnectionString(): string {
    const connectionString = process.env[ENV_IPC_CONNECTION_STRING];
    if (!connectionString) {
        throw new SidecarRuntimeError(`Environment variable ${ENV_IPC_CONNECTION_STRING} is not set`);
    }

    return connectionString;
}


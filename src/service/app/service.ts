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

        this.ipcClient = ipcClient;

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


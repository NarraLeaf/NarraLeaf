// Node.js built-in modules
import { EventEmitter } from "events";

// NarraLeaf-React
import type { SavedGame } from "narraleaf-react";

// Core modules
import { SavedGameMeta, SaveType } from "@core/game/save";
import type { SavedGameResult } from "@core/game/SavedGameResult";

// Local modules
import { Platform, PlatformInfo, safeExecuteFn } from "@/utils/pure/os";
import { JsonStore } from "@/main_legacy/utils/jsonStore";
import { HookCallback, Hooks } from "@/main_legacy/utils/data";
import { Logger } from "@/main_legacy/utils/logger";
import { CriticalMainProcessError } from "@/main_legacy/utils/error";

// IPC modules
import { MainServiceIPCClient } from "@/main_legacy/app/ipc/socket";
import { RequestMessage, ResponseMessage, SidecarMessage } from "@/main_legacy/app/ipc/types";

// App managers
import { CrashManager, DevToolManager, MenuManager, ProtocolManager, StorageManager, WindowManager } from "./mgr/managers";

// Type imports
import type { AppConfig } from "@/main_legacy/app/config";

type SidecarEvents = {
    "ready": [];
    "shutdown": [];
};

export enum AppDataNamespace {
    save = "msg_storage",
    flags = "app_flags",
    json = "json_storage",
}

export enum HookEvents {
    AfterReady = "afterReady",
    AfterMainWindowClose = "afterMainWindowClose",
    OnTerminate = "onTerminate",
}

export interface SidecarDependency {
    crashManager: CrashManager;
    devToolManager: DevToolManager;
    menuManager: MenuManager;
    protocolManager: ProtocolManager;
    storageManager: StorageManager;
    windowManager: WindowManager;
}

export class SidecarService {
    public static Constants = {
        AppLifeCycleViolationTimeout: 5000 as const,
        PingInterval: 30000 as const, // 30 seconds
    } as const;

    public static Events = {
        Ready: "ready",
        Shutdown: "shutdown"
    } as const;

    public readonly platform: PlatformInfo;
    public readonly events: EventEmitter<SidecarEvents>;
    public readonly config: AppConfig;
    public readonly hooks: Hooks;
    public readonly logger: Logger;

    public readonly crashManager: CrashManager;
    public readonly devToolManager: DevToolManager;
    public readonly menuManager: MenuManager;
    public readonly protocolManager: ProtocolManager;
    public readonly storageManager: StorageManager;
    public readonly windowManager: WindowManager;

    private ipcClient: MainServiceIPCClient;
    private initialized: boolean = false;
    private pingInterval: NodeJS.Timeout | null = null;
    private shutdownRequested: boolean = false;

    constructor(config: AppConfig, socketName: string) {
        this.config = config;
        this.platform = Platform.getInfo(process);
        this.logger = new Logger("SidecarService");
        this.hooks = new Hooks();
        this.events = new EventEmitter();

        // Initialize IPC client for communication with Rust process
        this.ipcClient = new MainServiceIPCClient(socketName, this.logger);

        // Create managers after basic initialization
        this.crashManager = new CrashManager(this);
        this.devToolManager = new DevToolManager(this);
        this.menuManager = new MenuManager(this);
        this.protocolManager = new ProtocolManager(this);
        this.storageManager = new StorageManager(this);
        this.windowManager = new WindowManager(this);

        this.setupIPCMessageHandlers();
        this.prepare();
    }

    public onReady(fn: (...args: SidecarEvents["ready"]) => void): void {
        const handler = () => {
            safeExecuteFn(fn);
        };
        this.events.on<"ready">(SidecarService.Events.Ready, handler);
    }

    public onShutdown(fn: (...args: SidecarEvents["shutdown"]) => void): void {
        const handler = () => {
            safeExecuteFn(fn);
        };
        this.events.on<"shutdown">(SidecarService.Events.Shutdown, handler);
    }

    getConfig() {
        return this.config.getConfig(this.platform);
    }

    public getCrashReport() {
        return this.crashManager.getCrashReport();
    }

    public isPackaged(): boolean {
        // In Sidecar mode, we determine this from environment
        return process.env.NODE_ENV === "production";
    }

    public getUserDataDir(): string {
        // In Sidecar mode, use environment variable or default path
        return process.env.USER_DATA_DIR || process.cwd();
    }

    public getPublicDir(): string {
        // In Sidecar mode, return the public directory path
        return process.env.PUBLIC_DIR || process.cwd();
    }

    public getAppPath(): string {
        // In Sidecar mode, return the app directory path
        return process.env.APP_DIR || process.cwd();
    }

    public getRendererBuildDir(): string {
        // In Sidecar mode, return the renderer build directory path
        return process.env.RENDERER_BUILD_DIR || process.cwd();
    }

    public isHttpDevServerMode(): boolean {
        // In Sidecar mode, check if we're in HTTP dev server mode
        return process.env.HTTP_DEV_MODE === 'true' || false;
    }

    /* Json Store */

    public createJsonStore<T extends Record<string, any>>(name: string): JsonStore<T> {
        return this.storageManager.createJsonStore<T>(name);
    }

    public createExposedJsonStore<T extends Record<string, any>>(name: string): JsonStore<T> {
        return this.storageManager.createExposedJsonStore<T>(name);
    }

    public exposeJsonStore<T extends Record<string, any>>(store: JsonStore<T>): void {
        this.storageManager.exposeJsonStore(store);
    }

    public async saveGameData(data: SavedGame, type: SaveType, id: string, preview?: string): Promise<void> {
        return this.storageManager.saveGameData(data, type, id, preview);
    }

    public async readGameData(id: string): Promise<SavedGameResult | null> {
        return this.storageManager.readGameData(id);
    }

    public async listGameData(): Promise<SavedGameMeta[]> {
        return await this.storageManager.listGameData();
    }

    public async deleteGameData(id: string): Promise<void> {
        return this.storageManager.deleteGameData(id);
    }

    /**
     * Send request to Tauri process
     */
    public async sendTauriRequest(type: string, payload: any): Promise<any> {
        const requestType = `tauri:${type}`;
        try {
            const response = await this.ipcClient.sendRequest(requestType, payload);
            if (response.success) {
                return response.data;
            } else {
                throw new Error(response.error || 'Tauri request failed');
            }
        } catch (error) {
            this.logger.error(`Failed to send Tauri request ${type}:` + (error as Error).message);
            throw error;
        }
    }

    /**
     * Handle incoming IPC messages from Rust process
     */
    private setupIPCMessageHandlers(): void {
        this.ipcClient.on('message', async (message: SidecarMessage) => {
            if (message.type === 'Request') {
                await this.handleRequest(message as RequestMessage);
            }
        });

        this.ipcClient.on('disconnected', () => {
            this.logger.warn('Lost connection to Tauri process');
            this.stopPingInterval();
            if (!this.shutdownRequested) {
                this.requestShutdown();
            }
        });
    }

    /**
     * Handle narraleaf: requests from renderer through Rust
     */
    private async handleRequest(request: RequestMessage): Promise<void> {
        if (!request.request_type.startsWith('narraleaf:')) {
            this.logger.warn(`Received non-narraleaf request: ${request.request_type}`);
            return;
        }

        const requestType = request.request_type.replace('narraleaf:', '');
        let response: ResponseMessage;

        try {
            const result = await this.processAppRequest(requestType, request.payload);
            response = {
                type: 'Response',
                id: request.id,
                success: true,
                data: result
            };
        } catch (error) {
            this.logger.error(`Error processing request ${requestType}:` + (error as Error).message);
            response = {
                type: 'Response',
                id: request.id,
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }

        this.ipcClient.send(response);
    }

    /**
     * Process narraleaf requests
     */
    private async processAppRequest(type: string, payload: any): Promise<any> {
        switch (type) {
            case 'window.create':
                return await this.windowManager.createWindow(payload);
            case 'window.close':
                return await this.windowManager.closeWindow(payload.id);
            case 'window.focus':
                return await this.windowManager.focusWindow(payload.id);
            case 'game.save':
                return await this.saveGameData(payload.data, payload.type, payload.id, payload.preview);
            case 'game.load':
                return await this.readGameData(payload.id);
            case 'game.list':
                return await this.listGameData();
            case 'game.delete':
                return await this.deleteGameData(payload.id);
            case 'storage.get':
                return await this.storageManager.getData(payload.key);
            case 'storage.set':
                return await this.storageManager.setData(payload.key, payload.value);
            case 'config.get':
                return this.getConfig();
            case 'app.quit':
                this.requestShutdown();
                return { success: true };
            default:
                throw new Error(`Unknown request type: ${type}`);
        }
    }

    /**
     * Start the ping interval to keep connection alive
     */
    private startPingInterval(): void {
        this.pingInterval = setInterval(() => {
            if (this.ipcClient.getConnected()) {
                this.ipcClient.sendPing();
            }
        }, SidecarService.Constants.PingInterval);
    }

    /**
     * Stop the ping interval
     */
    private stopPingInterval(): void {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
    }

    /**
     * Request graceful shutdown
     */
    private requestShutdown(): void {
        this.logger.info('Shutdown requested');
        this.shutdownRequested = true;
        this.emitHook(HookEvents.OnTerminate);
        this.emit(SidecarService.Events.Shutdown);
        this.stopPingInterval();
        this.ipcClient.close().finally(() => {
            process.exit(0);
        });
    }

    private async prepare() {
        try {
            // Connect to Rust process
            await this.ipcClient.connect();
            this.logger.info('Connected to Tauri process');

            // Start ping interval
            this.startPingInterval();

            // Initialize managers
            await this.crashManager.initialize();
            if (!this.isPackaged()) {
                await this.devToolManager.initialize();
                await this.devToolManager.fetchMetadata();
            }

            this.menuManager.initialize();
            this.windowManager.initialize();
            this.protocolManager.initialize();

            this.initialized = true;
            this.logger.info("Sidecar service initialization completed");

            this.emit(SidecarService.Events.Ready);
            this.emitHook(HookEvents.AfterReady);
        } catch (error) {
            this.logger.error('Failed to initialize Sidecar service:', error);
            process.exit(1);
        }
    }

    public hook(event: HookEvents, fn: HookCallback) {
        return this.hooks.hook(event, fn);
    }

    public onceHook(event: HookEvents, fn: HookCallback) {
        return this.hooks.onceHook(event, fn);
    }

    public unhook(event: HookEvents, fn: HookCallback): void {
        this.hooks.unhook(event, fn);
    }

    public emitHook(event: HookEvents): void {
        this.hooks.trigger(event);
    }

    private emit<K extends keyof SidecarEvents>(event: K, ...args: SidecarEvents[K]): void {
        this.events.emit(event, ...args as any);
    }
}

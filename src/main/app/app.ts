// Node.js built-in modules
import { EventEmitter } from "events";
import path from "path";

// Electron
import { app } from "electron";

// NarraLeaf-React
import type { StringKeyOf } from "narraleaf-react/dist/util/data";
import type { SavedGame } from "narraleaf-react";

// Core modules
import { PreloadFileName, RendererOutputHTMLFileName } from "@core/build/constants";
import { DevTempNamespace, TempNamespace } from "@core/constants/tempNamespace";
import { SavedGameMetadata, SaveType } from "@core/game/save";
import type { SavedGameResult } from "@core/game/SavedGameResult";

// Local modules
import { Platform, PlatformInfo, safeExecuteFn } from "@/utils/pure/os";
import { reverseDirectoryLevels } from "@/utils/pure/string";
import { JsonStore } from "@/main/utils/jsonStore";
import { HookCallback, Hooks } from "@/main/utils/data";
import { Logger } from "@/main/utils/logger";
import { CriticalMainProcessError } from "@/main/utils/error";
import { CrashReport } from "@/main/app/mgr/crashManager";
import { TranslationManager } from "@/main/app/mgr/translationManager";

// App managers
import { CrashManager, DevToolManager, MenuManager, ProtocolManager, StorageManager, WindowManager } from "./mgr/managers";

// Type imports
import type { AppEventToken } from "./types";
import type { AppConfig } from "@/main/app/config";
import type { AppWindow, WindowConfig } from "@/main/app/mgr/window/appWindow";

type AppEvents = {
    "ready": [];
};

export type AppMeta = {
    publicDir: string;
    rootDir: string;
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

export interface AppDependecy {
    crashManager: CrashManager;
    devToolManager: DevToolManager;
    menuManager: MenuManager;
    protocolManager: ProtocolManager;
    storageManager: StorageManager;
    windowManager: WindowManager;
    translationManager: TranslationManager;
}

export class App {
    public static Constants = {
        AppLifeCycleViolationTimeout: 5000 as const,
    } as const;
    public static Events = {
        Ready: "ready"
    } as const;
    
    public readonly electronApp: Electron.App;
    public readonly platform: PlatformInfo;
    public readonly events: EventEmitter<AppEvents>;
    public readonly config: AppConfig;
    public readonly hooks: Hooks;
    public readonly logger: Logger;

    public readonly translationManager: TranslationManager;
    public readonly crashManager: CrashManager;
    public readonly devToolManager: DevToolManager;
    public readonly menuManager: MenuManager;
    public readonly protocolManager: ProtocolManager;
    public readonly storageManager: StorageManager;
    public readonly windowManager: WindowManager;

    private initialized: boolean = false;

    constructor(config: AppConfig) {
        this.config = config;
        this.electronApp = app;
        this.platform = Platform.getInfo(process);
        this.logger = new Logger("MainProcess");
        this.hooks = new Hooks();
        this.events = new EventEmitter();

        // Create managers after basic initialization
        this.translationManager = new TranslationManager(this);
        this.crashManager = new CrashManager(this);
        this.devToolManager = new DevToolManager(this);
        this.menuManager = new MenuManager(this);
        this.protocolManager = new ProtocolManager(this);
        this.storageManager = new StorageManager(this);
        this.windowManager = new WindowManager(this);

        this.prepare();
    }

    public onReady(fn: (...args: AppEvents["ready"]) => void): AppEventToken {
        const handler = () => {
            safeExecuteFn(fn);
        };
        this.events.on<"ready">(App.Events.Ready, handler);

        return {
            cancel: () => {
                this.events.off(App.Events.Ready, handler);
            }
        };
    }

    getConfig() {
        return this.config.getConfig(this.platform);
    }

    public getCrashReport(): CrashReport | null {
        return this.crashManager.getCrashReport();
    }

    public getPreloadScript(): string {
        const appDir = this.electronApp.getAppPath();

        return this.electronApp.isPackaged
            ? path.resolve(appDir, TempNamespace.MainBuild, PreloadFileName)
            : path.resolve(appDir, PreloadFileName);
    }

    public getEntryFile(): string {
        const appDir = this.electronApp.getAppPath();

        return this.electronApp.isPackaged
            ? path.resolve(appDir, TempNamespace.RendererBuild, RendererOutputHTMLFileName)
            : path.resolve(appDir, reverseDirectoryLevels(DevTempNamespace.MainBuild), DevTempNamespace.RendererBuild, RendererOutputHTMLFileName);
    }

    public getPublicDir(): string {
        const metadata = this.devToolManager.tryGetMetadata();
        const appDir = this.getAppPath();

        return this.electronApp.isPackaged
            ? path.resolve(appDir, TempNamespace.Public)
            : metadata?.publicDir ?? path.resolve(appDir, reverseDirectoryLevels(DevTempNamespace.MainBuild), TempNamespace.Public);
    }

    /**
     * Returns the build directory of the app
     * 
     * For example, under development mode, it returns the directory of the `.narraleaf` folder which contains `app-dev`  
     * Under production mode, it returns the directory of the app.asar file which contains `app-build` and `package.json`
     * 
     * The structure of the build directory
     */
    public getAppPath(): string {
        const appDir = this.electronApp.getAppPath();

        return this.electronApp.isPackaged
            ? appDir
            : path.resolve(appDir, reverseDirectoryLevels(DevTempNamespace.MainBuild));
    }

    public getRendererBuildDir(): string {
        const appDir = this.electronApp.getAppPath();

        return this.electronApp.isPackaged
            ? path.resolve(appDir, TempNamespace.RendererBuild)
            : path.resolve(appDir, reverseDirectoryLevels(DevTempNamespace.MainBuild), DevTempNamespace.RendererBuild);
    }

    /**
     * Quit the app without any error
     */
    public quit(): void {
        this.electronApp.quit();
    }

    /**
     * Quit the app and create a crash report
     *
     * If the reason is not provided, the crash will be considered critical
     */
    public crash(reason?: string, {disableRecovery = false}: {disableRecovery?: boolean} = {}): void {
        this.crashManager.crash(reason, {disableRecovery});
    }

    public async launchApp(config: Partial<WindowConfig> = {}): Promise<AppWindow> {
        if (!this.initialized) {
            throw new Error("App is not initialized");
        }

        if (this.windowManager.getMainWindow()) {
            throw new Error("Main window is already created");
        }

        return await this.windowManager.launchMainWindow(config);
    }

    public isPackaged(): boolean {
        return this.electronApp.isPackaged;
    }

    public getUserDataDir(): string {
        return app.getPath("userData");
    }

    public createJsonStore<T extends Record<string, any>>(name: string): JsonStore<T> {
        return new JsonStore<T>({
            dir: path.join(this.getUserDataDir(), AppDataNamespace.json),
            name,
        });
    }

    public async saveGameData(data: SavedGame, type: SaveType, id: string, preview?: string): Promise<void> {
        return this.storageManager.saveGameData(data, type, id, preview);
    }

    public async readGameData(id: string): Promise<SavedGameResult | null> {
        return this.storageManager.readGameData(id);
    }

    public async listGameData(): Promise<SavedGameMetadata[]> {
        return await this.storageManager.listGameData();
    }

    public async deleteGameData(id: string): Promise<void> {
        return this.storageManager.deleteGameData(id);
    }

    private async prepare() {
        const config = this.config.getConfig(this.platform);
        if (!this.electronApp && !app) {
            throw new CriticalMainProcessError("Electron App is not available");
        }
        if (config.forceSandbox) {
            this.electronApp.enableSandbox();
        }
        if (!this.electronApp.isPackaged) {
            this.devToolManager.initialize();
        }

        this.menuManager.initialize();
        this.windowManager.initialize();
        this.protocolManager.initialize();

        this.electronApp.whenReady().then(async () => {
            await this.crashManager.initialize();
            if (!this.isPackaged()) {
                await this.devToolManager.fetchMetadata();
            }

            this.initialized = true;

            this.emit(App.Events.Ready);
            this.emitHook(HookEvents.AfterReady);

        });
    }

    public hook(event: HookEvents, fn: HookCallback): AppEventToken {
        return this.hooks.hook(event, fn);
    }

    public onceHook(event: HookEvents, fn: HookCallback): AppEventToken {
        return this.hooks.onceHook(event, fn);
    }

    public unhook(event: HookEvents, fn: HookCallback): void {
        this.hooks.unhook(event, fn);
    }

    public emitHook(event: HookEvents): void {
        this.hooks.trigger(event);
    }

    private emit<K extends StringKeyOf<AppEvents>>(event: K, ...args: AppEvents[K]): void {
        this.events.emit(event, ...args as any);
    }
}

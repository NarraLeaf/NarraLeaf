// Node.js built-in modules
import { EventEmitter } from "events";
import path from "path";

// Electron
import { app } from "electron";

// NarraLeaf-React
import type { SavedGame } from "narraleaf-react";
import type { StringKeyOf } from "@shared/types/utilityTypes";

// Core modules
import {
    AppHost,
    DefaultDevHTTPServerPort,
    PreloadFileName,
    RendererOutputHTMLFileName,
    DevTempNamespace,
    TempNamespace
} from "@narraleaf/shared";
import { SavedGameMeta, SavedGameResult, SaveType } from "@shared/types/save";

// Local modules
import { Platform, PlatformInfo, safeExecuteFn } from "@shared/utils/os";
import { reverseDirectoryLevels } from "@shared/utils/string";
import { JsonStore } from "@/main/utils/jsonStore";
import { HookCallback, Hooks } from "@/main/utils/data";
import { assertSafeStorageKey } from "@/main/utils/safeStorageKey";
import { Logger } from "@/shared/utils/logger";
import { CriticalMainProcessError } from "@shared/utils/error";
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



/** Logical subdirectories under Electron `userData` used by built-in persistence layers. */
export enum AppDataNamespace {
    save = "msg_storage",
    flags = "app_flags",
    json = "json_storage",
}

/** Lightweight lifecycle hook bus names (distinct from DOM/Electron events). */
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

/**
 * Electron main-process host: lifecycle, hooks, paths, storage façade, and window launch.
 *
 * Construct with {@link AppConfig#create}; do not call {@link App.create} from host code.
 */
export class App {
    public static Constants = {
        AppLifeCycleViolationTimeout: 5000 as const,
    } as const;

    public static Events = {
        Ready: "ready"
    } as const;

    /**
     * This method is used to create a new instance of the App class.
     * @internal
     */
    public static create(config: AppConfig): App {
        return new App(config);
    }
    
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

    private constructor(config: AppConfig) {
        this.config = config;
        this.electronApp = app;
        this.platform = Platform.getInfo(process);
        this.logger = new Logger("MainProcess");
        this.hooks = new Hooks();
        this.events = new EventEmitter();

        // Setup development userData path before creating managers that depend on it
        this.setupUserDataDir();

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

    /**
     * Registers a one-shot listener fired after Electron is ready, managers are initialized, and
     * crash recovery metadata is loaded (dev metadata fetch runs when not packaged).
     *
     * @returns A token whose {@link AppEventToken.cancel} removes the listener.
     */
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

    /** Effective merged configuration for the current {@link App.platform}. */
    getConfig() {
        return this.config.getConfig(this.platform);
    }

    /** Latest crash metadata retained by {@link CrashManager}, if any. */
    public getCrashReport(): CrashReport | null {
        return this.crashManager.getCrashReport();
    }

    /**
     * Absolute path to the preload bundle for this environment (packaged vs dev tree).
     */
    public getPreloadScript(): string {
        const appDir = this.electronApp.getAppPath();

        return this.electronApp.isPackaged
            ? path.resolve(appDir, TempNamespace.MainBuild, PreloadFileName)
            : path.resolve(appDir, PreloadFileName);
    }

    /**
     * Renderer entry: packaged HTML path, dev disk path, or HTTP dev-server URL when HTTP mode is enabled.
     */
    public getEntryFile(): string {
        // If HTTP mode is enabled, return localhost URL
        if (this.isHttpDevServerMode()) {
            const devServerPort = this.devToolManager.getMetadata().httpMode?.port ?? DefaultDevHTTPServerPort;
            const url = `http://localhost:${devServerPort}/${AppHost.DevServer}/${RendererOutputHTMLFileName}`;
            this.logger.info(`HTTP mode enabled, returning URL: ${url}`);
            this.logger.info(`HTTP mode state: isHttpMode=${this.isHttpDevServerMode()}, devServerPort=${devServerPort}`);
            return url;
        }

        const appDir = this.electronApp.getAppPath();
        const filePath = this.electronApp.isPackaged
            ? path.resolve(appDir, TempNamespace.RendererBuild, RendererOutputHTMLFileName)
            : path.resolve(appDir, reverseDirectoryLevels(DevTempNamespace.MainBuild), DevTempNamespace.RendererBuild, RendererOutputHTMLFileName);
        
        this.logger.info(`HTTP mode disabled, returning file path: ${filePath}`);
        this.logger.info(`HTTP mode state: isHttpMode=${this.isHttpDevServerMode()}, isPackaged=${this.electronApp.isPackaged}`);
        return filePath;
    }

    /**
     * Public/static asset directory (`public` under the build root), honoring dev-server overrides when present.
     */
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
     * Under production mode, it returns the virtual directory of the app.asar file which contains `app-build` and `package.json`
     * 
     * The structure of the build directory
     */
    public getAppPath(): string {
        const appDir = this.electronApp.getAppPath();

        return this.electronApp.isPackaged
            ? appDir
            : path.resolve(appDir, reverseDirectoryLevels(DevTempNamespace.MainBuild));
    }

    /**
     * Directory containing built renderer assets (`renderer-build` under the build root).
     */
    public getRendererBuildDir(): string {
        const appDir = this.electronApp.getAppPath();

        return this.electronApp.isPackaged
            ? path.resolve(appDir, TempNamespace.RendererBuild)
            : path.resolve(appDir, reverseDirectoryLevels(DevTempNamespace.MainBuild), DevTempNamespace.RendererBuild);
    }

    /** `true` when the dev-tool metadata enables loading the renderer over HTTP instead of `file:`. */
    public isHttpDevServerMode(): boolean {
        return this.devToolManager.tryGetMetadata()?.httpMode?.enabled ?? false;
    }

    /** Normal Electron quit (no synthetic crash report). */
    public quit(): void {
        this.electronApp.quit();
    }

    /**
     * Records a crash and routes through {@link CrashManager} (recovery UX depends on configuration).
     *
     * @param reason - Optional human-readable reason; omit for a critical default classification.
     * @param disableRecovery - When `true`, skips recovery-oriented handling where applicable.
     */
    public crash(reason?: string, {disableRecovery = false}: {disableRecovery?: boolean} = {}): void {
        this.crashManager.crash(reason, {disableRecovery});
    }

    /**
     * Creates the primary {@link AppWindow} via {@link WindowManager.launchMainWindow}.
     *
     * @throws When called before ready, or when a main window already exists.
     *
     * @example
     * ```ts
     * app.onReady(() => {
     *   void app.launchApp({ isolated: true });
     * });
     * ```
     */
    public async launchApp(config: Partial<WindowConfig> = {}): Promise<AppWindow> {
        if (!this.initialized) {
            throw new Error("App is not initialized");
        }

        if (this.windowManager.getMainWindow()) {
            throw new Error("Main window is already created");
        }

        return await this.windowManager.launchMainWindow(config);
    }

    /** Mirrors `electron.app.isPackaged`. */
    public isPackaged(): boolean {
        return this.electronApp.isPackaged;
    }

    /** Electron `userData` path (dev builds redirect under the build root). */
    public getUserDataDir(): string {
        return app.getPath("userData");
    }

    /* Json Store */

    /**
     * File-backed JSON document under the app `AppDataNamespace.json` area. `name` must satisfy {@link assertSafeStorageKey}.
     */
    public createJsonStore<T extends Record<string, any>>(name: string): JsonStore<T> {
        return this.storageManager.createJsonStore<T>(name);
    }

    /**
     * @deprecated Prefer domain-specific IPC or explicit stores; this pattern exposes whole-document JSON over IPC.
     */
    public createExposedJsonStore<T extends Record<string, any>>(name: string): JsonStore<T> {
        return this.storageManager.createExposedJsonStore<T>(name);
    }

    /**
     * @deprecated Prefer domain-specific IPC; registers a store for `app.store.*` IPC helpers.
     */
    public exposeJsonStore<T extends Record<string, any>>(store: JsonStore<T>): void {
        this.storageManager.exposeJsonStore(store);
    }

    /**
     * Persists serialized game data through {@link StorageManager} / {@link StoreProvider}.
     * `id` is validated with {@link assertSafeStorageKey}.
     */
    public async saveGameData(data: SavedGame, type: SaveType, id: string, preview?: string): Promise<void> {
        assertSafeStorageKey(id, "Save id");
        return this.storageManager.saveGameData(data, type, id, preview);
    }

    /** Loads a save by `id` (validated) or returns `null` when missing. */
    public async readGameData(id: string): Promise<SavedGameResult | null> {
        assertSafeStorageKey(id, "Save id");
        return this.storageManager.readGameData(id);
    }

    /** Lists save metadata from the active {@link StoreProvider}. */
    public async listGameData(): Promise<SavedGameMeta[]> {
        return await this.storageManager.listGameData();
    }

    /** Deletes a save by `id` (validated). */
    public async deleteGameData(id: string): Promise<void> {
        assertSafeStorageKey(id, "Save id");
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
            this.logger.info("App initialization completed");

            this.emit(App.Events.Ready);
            this.emitHook(HookEvents.AfterReady);
        });
    }

    /** Subscribe to a {@link HookEvents} lifecycle hook (see also {@link onceHook}). */
    public hook(event: HookEvents, fn: HookCallback): AppEventToken {
        return this.hooks.hook(event, fn);
    }

    /** Subscribe once; token cancels before the first fire. */
    public onceHook(event: HookEvents, fn: HookCallback): AppEventToken {
        return this.hooks.onceHook(event, fn);
    }

    /** Removes a previously registered hook callback. */
    public unhook(event: HookEvents, fn: HookCallback): void {
        this.hooks.unhook(event, fn);
    }

    /** Synchronously emits a hook bus event to all subscribers. */
    public emitHook(event: HookEvents): void {
        this.hooks.trigger(event);
    }

    private emit<K extends StringKeyOf<AppEvents>>(event: K, ...args: AppEvents[K]): void {
        this.events.emit(event, ...args as any);
    }

    /**
     * Setup development userData path if running in development mode
     * This must be called before creating managers that depend on userData path
     */
    private setupUserDataDir(): void {
        if (!this.electronApp.isPackaged) {
            const userDataPath = path.join(this.getAppPath(), "userData-dev");
            this.logger.info(`[App] Setting up dev userData path: ${userDataPath}`);
            this.electronApp.setPath("userData", userDataPath);
            this.logger.info(`[App] Dev userData path set successfully`);
        }
    }
}

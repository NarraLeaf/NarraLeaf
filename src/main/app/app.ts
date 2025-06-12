import path from "path";
import {app, dialog, Menu, protocol} from "electron";
import {AppConfig} from "@/main/app/config";
import {EventEmitter} from "events";
import {AppWindow, WindowConfig} from "@/main/app/mgr/window/appWindow";
import {
    AppHost,
    AppProtocol,
    DefaultDevServerPort,
    ENV_DEV_SERVER_PORT,
    PreloadFileName,
    RendererOutputHTMLFileName
} from "@core/build/constants";
import {CriticalMainProcessError} from "@/main/error/criticalError";
import {Platform, PlatformInfo, safeExecuteFn} from "@/utils/pure/os";
import {DevTempNamespace, TempNamespace} from "@core/constants/tempNamespace";
import {reverseDirectoryLevels} from "@/utils/pure/string";
import {Client} from "@/utils/nodejs/websocket";
import {DevServerEvent, DevServerEvents} from "@core/dev/devServer";
import {AssetResolved, LocalAssets} from "@/main/electron/app/assets";
import url, {fileURLToPath} from "url";
import {normalizePath} from "@/utils/nodejs/string";
import {Fs} from "@/utils/nodejs/fs";
import {getMimeType} from "@/utils/nodejs/os";
import {StringKeyOf} from "narraleaf-react/dist/util/data";
import {LocalFile} from "@/main/app/mgr/storage/fileSystem/localFile";
import {SavedGameMetadata, SaveType} from "@core/game/save";
import {StoreProvider} from "@/main/app/mgr/storage/storeProvider";
import { SavedGameResult } from "../../core/game/SavedGameResult";
import {FsFlag} from "@/utils/fsLogger";
import { translate } from "@/main/i18n/translate";
import { JsonStore } from "../electron/data/jsonStore";
import { HookCallback, Hooks } from "../utils/data";
import { Logger } from "../utils/logger";
import { CrashManager } from "./mgr/crashManager";
import { DevToolManager } from "./mgr/devToolManager";
import { ProtocolManager } from "./mgr/protocolManager";
import { StorageManager } from "./mgr/storageManager";
import { WindowManager } from "./mgr/windowManager";
import type {SavedGame} from "narraleaf-react";
import { MenuManager } from "./mgr/menuManager";

type AppEvents = {
    "ready": [];
};
type AppFsFlags = {
    crash: FsFlag<CrashReport>;
};
export type CrashReport = {
    isCritical: true;
    timestamp?: never;
    reason?: never;
    recoveryDisabled?: never;
} | {
    isCritical: false;
    timestamp: number;
    reason: string;
    recoveryDisabled: boolean;
};

export type AppEventToken = {
    cancel(): void;
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
}

export class App {
    public static Constants = {
        AppLifeCycleViolationTimeout: 5000 as const,
    } as const;
    public static Events = {
        Ready: "ready"
    } as const;
    
    public readonly electronApp: Electron.App;
    public readonly platform: PlatformInfo = Platform.getInfo(process);
    public readonly events: EventEmitter<AppEvents> = new EventEmitter();

    public config: AppConfig;
    public t: (key: string) => string;

    public readonly hooks: Hooks = new Hooks();
    public readonly logger: Logger = new Logger("MainProcess");

    public readonly crashManager: CrashManager;
    public readonly devToolManager: DevToolManager;
    public readonly menuManager: MenuManager;
    public readonly protocolManager: ProtocolManager;
    public readonly storageManager: StorageManager;
    public readonly windowManager: WindowManager;

    constructor(
        config: AppConfig,
        dependency: AppDependecy
    ) {
        this.config = config;

        this.crashManager = dependency.crashManager;
        this.devToolManager = dependency.devToolManager;
        this.menuManager = dependency.menuManager;
        this.protocolManager = dependency.protocolManager;
        this.storageManager = dependency.storageManager;
        this.windowManager = dependency.windowManager;

        this.electronApp = app;
        this.t = translate(this);

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
        if (this.windowManager.getMainWindow()) {
            throw new Error("Main window is already created");
        }

        if (!this.isPackaged()) {
            await this.devToolManager.fetchMetadata();
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

    private async prepareCrashHelper() {
        await this.crashManager.initialize();
    }

    private prepare() {
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
        this.protocolManager.initializeProtocol();
        this.menuManager.initialize();
        this.windowManager.initialize();

        this.electronApp.whenReady().then(async () => {
            await this.crashManager.initialize();

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

    private async readFile(filePath: string): Promise<{
        data: Buffer;
        mimeType: string;
    }> {
        const data = await Fs.readRaw(filePath);
        const mimeType = getMimeType(filePath);

        if (!data.ok) {
            throw new Error(data.error);
        }

        return {
            data: data.data,
            mimeType,
        };
    }

    private emit<K extends StringKeyOf<AppEvents>>(event: K, ...args: AppEvents[K]): void {
        this.events.emit(event, ...args as any);
    }
}

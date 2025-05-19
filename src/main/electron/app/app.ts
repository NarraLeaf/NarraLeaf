import path from "path";
import {app, dialog, Menu, protocol} from "electron";
import {AppConfig} from "@/main/electron/app/config";
import {EventEmitter} from "events";
import {AppWindow, WindowConfig} from "@/main/electron/app/appWindow";
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
import {LocalFile} from "@/main/electron/app/save/localFile";
import {SavedGame, SavedGameMetadata, SaveType} from "@core/game/save";
import {StoreProvider} from "@/main/electron/app/save/storeProvider";
import {FsFlag} from "@/main/electron/data/fsLogger";
import { translate } from "@/main/i18n/translate";
import { JsonStore } from "../data/jsonStore";

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

enum HookEvents {
    AfterReady = "afterReady",
    AfterMainWindowClose = "afterMainWindowClose",
    OnTerminate = "onTerminate",
}

export class App {
    public static Constants = {
        AppLifeCycleViolationTimeout: 5000 as const,
    } as const;
    public static Events = {
        Ready: "ready"
    } as const;
    public readonly electronApp: Electron.App;
    public readonly events: EventEmitter<AppEvents> = new EventEmitter();
    public readonly platform: PlatformInfo;
    public devState: {
        wsClient: Client<DevServerEvents> | null
    } = {
        wsClient: null,
    };
    public mainWindow: AppWindow | null = null;
    public saveStorage: StoreProvider;
    public config: AppConfig;
    public t: (key: string) => string;
    private hooks: {
        [K in HookEvents]?: Array<(...args: any[]) => void>;
    } = {};
    private assets: LocalAssets = new LocalAssets();
    private metadata: AppMeta | null = null;
    private schedules: Array<() => void> = [];
    private flags: AppFsFlags;
    private crashReport: CrashReport | null = null;

    constructor(config: AppConfig) {
        this.config = config;
        this.electronApp = app;
        this.platform = Platform.getInfo(process);
        this.t = translate(this);

        this.prepare();

        this.flags = this.getFsFlags();

        // important: must be called after `prepare`
        this.saveStorage = this.getConfig().store || new LocalFile({
            dir: path.join(this.getUserDataDir(), AppDataNamespace.save),
        });
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

    createWindow(config: Partial<WindowConfig>): AppWindow {
        return new AppWindow(this, config, {
            preload: this.getPreloadScript(),
        });
    }

    getConfig() {
        return this.config.getConfig(this.platform);
    }

    public getCrashReport(): CrashReport | null {
        return this.crashReport;
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
        const appDir = this.getAppPath();

        return this.electronApp.isPackaged
            ? path.resolve(appDir, TempNamespace.Public)
            : this.metadata?.publicDir ?? path.resolve(appDir, reverseDirectoryLevels(DevTempNamespace.MainBuild), TempNamespace.Public);
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
        if (!reason) {
            this.flags.crash.flagSync({
                isCritical: true,
            });
        } else {
            this.flags.crash.flagSync({
                isCritical: false,
                timestamp: Date.now(),
                reason,
                recoveryDisabled: disableRecovery,
            });
        }
        this.electronApp.quit();
    }

    public async launchApp(config: Partial<WindowConfig> = {}): Promise<AppWindow> {
        if (this.mainWindow) {
            throw new Error("Main window is already created");
        }

        if (!this.isPackaged()) {
            await this.fetchMetadata();
        }

        const win = new AppWindow(this, config, {
            preload: this.getPreloadScript(),
        });
        this.prepareMainWindow(win);
        await win.loadFile(this.getEntryFile());
        await win.show();

        this.mainWindow = win;

        return win;
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
        const metadata = this.getSavedGameMetadata(data, type, id, preview);
        return this.saveStorage.set(metadata.id, type, metadata, data);
    }

    public async readGameData(id: string): Promise<SavedGame> {
        return this.saveStorage.get(id);
    }

    public async listGameData(): Promise<SavedGameMetadata[]> {
        return await this.saveStorage.list();
    }

    public async deleteGameData(id: string): Promise<void> {
        return this.saveStorage.delete(id);
    }

    private crashReason(type: string, detail: string): string {
        return `[${type}] ${detail}`;
    }

    private getFsFlags(): AppFsFlags {
        const baseDir = path.resolve(this.getUserDataDir(), AppDataNamespace.flags);
        return {
            crash: new FsFlag(path.join(baseDir, "crash")),
        };
    }

    private async consumeCrashReport(): Promise<CrashReport | null> {
        const isCrashed = await this.flags.crash.hasFlag();
        if (!isCrashed) {
            return null;
        }

        const result = await this.flags.crash.readFlag();
        await this.flags.crash.unflag();
        return result;
    }

    private async prepareCrashHelper() {
        const report = await this.consumeCrashReport();
        if (report) {
            this.crashReport = report;
        }

        if (this.devState.wsClient) {
            console.log("[Main] Found crash report", this.crashReport);
        }

        process.on("uncaughtException", (err) => {
            this.crash(this.crashReason(
                "MainProcessUncaughtException",
                err.message,
            ));
        });
    }

    private getSavedGameMetadata(save: SavedGame, type: SaveType, id: string, preview?: string): SavedGameMetadata {
        return {
            created: save.meta.created,
            updated: Date.now(),
            id,
            type,
            capture: preview,
        };
    }

    private prepareMainWindow(win: AppWindow): this {
        const config = this.getConfig();
        if (config.appIcon) {
            if (path.isAbsolute(config.appIcon)) {
                throw new Error("App icon path must be relative to the app directory");
            }
            if (!this.isPackaged()) {
                win.setIcon(path.resolve(this.getMetadata().rootDir, config.appIcon));
            } else {
                win.setIcon(path.resolve(this.getAppPath(), "../", config.appIcon));
            }
        }

        win.onClose(() => {
            this.emitHook(HookEvents.AfterMainWindowClose);
        });

        return this;
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
            this.prepareDevMode();
        }

        this
            .prepareMenu()
            .prepareWebAssets();
        this.electronApp.whenReady().then(async () => {
            await this.prepareCrashHelper();
            this.emit(App.Events.Ready);
            this.emitHook(HookEvents.AfterReady);
        });
        process.on("unhandledRejection", async (reason) => {
            if (this.isPackaged()) {
                dialog.showErrorBox(this.t("app:crashed_critical_title"), this.t("app:crashed_critical_message") + "\n\n" + reason);
                this.crash(this.crashReason(
                    "MainProcessUnhandledRejection",
                    reason instanceof Error ? reason.message : String(reason),
                ));
            } else {
                console.error("Unhandled Rejection:", reason);
            }
        });
    }

    private prepareDevMode(): this {
        this.devState.wsClient = Client.construct<DevServerEvents>("localhost",
            process.env[ENV_DEV_SERVER_PORT] ? Number(process.env[ENV_DEV_SERVER_PORT]) : DefaultDevServerPort
        ).connect();

        this.devState.wsClient.onMessage(DevServerEvent.RequestMainQuit, () => {
            this.devState.wsClient!.close();
            this.quit();
        });
        this.devState.wsClient.onMessage(DevServerEvent.RequestPageRefresh, () => {
            if (this.mainWindow) {
                this.mainWindow.reload();
            } else {
                console.log("Warning: Main window is not available when trying to refresh");
            }
        });

        this.hook(HookEvents.AfterMainWindowClose, () => {
            this.timeout(() => {
                console.warn("[Main] Main window life cycle violation detected. " +
                    "You should clean up all side effects and call app.quit() when the main window is closed. " +
                    "This usually happens when you forget to add a listener to the onClose event of the main window. " +
                    "Try use win.onClose(() => { app.quit(); }) to prevent this from happening.");
                console.warn("[Main] LifeCycleViolationWarning will only be shown in development mode. In production mode, not quitting the app after the main window may have these unexpected consequences:");
                console.warn("[Main] - The app may still be running in the background");
                console.warn("[Main] - The app may still be consuming resources");
                console.warn("[Main] - The app may still lock some resources");
                console.warn(`[Main] Quitting the app...`);
                this.quit();
            }, App.Constants.AppLifeCycleViolationTimeout);
        });

        this.electronApp.setPath("userData", path.join(this.getAppPath(), "userData-dev"));

        return this;
    }

    private prepareMenu(): this {
        const menu = Menu.buildFromTemplate([] satisfies Electron.MenuItemConstructorOptions[]);
        Menu.setApplicationMenu(menu);

        return this;
    }

    private prepareWebAssets(): this {
        protocol.registerSchemesAsPrivileged([
            {scheme: AppProtocol, privileges: {standard: true, secure: true, supportFetchAPI: true, corsEnabled: true}},
        ]);
        this.assets.addRule({
            include: (requested) => {
                const url = new URL(requested);
                return url.protocol === AppProtocol + ":" && url.hostname === AppHost.Public;
            },
            handler: (requested) => {
                return {
                    path: url.format({
                        protocol: "file",
                        pathname: normalizePath(path.join(this.getPublicDir(), new URL(requested).pathname)),
                        slashes: true,
                    }),
                    noCache: false,
                };
            }
        }).addRule({
            include: (requested) => {
                const url = new URL(requested);
                return url.protocol === AppProtocol + ":" && url.hostname === AppHost.Root;
            },
            handler: (requested) => {
                return {
                    path: url.format({
                        protocol: "file",
                        pathname: normalizePath(path.join(this.getAppPath(), new URL(requested).pathname)),
                        slashes: true,
                    }),
                    noCache: false,
                };
            }
        }).addRule({
            include: (requested) => {
                const url = new URL(requested);
                return url.protocol === AppProtocol + ":" && url.hostname === AppHost.Renderer;
            },
            handler: (requested): AssetResolved => {
                return {
                    path: url.format({
                        protocol: "file",
                        pathname: normalizePath(path.join(this.getRendererBuildDir(), new URL(requested).pathname)),
                        slashes: true,
                    }),
                    noCache: true,
                };
            }
        });
        this.hook(HookEvents.AfterReady, () => {
            protocol.handle(AppProtocol, async (request) => {
                console.log("[Host] Requesting URL caught", request.url);

                const newUrl = this.assets.resolve(request.url);
                if (!newUrl) {
                    console.log("[Host] 404 URL not resolved", request.url);
                    return new Response(null, {
                        status: 404,
                        statusText: "Not Found",
                    });
                }

                console.log("[Host] URL resolved to", newUrl.path, ...[newUrl.noCache ? ["(no cache)"] : []]);
                const {data, mimeType} = await this.readFile(fileURLToPath(newUrl.path));
                return new Response(data, {
                    headers: new Headers({
                        "Content-Type": mimeType,
                        ...(newUrl.noCache ? {"Cache-Control": "no-cache"} : {}),
                    }),
                });
            });
        });
        return this;
    }

    private hook(event: HookEvents, fn: (...args: any[]) => void): AppEventToken {
        if (!this.hooks[event]) {
            this.hooks[event] = [];
        }
        this.hooks[event]?.push(fn);

        return {
            cancel: () => {
                this.hooks[event] = this.hooks[event]?.filter((f) => f !== fn);
            }
        };
    }

    private onceHook(event: HookEvents, fn: (...args: any[]) => void): AppEventToken {
        const token = this.hook(event, (...args) => {
            token.cancel();
            fn(...args);
        });

        return token;
    }

    private unhook(event: HookEvents, fn: (...args: any[]) => void): void {
        this.hooks[event] = this.hooks[event]?.filter((f) => f !== fn);
    }

    private emitHook(event: HookEvents, ...args: any[]): void {
        this.hooks[event]?.forEach((fn) => {
            fn(...args);
        });
    }

    private async fetchMetadata() {
        if (!this.devState.wsClient) {
            throw new Error("Dev server is only available in development mode");
        }
        await this.devState.wsClient.forSocketToOpen();

        const data = await this.devState.wsClient.fetch(DevServerEvent.FetchMetadata, {});
        console.log("[Main] Fetching metadata");

        this.metadata = data;
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

    private getMetadata(): AppMeta {
        if (!this.metadata) {
            throw new Error("Metadata is not available");
        }

        return this.metadata;
    }

    private emit<K extends StringKeyOf<AppEvents>>(event: K, ...args: AppEvents[K]): void {
        this.events.emit(event, ...args as any);
    }

    private schedule(fn: () => void): {
        cancel(): void;
    } {
        this.schedules.push(fn);
        return {
            cancel: () => {
                this.schedules = this.schedules.filter((f) => f !== fn);
                fn();
            }
        };
    }

    private timeout(fn: () => void, ms: number): VoidFunction {
        const token = setTimeout(() => {
            fn();
        }, ms);
        return () => {
            clearTimeout(token);
        };
    }
}

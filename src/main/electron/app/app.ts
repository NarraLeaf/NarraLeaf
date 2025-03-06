import path from "path";
import {app, Menu, protocol} from "electron";
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
import {LocalAssets} from "@/main/electron/app/assets";
import url, {fileURLToPath} from "url";
import {normalizePath} from "@/utils/nodejs/string";
import {Fs} from "@/utils/nodejs/fs";
import {getMimeType} from "@/utils/nodejs/os";

type AppEvents = {
    "ready": [];
};

export type AppEventToken = {
    cancel(): void;
};

export type AppMeta = {
    publicDir: string;
};

enum HookEvents {
    AfterReady = "afterReady",
}

export class App {
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
    private hooks: {
        [K in HookEvents]?: Array<(...args: any[]) => void>;
    } = {};
    private assets: LocalAssets = new LocalAssets();
    private metadata: AppMeta | null = null;

    constructor(public config: AppConfig) {
        this.electronApp = app;
        this.platform = Platform.getInfo(process);

        this.prepare();
    }

    onReady(fn: (...args: AppEvents["ready"]) => void): AppEventToken {
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

    public quit(): void {
        this.electronApp.quit();
    }

    public async launchApp(config: Partial<WindowConfig> = {}): Promise<AppWindow> {
        if (this.mainWindow) {
            throw new Error("Main window is already created");
        }

        await this.fetchMetadata();

        const win = new AppWindow(this, config, {
            preload: this.getPreloadScript(),
        });
        await win.loadFile(this.getEntryFile());
        await win.show();

        this.mainWindow = win;

        return win;
    }

    public isPackaged(): boolean {
        return this.electronApp.isPackaged;
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
        this.electronApp.whenReady().then(() => {
            this.events.emit(App.Events.Ready);
            this.emitHook(HookEvents.AfterReady);
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
                return url.format({
                    protocol: "file",
                    pathname: normalizePath(path.join(this.getPublicDir(), new URL(requested).pathname)),
                    slashes: true,
                });
            }
        }).addRule({
            include: (requested) => {
                const url = new URL(requested);
                return url.protocol === AppProtocol + ":" && url.hostname === AppHost.Root;
            },
            handler: (requested) => {
                return url.format({
                    protocol: "file",
                    pathname: normalizePath(path.join(this.getAppPath(), new URL(requested).pathname)),
                    slashes: true,
                });
            }
        }).addRule({
            include: (requested) => {
                const url = new URL(requested);
                return url.protocol === AppProtocol + ":" && url.hostname === AppHost.Renderer;
            },
            handler: (requested) => {
                return url.format({
                    protocol: "file",
                    pathname: normalizePath(path.join(this.getRendererBuildDir(), new URL(requested).pathname)),
                    slashes: true,
                });
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

                console.log("[Host] URL resolved to", newUrl);
                const {data, mimeType} = await this.readFile(fileURLToPath(newUrl));
                return new Response(data, {
                    headers: new Headers({
                        "Content-Type": mimeType,
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
}

import {app} from "electron";
import {AppConfig} from "@/main/electron/app/config";
import {EventEmitter} from "events";
import {AppWindow, WindowConfig} from "@/main/electron/app/appWindow";
import {
    DefaultDevServerPort,
    ENV_DEV_SERVER_PORT,
    PreloadFileName,
    RendererOutputHTMLFileName
} from "@core/build/constants";
import {CriticalMainProcessError} from "@/main/error/criticalError";
import {Platform, PlatformInfo, safeExecuteFn} from "@/utils/pure/os";
import {DevTempNamespace, TempNamespace} from "@core/constants/tempNamespace";
import path from "path";
import {reverseDirectoryLevels} from "@/utils/pure/string";
import {Client} from "@/utils/nodejs/websocket";
import {DevServerEvent, DevServerEvents} from "@core/dev/devServer";

type AppEvents = {
    "ready": [];
};

export type AppEventToken = {
    cancel(): void;
};

export class App {
    public static Events = {
        Ready: "ready"
    } as const;
    public readonly electronApp: Electron.App;
    public readonly events: EventEmitter<AppEvents> = new EventEmitter();
    public readonly platform: PlatformInfo;
    public devState: {
        wsClient: Client<DevServerEvents>
    } = {
        wsClient: null as any,
    };
    public mainWindow: AppWindow | null = null;

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

    prepare() {
        const config = this.config.getConfig(this.platform);
        if (!this.electronApp && !app) {
            throw new CriticalMainProcessError("Electron app is not available");
        }
        if (config.forceSandbox) {
            this.electronApp.enableSandbox();
        }
        if (!this.electronApp.isPackaged) {
            this.prepareDevMode();
        }
        this.electronApp.whenReady().then(() => {
            this.events.emit(App.Events.Ready);
        });
    }

    getPreloadScript(): string {
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

    public quit(): void {
        this.electronApp.quit();
    }

    public async launchApp(config: Partial<WindowConfig> = {}): Promise<AppWindow> {
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

    public prepareDevMode(): void {
        this.devState.wsClient = Client.construct<DevServerEvents>("localhost",
            process.env[ENV_DEV_SERVER_PORT] ? Number(process.env[ENV_DEV_SERVER_PORT]) : DefaultDevServerPort
        ).connect();

        this.devState.wsClient.onMessage(DevServerEvent.RequestMainQuit, () => {
            this.quit();
        });
        this.devState.wsClient.onMessage(DevServerEvent.RequestPageRefresh, () => {
            if (this.mainWindow) {
                this.mainWindow.reload();
            } else {
                console.log("Warning: Main window is not available when trying to refresh");
            }
        });
    }
}

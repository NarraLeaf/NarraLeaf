import {App, AppEventToken} from "@/main/electron/app/app";
import {BrowserWindow, WebPreferences, BaseWindowConstructorOptions} from "electron";
import _ from "lodash";
import {IPCHost} from "@/main/electron/data/ipcHost";
import {IpcEvent, Namespace} from "@core/ipc/events";
import {Platform} from "@/utils/pure/os";

export interface WindowConfig extends BaseWindowConstructorOptions {
    isolated: boolean;
    devTools?: boolean;
}

export interface AppWindowConfig {
    preload: string;
}

export class AppWindow {
    public static readonly DefaultConfig: WindowConfig = {
        isolated: true,
        backgroundColor: "#fff",
    }
    public readonly app: App;
    public readonly config: WindowConfig;
    public readonly appConfig: AppWindowConfig;
    public readonly win: BrowserWindow;
    public readonly ipc: IPCHost;

    constructor(app: App, config: Partial<WindowConfig>, appConfig: AppWindowConfig) {
        this.app = app;
        this.config = _.defaultsDeep(config, AppWindow.DefaultConfig);
        this.appConfig = appConfig;
        this.win = new BrowserWindow({
            webPreferences: this.getWebPreference(),
            ...this.config,
        });
        this.ipc = new IPCHost(Namespace.NarraLeaf);

        this.prepare();
    }

    private prepare() {
        this.ipc.onRequest(this, IpcEvent.getPlatform, async (_data) => {
            return {
                platform: Platform.getInfo(process),
                isPackaged: this.app.electronApp.isPackaged,
            };
        });
        this.ipc.onMessage(this, IpcEvent.app_terminate, async ({err}) => {
            if (err) {
                console.error("The App is terminating due to an error:");
                console.error(err);
            }
            this.app.electronApp.quit();
        });
    }

    getWebPreference(): WebPreferences {
        return {
            contextIsolation: this.config.isolated,
            preload: this.appConfig.preload,
        };
    }

    onClosed(fn: () => void): AppEventToken {
        this.win.on("closed", () => {
            fn();
        });
        return {
            cancel: () => {
                this.win.removeListener("closed", fn);
            }
        };
    }

    public getWebContents() {
        return this.win.webContents;
    }

    public reload() {
        this.win.reload();
    }

    public onKeyUp(key: KeyboardEvent["key"], fn: () => void): AppEventToken {
        const handler = (event: Electron.Event, input: Electron.Input) => {
            if (input.type === "keyUp" && input.key === key) {
                fn();
                event.preventDefault();
            }
        };
        this.getWebContents().on("before-input-event", handler);
        return {
            cancel: () => {
                this.getWebContents().removeListener("before-input-event", handler);
            }
        };
    }

    public toggleDevTools() {
        if (this.win.webContents.isDevToolsOpened()) {
            this.win.webContents.closeDevTools();
        }
        if (this.config.devTools) {
            this.win.webContents.openDevTools();
        }
    }

    public setIcon(icon: string) {
        this.win.setIcon(icon);
    }

    async show(): Promise<void> {
        return this.win.show();
    }

    async loadURL(url: string): Promise<void> {
        return this.win.loadURL(url);
    }

    async loadFile(file: string): Promise<void> {
        return this.win.loadFile(file);
    }

    public setTitle(title: string) {
        this.win.setTitle(title);
    }

    public getTitle(): string {
        return this.win.getTitle();
    }
}


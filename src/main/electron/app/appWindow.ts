import {App, AppEventToken} from "@/main/electron/app/app";
import {BaseWindowConstructorOptions, BrowserWindow, WebPreferences} from "electron";
import _ from "lodash";
import {IPCHost} from "@/main/electron/data/ipcHost";
import {IpcEvent, Namespace} from "@core/ipc/events";
import {Platform} from "@/utils/pure/os";
import {EventEmitter} from "events";
import {StringKeyOf} from "narraleaf-react/dist/util/data";

export interface WindowConfig extends BaseWindowConstructorOptions {
    isolated: boolean;
    devTools?: boolean;
}

export interface AppWindowConfig {
    preload: string;
}

type WindowEvents = {
    close: [];
};

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
    private events: EventEmitter<WindowEvents> = new EventEmitter<WindowEvents>();

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

    getWebPreference(): WebPreferences {
        return {
            contextIsolation: this.config.isolated,
            preload: this.appConfig.preload,
        };
    }

    onClose(fn: () => void): AppEventToken {
        const handler = () => {
            fn();
        };
        this.events.on("close", handler);
        return {
            cancel: () => {
                this.events.removeListener("close", handler);
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
        this.prepareEvents();
    }

    private prepareEvents() {
        this.win.on("close", () => {
            this.emit("close");
        });
    }

    private emit<K extends StringKeyOf<WindowEvents>>(event: K, ...args: WindowEvents[K]) {
        this.events.emit(event, ...args as any);
    }
}


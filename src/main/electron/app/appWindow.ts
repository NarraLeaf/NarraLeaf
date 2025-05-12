import { ClientAppConfiguration } from "@/core/@types/global";
import { App, AppEventToken } from "@/main/electron/app/app";
import { IPCHost } from "@/main/electron/data/ipcHost";
import { Platform } from "@/utils/pure/os";
import { SavedGame } from "@core/game/save";
import { IpcEvent, Namespace } from "@core/ipc/events";
import { BaseWindowConstructorOptions, BrowserWindow, WebPreferences } from "electron";
import { EventEmitter } from "events";
import _ from "lodash";
import { StringKeyOf } from "narraleaf-react/dist/util/data";
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
    public readonly eventHandlers: Record<string, ((payload: any) => Promise<any> | any) | undefined> = {};
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

    public onEvent<Request, Response>(event: string, fn: (payload: Request) => Promise<Response> | Response): AppEventToken {
        if (this.eventHandlers[event]) {
            console.warn(`[Main] Warning: Event ${event} already registered. Overriding.`);
        }
        this.eventHandlers[event] = fn;
        return {
            cancel: () => {
                this.eventHandlers[event] = undefined;
            }
        };
    }

    public isFullScreen(): boolean {
        return this.win.isFullScreen();
    }

    public enterFullScreen() {
        this.win.setFullScreen(true);
    }

    public exitFullScreen() {
        this.win.setFullScreen(false);
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
        if (this.config.devTools) {
            if (this.win.webContents.isDevToolsOpened()) {
                this.win.webContents.closeDevTools();
            } else {
                this.win.webContents.openDevTools();
            }
        } else {
            console.log("[Main] Warning: Trying to toggle dev tools with devTools disabled.");
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

    public getClientAppConfig(): ClientAppConfiguration {
        return {
            recoveryCreationInterval: this.app.getConfig().recoveryCreationInterval,
        };
    }

    private prepare() {
        this.ipc.onRequest(this, IpcEvent.getPlatform, async (_data) => {
            return {
                platform: Platform.getInfo(process),
                isPackaged: this.app.electronApp.isPackaged,
                crashReport: this.app.getCrashReport(),
                config: this.getClientAppConfig(),
            };
        });
        this.ipc.onMessage(this, IpcEvent.app_terminate, async ({err}) => {
            if (err) {
                const timestamp = new Date().toISOString();
                console.error("[Main] ERROR");
                console.error("[Main] ERROR The App is terminating due to an error:");
                console.error("[Main] ERROR " + err);
                console.error("[Main] ERROR App Crashed at " + timestamp);
                this.app.crash(err);
            } else {
                this.app.quit();
            }
        });
        this.ipc.onRequest(this, IpcEvent.game_save_save, async ({gameData, type, id, preview}) => {
            return this.ipc.tryUse(() => this.app.saveGameData(gameData as SavedGame, type, id, preview));
        });
        this.ipc.onRequest(this, IpcEvent.game_save_read, async ({id}) => {
            return this.ipc.tryUse(() => this.app.readGameData(id));
        });
        this.ipc.onRequest(this, IpcEvent.game_save_list, async () => {
            return this.ipc.tryUse(() => this.app.listGameData());
        });
        this.ipc.onRequest(this, IpcEvent.game_save_delete, async ({id}) => {
            return this.ipc.tryUse(() => this.app.deleteGameData(id));
        });
        this.ipc.onRequest(this, IpcEvent.app_event_request_main, async ({event, payload}) => {
            if (this.eventHandlers[event]) {
                try {
                    return {
                        success: true,
                        data: await this.eventHandlers[event](payload),
                    };
                } catch (error) {
                    return {success: false, error: error instanceof Error ? error.message : String(error)};
                }
            }
            return {success: false, error: `Event ${event} not found`};
        });
        this.prepareEvents();
    }

    private prepareEvents() {
        this.win.on("close", () => {
            this.emit("close");
        });
        this.win.webContents.on("render-process-gone", (event, details) => {
            if (!details.reason || details.reason === "clean-exit") {
                return;
            }
            this.app.crash(this.crashReason(
                details.reason,
                `Exit Code: ${details.exitCode}`
            ));
        });
    }

    private emit<K extends StringKeyOf<WindowEvents>>(event: K, ...args: WindowEvents[K]) {
        this.events.emit(event, ...args as any);
    }

    private crashReason(type: string, detail: string): string {
        return `[${type}] ${detail}`;
    }
}


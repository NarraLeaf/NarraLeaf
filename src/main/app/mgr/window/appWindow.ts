import { App } from "@/main/app/app";
import { ClientAppConfiguration } from "@/core/@types/global";
import { Namespace } from "@core/ipc/events";
import { IPCHandler } from "./handler/IPCHandler";
import { IPCEventType } from "@core/ipc/events";
import { WindowInstance, WindowInstanceConfig } from "./windowInstance";
import { WindowIPC } from "./windowIPC";
import { WindowEventManager } from "./windowEvents";
import { WindowProxy } from "./windowProxy";
import { WindowUserHandlers } from "./windowUserHandlers";
import { AppEventToken } from "../../types";

export interface WindowConfig {
    isolated: boolean;
    autoFocus: boolean;
    options?: Electron.BrowserWindowConstructorOptions;
}

export interface AppWindowConfig {
    preload: string;
}

export class AppWindow extends WindowProxy {
    public static readonly DefaultConfig: WindowConfig = {
        isolated: true,
        autoFocus: true,
        options: {
            backgroundColor: "#fff",
        }
    }

    constructor(app: App, config: Partial<WindowConfig>, appConfig: AppWindowConfig) {
        const instanceConfig: WindowInstanceConfig = {
            isolated: config.isolated ?? AppWindow.DefaultConfig.isolated,
            preload: appConfig.preload,
            options: config.options ?? AppWindow.DefaultConfig.options,
        };

        const instance = new WindowInstance(instanceConfig);
        const ipc = new WindowIPC(Namespace.NarraLeaf);
        const events = new WindowEventManager();
        const userHandlers = new WindowUserHandlers(app.logger);

        super(app, instance, ipc, events, userHandlers);

        this.initialize(app);
    }

    // Window Event Handling
    public registerIPCHandler<T extends IPCEventType>(handler: IPCHandler<T>): void {
        this.getIPC().registerHandler(this, handler);
    }

    public onClose(fn: () => void) {
        return this.getEvents().onClose(fn);
    }

    public onEvent<Request, Response>(event: string, fn: (payload: Request) => Promise<Response> | Response) {
        return this.getEvents().onEvent(event, fn);
    }

    // Web Content State Operations
    public isFullScreen(): boolean {
        return this.getInstance().isFullScreen();
    }

    public enterFullScreen(): void {
        this.getInstance().enterFullScreen();
    }

    public exitFullScreen(): void {
        this.getInstance().exitFullScreen();
    }

    public reload(): void {
        this.getInstance().reload();
    }

    // Developer Tools
    public toggleDevTools(): void {
        const webContents = this.getWebContents();
        if (webContents.isDevToolsOpened()) {
            webContents.closeDevTools();
        } else {
            webContents.openDevTools();
        }
    }

    // Window State Operations
    public setIcon(icon: string): void {
        this.getInstance().setIcon(icon);
    }

    public async show(): Promise<void> {
        return this.getInstance().show();
    }

    public async loadURL(url: string): Promise<void> {
        return this.getInstance().loadURL(url);
    }

    public async loadFile(file: string): Promise<void> {
        return this.getInstance().loadFile(file);
    }

    public setTitle(title: string): void {
        this.getInstance().setTitle(title);
    }

    public getTitle(): string {
        return this.getInstance().getTitle();
    }

    public getClientAppConfig(): ClientAppConfiguration {
        const config = this.getApp().getConfig();
        return {
            recoveryCreationInterval: config.recoveryCreationInterval,
            appErrorHandling: config.appErrorHandling,
        };
    }

    public onKeyUp(key: KeyboardEvent["key"], fn: (event: Electron.Event, input: Electron.Input) => void): AppEventToken {
        const handler = (event: Electron.Event, input: Electron.Input) => {
            if (input.type === "keyUp" && input.key === key) {
                fn(event, input);
            }
        };

        this.getWebContents().on("before-input-event", handler);
        return {
            cancel: () => {
                this.getWebContents().removeListener("before-input-event", handler);
            }
        };
    }

    private initialize(_app: App): void {
        this.prepareEvents();
    }

    private prepareEvents(): void {
        const win = this.getInstance().getBrowserWindow();
        
        win.on("close", () => {
            this.getEvents().emit("close");
        });

        win.webContents.on("render-process-gone", (_event, details) => {
            if (!details.reason || details.reason === "clean-exit") {
                return;
            }
            this.getEvents().emit("render-process-gone", details.reason, `Exit Code: ${details.exitCode}`);
        });
    }

    // Getters
    public get win() {
        return this.getInstance().getBrowserWindow();
    }

    public get app(): App {
        return this.getApp();
    }
}


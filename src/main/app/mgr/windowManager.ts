import { AppWindow, WindowConfig } from "./window/appWindow";
import { App, HookEvents } from "../app";
import path from "path";
import { AppMeta } from "../app";
import { AppTerminateHandler } from "./window/handler/appAction";
import { AppRequestMainEventHandler } from "./window/handler/appAction";
import { GameSaveGameHandler, GameReadGameHandler, GameListGameHandler, GameDeleteGameHandler } from "./window/handler/gameSave";

export class WindowManager {
    private mainWindow: AppWindow | null = null;

    constructor(
        private app: App,
    ) {}

    public initialize(): void {
    }

    public async launchMainWindow(config: Partial<WindowConfig> = {}): Promise<AppWindow> {
        const win = this.createMainWindow(config);
        await win.loadFile(this.app.getEntryFile());
        await win.show();
        return win;
    }

    public createMainWindow(config: Partial<WindowConfig>): AppWindow {
        if (this.mainWindow) {
            throw new Error("Main window is already created");
        }

        const win = new AppWindow(this.app, config, {
            preload: this.app.getPreloadScript(),
        });

        this.setAppIcon(win);
        this.registerIPCHandlers(win);
        
        this.setMainWindow(win);

        win.onClose(() => {
            this.app.emitHook(HookEvents.AfterMainWindowClose);
        });

        return win;
    }

    public getMainWindow(): AppWindow | null {
        return this.mainWindow;
    }

    public closeMainWindow(): void {
        if (this.mainWindow) {
            this.mainWindow.win.close();
            this.mainWindow = null;
        }
    }

    private setAppIcon(win: AppWindow): void {
        const config = this.app.getConfig();
        if (config.appIcon) {
            if (path.isAbsolute(config.appIcon)) {
                throw new Error("App icon path must be relative to the app directory");
            }
            if (!this.app.isPackaged()) {
                const metadata = this.app.devToolManager.getMetadata();
                
                win.setIcon(path.resolve(metadata?.rootDir ?? "", config.appIcon));
            } else {
                win.setIcon(path.resolve(this.app.getAppPath(), "../", config.appIcon));
            }
        }
    }

    private registerIPCHandlers(win: AppWindow): void {
        win.registerIPCHandler(new AppTerminateHandler());
        win.registerIPCHandler(new AppRequestMainEventHandler());

        win.registerIPCHandler(new GameSaveGameHandler());
        win.registerIPCHandler(new GameReadGameHandler());
        win.registerIPCHandler(new GameListGameHandler());
        win.registerIPCHandler(new GameDeleteGameHandler());
    }

    private setMainWindow(win: AppWindow): void {
        if (this.mainWindow) {
            throw new Error("Main window is already created");
        }
        this.mainWindow = win;
    }
} 
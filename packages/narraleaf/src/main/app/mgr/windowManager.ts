import { EventEmitter } from "events";
import path from "path";
import { App, HookEvents } from "../app";
import { AppWindow, WindowConfig } from "./window/appWindow";
import { AppReloadHandler, AppRequestMainEventHandler, AppTerminateHandler } from "./window/handler/appAction";
import { AppInfoHandler } from "./window/handler/appInfo";
import { AppGetStateHandler, AppSaveStateHandler } from "./window/handler/appStore";
import { GameDeleteGameHandler, GameListGameHandler, GameReadGameHandler, GameSaveGameHandler } from "./window/handler/gameSave";

type WindowManagerEvents = {
    "window-created": [window: AppWindow];
    "window-ready": [window: AppWindow];
}

export class WindowManager {
    private mainWindow: AppWindow | null = null;
    private windows: AppWindow[] = [];

    public events: EventEmitter<WindowManagerEvents>;

    constructor(
        private app: App,
    ) {
        this.events = new EventEmitter();
    }

    public initialize(): void {
    }

    public async launchMainWindow(config: Partial<WindowConfig> = {}): Promise<AppWindow> {
        const win = this.createMainWindow(config);
        
        // Check if HTTP dev server mode is enabled
        if (this.app.isHttpDevServerMode()) {
            const url = this.app.getEntryFile();
            this.app.logger.info(`[WindowManager] Loading URL in HTTP mode: ${url}`);
            try {
                await win.loadURL(url);
                this.app.logger.info(`[WindowManager] Successfully loaded URL: ${url}`);
            } catch (error) {
                this.app.logger.error(`[WindowManager] Failed to load URL: ${url}`, error);
                throw error;
            }
        } else {
            const filePath = this.app.getEntryFile();
            this.app.logger.info(`[WindowManager] Loading file in file mode: ${filePath}`);
            try {
                await win.loadFile(filePath);
                this.app.logger.info(`[WindowManager] Successfully loaded file: ${filePath}`);
            } catch (error) {
                this.app.logger.error(`[WindowManager] Failed to load file: ${filePath}`, error);
                throw error;
            }
        }

        this.events.emit("window-created", win);
        
        await win.show();

        this.events.emit("window-ready", win);

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

    public createWindow(config: Partial<WindowConfig>): AppWindow {
        const win = new AppWindow(this.app, config, {
            preload: this.app.getPreloadScript(),
        });
        this.windows.push(win);

        this.registerIPCHandlers(win);

        this.events.emit("window-created", win);
        this.events.emit("window-ready", win);
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

    public unregisterWindow(win: AppWindow): void {
        this.windows = this.windows.filter(w => w !== win);
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
        win.registerIPCHandler(new AppInfoHandler());
        win.registerIPCHandler(new AppTerminateHandler());
        win.registerIPCHandler(new AppRequestMainEventHandler());
        win.registerIPCHandler(new AppReloadHandler());
        win.registerIPCHandler(new AppGetStateHandler());
        win.registerIPCHandler(new AppSaveStateHandler());

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
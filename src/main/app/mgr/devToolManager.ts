import { app } from "electron";
import { Client } from "@/utils/nodejs/websocket";
import { DevServerEvent, DevServerEvents } from "@core/dev/devServer";
import { DefaultDevServerPort, ENV_DEV_SERVER_PORT } from "@core/build/constants";
import { App } from "@/main/app/app";
import path from "path";
import { DevTempNamespace } from "@core/constants/tempNamespace";

export class DevToolManager {
    private wsClient: Client<DevServerEvents> | null = null;
    private metadata: { rootDir: string; publicDir: string } | null = null;
    private initialized: boolean = false;

    constructor(private app: App) {
    }


    public initialize(): void {
        if (!this.app.isPackaged()) {
            return;
        }

        if (this.initialized) {
            return;
        }
        this.initialized = true;

        this.setupDevServer();
        this.setupDevUserData();
    }

    private setupDevServer(): void {
        this.wsClient = Client.construct<DevServerEvents>(
            "localhost",
            process.env[ENV_DEV_SERVER_PORT] 
                ? Number(process.env[ENV_DEV_SERVER_PORT]) 
                : DefaultDevServerPort
        ).connect();

        this.setupDevServerHandlers();
    }

    private setupDevServerHandlers(): void {
        if (!this.wsClient) return;

        this.wsClient.onMessage(DevServerEvent.RequestMainQuit, () => {
            this.wsClient?.close();
            app.quit();
        });

        this.wsClient.onMessage(DevServerEvent.RequestPageRefresh, () => {
            const mainWindow = this.app.windowManager.getMainWindow();
            if (mainWindow) {
                mainWindow.reload();
            } else {
                console.log("Warning: Main window is not available when trying to refresh");
            }
        });
    }

    private setupDevUserData(): void {
        app.setPath("userData", path.join(this.app.getAppPath(), "userData-dev"));
    }

    public async fetchMetadata(): Promise<void> {
        if (!this.wsClient) {
            throw new Error("Dev server is only available in development mode");
        }

        await this.wsClient.forSocketToOpen();
        const data = await this.wsClient.fetch(DevServerEvent.FetchMetadata, {});
        console.log("[Main] Fetching metadata");
        this.metadata = data;
    }

    public getMetadata(): { rootDir: string; publicDir: string } {
        if (!this.metadata) {
            throw new Error("Metadata is not available");
        }
        return this.metadata;
    }

    public tryGetMetadata(): { rootDir: string; publicDir: string } | null {
        if (!this.metadata) {
            return null;
        }
        return this.metadata;
    }

    public getDevServerClient(): Client<DevServerEvents> | null {
        return this.wsClient;
    }

    public setupLifecycleViolationWarning(timeout: number): void {
        const mainWindow = this.app.windowManager.getMainWindow();
        if (!mainWindow) {
            this.app.logger.warn("[Main] Main window is not available when trying to setup lifecycle violation warning");
            return;
        }

        mainWindow.onClose(() => {
            setTimeout(() => {
                this.app.logger.warn("Main window life cycle violation detected. " +
                    "You should clean up all side effects and call app.quit() when the main window is closed. " +
                    "This usually happens when you forget to add a listener to the onClose event of the main window. " +
                    "Try use win.onClose(() => { app.quit(); }) to prevent this from happening.");
                this.app.logger.warn("LifeCycleViolationWarning will only be shown in development mode. In production mode, not quitting the app after the main window may have these unexpected consequences:");
                this.app.logger.warn("- The app may still be running in the background");
                this.app.logger.warn("- The app may still be consuming resources");
                this.app.logger.warn("- The app may still lock some resources");
                this.app.logger.warn(`Quitting the app...`);
                app.quit();
            }, timeout);
        });
    }

    public cleanup(): void {
        if (this.wsClient) {
            this.wsClient.close();
            this.wsClient = null;
        }
    }
}

import {RendererProject} from "@core/project/renderer/rendererProject";
import {ElectronDevServerToken} from "@core/dev/electron";
import {Server, WSEventType} from "@/utils/nodejs/websocket";
import {AppMeta} from "@/main/electron/app/app";

export type DevServerToken = {
    close(): Promise<void>;
};

export type ClosableToken = {
    close(): Promise<void>;
};

export enum DevServerEvent {
    RequestPageRefresh = "narraleaf_dev:request_page_refresh",
    RequestMainQuit = "narraleaf_dev:request_main_quit",
    FetchMetadata = "narraleaf_dev:fetch_metadata",
}

export type DevServerEvents = {
    [DevServerEvent.RequestPageRefresh]: {
        type: WSEventType.Message;
        data: {};
    };
    [DevServerEvent.RequestMainQuit]: {
        type: WSEventType.Message;
        data: {};
    };
    [DevServerEvent.FetchMetadata]: {
        type: WSEventType.Message;
        data: {};
        response: AppMeta;
    };
};

export class DevServer {
    electronToken: ElectronDevServerToken | null = null;
    mainToken: ClosableToken | null = null;
    rendererToken: ClosableToken | null = null;
    wsServer: Server<DevServerEvents> | null = null;

    constructor(public renderer: RendererProject) {
    }

    async start(): Promise<void> {
        if (this.electronToken) {
            throw new Error("Dev server is already running");
        }

        const project = this.renderer.project;
        const logr = project.app.createLogger();

        const [mainToken, rendererToken] = await Promise.all([
            await project.watchMain(async () => {
                logr.info("Requesting main process to quit");
                this.wsServer?.announce<DevServerEvent.RequestMainQuit>(DevServerEvent.RequestMainQuit, {});
                await this.restart();
                logr.info("Main process restarted");
            }),
            await project.watchRenderer(this.renderer, () => {
                logr.info("Requesting renderer process to refresh");
                this.wsServer?.announce<DevServerEvent.RequestPageRefresh>(DevServerEvent.RequestPageRefresh, {});
            }),
        ]);
        this.mainToken = mainToken;
        this.rendererToken = rendererToken;
        logr.info("Watching main and renderer processes");

        this.electronToken = await project.electron();
        logr.info("Watching electron App");

        this.wsServer = new Server<DevServerEvents>({
            port: project.config.dev.port,
        }).start();
        this.wsServer.onConnection(() => {
            logr.info("Dev client attached, number of clients: ", this.wsServer?.wss?.clients.size || 0);
        });
        this.wsServer.onDisconnect(() => {
            logr.info("Dev client detached, number of clients remaining: ", this.wsServer?.wss?.clients.size || 0);
        });

        this.listen();
    }

    async stop(): Promise<void> {
        if (this.electronToken) {
            await Promise.all([
                this.mainToken?.close(),
                this.rendererToken?.close(),
            ]);
            await this.electronToken.close();
            this.electronToken = null;
            this.mainToken = null;
            this.rendererToken = null
        }
        if (this.wsServer) {
            this.wsServer.close();
            this.wsServer = null;
        }
    }

    async restart(): Promise<void> {
        if (!this.electronToken) {
            throw new Error("Dev server is not running when trying to restart");
        }

        await this.electronToken.restart();
    }

    onTerminate(process: NodeJS.Process, callback: () => void = () => {
    }): Promise<void> {
        return new Promise((resolve) => {
            if (!this.electronToken) {
                throw new Error("Dev server is not running when trying to listen for termination");
            }
            let terminated = false;
            process.on("SIGINT", async () => {
                if (terminated) {
                    return;
                }
                callback();
                resolve();
                terminated = true;
            });
        });
    }

    listen() {
        this.wsServer?.onConnection((ws) => {
            this.wsServer?.onMessage(DevServerEvent.FetchMetadata, () => {
                return {
                    publicDir: this.renderer.getPublicDir(),
                };
            }, ws);
        });
    }
}

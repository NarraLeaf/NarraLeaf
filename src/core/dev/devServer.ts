import {RendererProject} from "@core/project/renderer/rendererProject";
import {ElectronDevServerToken} from "@core/dev/electron";
import {Server, WSEventType} from "@/utils/nodejs/websocket";
import {AppMeta} from "@/main/app/app";
import {createServer, IncomingMessage, ServerResponse} from "http";
import {readFile, stat} from "fs/promises";
import path from "path";
import {getMimeType} from "@/utils/nodejs/os";
import {DevTempNamespace} from "@core/constants/tempNamespace";
import { AppHost, DefaultDevHTTPServerPort } from "../build/constants";

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
    httpServer: any = null;

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

        // Check if HTTP dev server mode is enabled
        const isHttpMode = project.config.renderer.httpDevServer;
        
        if (isHttpMode) {
            // Start HTTP server for static file serving
            await this.startHttpServer();
            logr.info(`HTTP dev server started on port ${project.config.renderer.httpDevServerPort}`);
        }

        this.wsServer = new Server<DevServerEvents>({
            port: project.config.dev.port,
        }).start();
        this.wsServer.onConnection(() => {
            logr.info("Dev client attached, number of clients: ", this.wsServer?.wss?.clients.size || 0);
        });
        this.wsServer.onDisconnect(() => {
            logr.info("Dev client detached, number of clients remaining: ", this.wsServer?.wss?.clients.size || 0);
        });

        // Send HTTP mode configuration to main process
        this.wsServer.announce<DevServerEvent.FetchMetadata>(DevServerEvent.FetchMetadata, {
            publicDir: this.renderer.getPublicDir(),
            rootDir: this.renderer.project.getRootDir(),
            httpMode: {
                enabled: isHttpMode,
                port: project.config.renderer.httpDevServerPort,
            },
        });

        this.listen();
    }

    private async startHttpServer(): Promise<void> {
        const project = this.renderer.project;
        const rendererBuildDir = project.getDevTempDir(DevTempNamespace.RendererBuild);
        const publicDir = this.renderer.getPublicDir();
        
        console.log(`[HTTP Server] Starting on port ${project.config.renderer.httpDevServerPort}`);
        console.log(`[HTTP Server] Renderer build dir: ${rendererBuildDir}`);
        console.log(`[HTTP Server] Public dir: ${publicDir}`);
        
        // Create HTTP server
        this.httpServer = createServer(async (req: IncomingMessage, res: ServerResponse) => {
            try {
                if (!req.url) {
                    console.log(`[HTTP Server] No URL provided`);
                    res.writeHead(404);
                    res.end("Not Found");
                    return;
                }

                console.log(`[HTTP Server] Request: ${req.url}`);

                let filePath: string;
                
                // Handle public files
                if (req.url.startsWith(`/${AppHost.DevServer}/`)) {
                    filePath = path.join(rendererBuildDir, req.url.substring(AppHost.DevServer.length + 1));
                    console.log(`[HTTP Server] DevServer file: ${filePath}`);
                } else {
                    // Handle renderer files
                    filePath = path.join(publicDir, req.url);
                    console.log(`[HTTP Server] Public file: ${filePath}`);
                }

                // Check if file exists
                let fileStat;
                try {
                    fileStat = await stat(filePath);
                } catch (error) {
                    console.log(`[HTTP Server] File not found: ${filePath}`);
                    res.writeHead(404);
                    res.end("Not Found");
                    return;
                }

                // If it's a directory, try to serve index.html
                if (fileStat.isDirectory()) {
                    console.log(`[HTTP Server] Directory requested: ${filePath}`);
                    const indexPath = path.join(filePath, "index.html");
                    try {
                        await stat(indexPath);
                        filePath = indexPath;
                        console.log(`[HTTP Server] Serving index.html: ${indexPath}`);
                    } catch (error) {
                        console.log(`[HTTP Server] No index.html in directory: ${filePath}`);
                        res.writeHead(404);
                        res.end("Not Found");
                        return;
                    }
                }

                // Double check that we have a file, not a directory
                const finalStat = await stat(filePath);
                if (finalStat.isDirectory()) {
                    console.log(`[HTTP Server] Still a directory after processing: ${filePath}`);
                    res.writeHead(404);
                    res.end("Not Found");
                    return;
                }

                // Read and serve file
                console.log(`[HTTP Server] Reading file: ${filePath}`);
                const content = await readFile(filePath);
                const mimeType = getMimeType(filePath);
                
                console.log(`[HTTP Server] Serving file: ${filePath} (${mimeType}, ${content.length} bytes)`);
                res.writeHead(200, {
                    "Content-Type": mimeType,
                    "Content-Length": content.length.toString(),
                    "Cache-Control": "public, max-age=180, immutable"
                });
                res.end(content);
            } catch (error) {
                console.error(`[HTTP Server] Error processing request ${req.url}:`, error);
                res.writeHead(500);
                res.end("Internal Server Error");
            }
        });
        
        return new Promise((resolve, reject) => {
            this.httpServer.listen(project.config.renderer.httpDevServerPort, () => {
                console.log(`[HTTP Server] Started successfully on port ${project.config.renderer.httpDevServerPort}`);
                resolve();
            });
            
            this.httpServer.on("error", (error: Error) => {
                console.error(`[HTTP Server] Failed to start:`, error);
                reject(error);
            });
        });
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
        if (this.httpServer) {
            this.httpServer.close();
            this.httpServer = null;
        }
    }

    async restart(): Promise<void> {
        const project = this.renderer.project;
        const logr = project.app.createLogger();
        if (!this.electronToken) {
            // throw new Error("Dev server is not running when trying to restart");
            logr.warn("Dev server is not running when trying to restart");
            return;
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
                const isHttpMode = this.renderer.project.config.renderer.httpDevServer;
                const devPort = this.renderer.project.config.renderer.httpDevServerPort ?? DefaultDevHTTPServerPort;
                
                return {
                    publicDir: this.renderer.getPublicDir(),
                    rootDir: this.renderer.project.getRootDir(),
                    httpMode: {
                        enabled: isHttpMode,
                        port: devPort,
                    },
                };
            }, ws);
        });
    }
}

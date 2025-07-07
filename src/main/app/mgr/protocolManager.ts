import { protocol } from "electron";
import { AppProtocol, AppHost } from "@core/build/constants";
import { App } from "../app";
import { FileSystemHandler } from "./protocol/fileSystemHandler";
import { ProtocolHandler, ProtocolManager as IProtocolManager } from "./protocol/types";

export class ProtocolManager implements IProtocolManager {
    private handlers: ProtocolHandler[] = [];
    private initialized: boolean = false;

    constructor(private app: App) { }

    public initialize(): void {
        if (this.initialized) {
            return;
        }
        this.initialized = true;

        this.setupFileSystemHandlers();
        this.setupProtocolHandler();
        this.app.events.once(App.Events.Ready, () => {
            this.startHandling();
        });
    }

    private startHandling(): void {
        // Setup protocol handler
        protocol.handle(AppProtocol, async (request) => {
            console.log("[Host] Requesting URL caught", request.url);

            const url = new URL(request.url);
            const handler = this.getHandler(url);

            if (!handler) {
                console.log("[Host] 404 No handler found for URL", request.url);
                return new Response(null, {
                    status: 404,
                    headers: new Headers()
                });
            }

            try {
                const response = await handler.handle(request);
                // Handle response data
                let body: BodyInit | null = null;

                if (response.data) {
                    if (response.data instanceof Buffer) {
                        body = response.data;
                    } else if (typeof response.data === 'string') {
                        body = response.data;
                    } else if (response.data instanceof ReadableStream) {
                        body = response.data;
                    }
                }

                // Convert headers to Headers object
                const headers = new Headers();
                if (response.headers) {
                    Object.entries(response.headers).forEach(([key, value]) => {
                        if (Array.isArray(value)) {
                            value.forEach(v => headers.append(key, v));
                        } else {
                            headers.set(key, value);
                        }
                    });
                }

                return new Response(body, {
                    status: response.statusCode,
                    headers
                });
            } catch (error) {
                console.error("[Host] Error handling request:", error);
                return new Response(null, {
                    status: 500,
                    headers: new Headers()
                });
            }
        });
    }

    private setupFileSystemHandlers(): void {
        // Public assets handler
        const publicHandler = new FileSystemHandler(
            AppProtocol,
            { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true },
            () => this.app.getPublicDir(),
            AppHost.Public
        );
        publicHandler.addRule({
            include: (requested) => {
                const url = new URL(requested);
                return url.protocol === AppProtocol + ":" && url.hostname === AppHost.Public;
            },
            handler: (requested) => ({
                path: publicHandler.formatFileUrl(requested),
                noCache: false,
            })
        });
        this.registerHandler(publicHandler);

        // Root assets handler
        const rootHandler = new FileSystemHandler(
            AppProtocol,
            { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true },
            () => this.app.getAppPath(),
            AppHost.Root
        );
        rootHandler.addRule({
            include: (requested) => {
                const url = new URL(requested);
                return url.protocol === AppProtocol + ":" && url.hostname === AppHost.Root;
            },
            handler: (requested) => ({
                path: rootHandler.formatFileUrl(requested),
                noCache: false,
            })
        });
        this.registerHandler(rootHandler);

        // Renderer assets handler
        const rendererHandler = new FileSystemHandler(
            AppProtocol,
            { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true },
            () => this.app.getRendererBuildDir(),
            AppHost.Renderer,
            true
        );
        rendererHandler.addRule({
            include: (requested) => {
                const url = new URL(requested);
                return url.protocol === AppProtocol + ":" && url.hostname === AppHost.Renderer;
            },
            handler: (requested) => ({
                path: rendererHandler.formatFileUrl(requested),
                noCache: true,
            })
        });
        this.registerHandler(rendererHandler);
    }

    private setupProtocolHandler(): void {
        // Register all schemes
        const schemes = this.handlers.map(handler => ({
            scheme: handler.scheme,
            privileges: handler.privileges
        }));
        protocol.registerSchemesAsPrivileged(schemes);
    }

    public registerHandler(handler: ProtocolHandler): void {
        this.handlers.push(handler);
    }

    public unregisterHandler(scheme: string): void {
        this.handlers = this.handlers.filter(h => h.scheme !== scheme);
    }

    public getHandler(url: URL): ProtocolHandler | undefined {
        return this.handlers.find(handler => handler.canHandle(url));
    }
} 
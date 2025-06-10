import { protocol } from "electron";
import { AppProtocol, AppHost } from "@core/build/constants";
import { App } from "../app";
import { FileSystemHandler } from "./protocol/fileSystemHandler";
import { ProtocolHandler, ProtocolManager as IProtocolManager } from "./protocol/types";

export class ProtocolManager implements IProtocolManager {
    private handlers: Map<string, ProtocolHandler> = new Map();

    constructor(private app: App) {
        this.initializeProtocol();
    }

    private initializeProtocol(): void {
        this.setupFileSystemHandlers();
        this.setupProtocolHandler();
    }

    private setupFileSystemHandlers(): void {
        // Public assets handler
        const publicHandler = new FileSystemHandler(
            AppProtocol,
            { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true },
            this.app.getPublicDir(),
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
            this.app.getAppPath(),
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
            this.app.getRendererBuildDir(),
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
        const schemes = Array.from(this.handlers.values()).map(handler => ({
            scheme: handler.scheme,
            privileges: handler.privileges
        }));
        protocol.registerSchemesAsPrivileged(schemes);

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

    public registerHandler(handler: ProtocolHandler): void {
        this.handlers.set(handler.scheme, handler);
    }

    public unregisterHandler(scheme: string): void {
        this.handlers.delete(scheme);
    }

    public getHandler(url: URL): ProtocolHandler | undefined {
        return this.handlers.get(url.protocol.replace(":", ""));
    }
} 
export interface ProtocolScheme {
    scheme: string;
    privileges: {
        standard?: boolean;
        secure?: boolean;
        supportFetchAPI?: boolean;
        corsEnabled?: boolean;
        stream?: boolean;
        allowServiceWorkers?: boolean;
    };
}

export interface ProtocolResponse {
    statusCode: number;
    headers: Record<string, string | string[]>;
    data: string | Buffer | ReadableStream<Uint8Array> | undefined;
}

export interface ProtocolHandler {
    readonly scheme: string;
    readonly privileges: ProtocolScheme["privileges"];
    canHandle(url: URL): boolean;
    handle(request: Request): Promise<ProtocolResponse>;
}

export interface AssetResolver {
    resolve(url: string): AssetResolved | null;
}

export interface AssetResolved {
    path: string;
    noCache: boolean;
}

export interface ProtocolRule {
    include: string | RegExp | ((requested: string) => boolean);
    exclude?: string | RegExp | ((requested: string) => boolean);
    handler: (requested: string) => AssetResolved;
}

export interface ProtocolManager {
    registerHandler(handler: ProtocolHandler): void;
    unregisterHandler(scheme: string): void;
    getHandler(url: URL): ProtocolHandler | undefined;
} 
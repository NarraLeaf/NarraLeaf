import { Fs } from "@/utils/nodejs/fs";
import { getMimeType } from "@/utils/nodejs/os";
import { normalizePath } from "@/utils/nodejs/string";
import { createReadStream } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { AssetResolved, AssetResolver, ProtocolHandler, ProtocolResponse, ProtocolRule, ProtocolScheme } from "./types";

export class FileSystemHandler implements ProtocolHandler, AssetResolver {
    private rules: ProtocolRule[] = [];

    constructor(
        public readonly scheme: string,
        public readonly privileges: ProtocolScheme["privileges"],
        private readonly baseDir: string,
        private readonly hostname: string,
        private readonly noCache: boolean = false
    ) {}

    addRule(rule: ProtocolRule): this {
        this.rules.push(rule);
        return this;
    }

    canHandle(url: URL): boolean {
        return url.protocol === this.scheme + ":" && url.hostname === this.hostname;
    }

    resolve(url: string): AssetResolved | null {
        const urlObj = new URL(url);
        if (!this.canHandle(urlObj)) {
            return null;
        }

        for (const rule of this.rules) {
            if (this.matchesPattern(rule.include, url)) {
                // Skip if excluded
                if (rule.exclude && this.matchesPattern(rule.exclude, url)) {
                    continue;
                }
                return rule.handler(url);
            }
        }

        return null;
    }

    async handle(request: Request): Promise<ProtocolResponse> {
        const resolved = this.resolve(request.url);
        if (!resolved) {
            return {
                statusCode: 404,
                headers: {},
                data: undefined
            } as ProtocolResponse;
        }

        const filePath = fileURLToPath(resolved.path);
        const mimeType = getMimeType(filePath);
        
        // Create a readable stream from the file
        const stream = createReadStream(filePath);
        
        // Convert Node.js stream to Web ReadableStream
        const webStream = new ReadableStream({
            start(controller) {
                stream.on('data', (chunk) => {
                    controller.enqueue(chunk);
                });
                
                stream.on('end', () => {
                    controller.close();
                });
                
                stream.on('error', (error) => {
                    controller.error(error);
                });
            },
            cancel() {
                stream.destroy();
            }
        });

        return {
            statusCode: 200,
            headers: {
                "Content-Type": mimeType,
                ...((this.noCache || resolved.noCache) ? { 
                    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
                    "Pragma": "no-cache",
                    "Expires": "0"
                } : {})
            },
            data: webStream
        } as ProtocolResponse;
    }

    public formatFileUrl(requested: string): string {
        const url = new URL(requested);
        return `file://${normalizePath(path.join(this.baseDir, url.pathname))}`;
    }

    private async readFile(filePath: string): Promise<{ data: Buffer; mimeType: string }> {
        const data = await Fs.readRaw(filePath);
        const mimeType = getMimeType(filePath);

        if (!data.ok) {
            throw new Error(data.error);
        }

        return {
            data: data.data,
            mimeType,
        };
    }

    private matchesPattern(pattern: string | RegExp | ((requested: string) => boolean), url: string): boolean {
        if (typeof pattern === 'string') {
            return url.includes(pattern);
        }
        if (pattern instanceof RegExp) {
            return pattern.test(url);
        }
        return pattern(url);
    }
} 
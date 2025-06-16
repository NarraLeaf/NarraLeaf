import { Fs } from "@/utils/nodejs/fs";
import { getMimeType } from "@/utils/nodejs/os";
import { normalizePath } from "@/utils/nodejs/string";
import { createReadStream } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { AssetResolved, AssetResolver, ProtocolHandler, ProtocolResponse, ProtocolRule, ProtocolScheme } from "./types";
import { Logger } from "@/main/utils/logger";
import { App } from "../../app";

export class FileSystemHandler implements ProtocolHandler, AssetResolver {
    private rules: ProtocolRule[] = [];
    private logger: Logger;

    constructor(
        public readonly scheme: string,
        public readonly privileges: ProtocolScheme["privileges"],
        private readonly getBaseDir: () => string,
        private readonly hostname: string,
        private readonly noCache: boolean = false
    ) {
        this.logger = new Logger("FileSystemHandler");
    }

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
            this.logger.error(`File not found: ${request.url}`);

            return {
                statusCode: 404,
                headers: {},
                data: undefined
            } as ProtocolResponse;
        }

        const filePath = fileURLToPath(resolved.path);

        try {
            const { data, mimeType } = await this.readFile(filePath);

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
                data: data
            } as ProtocolResponse;
        } catch (error) {
            this.logger.error(`Error reading file: ${filePath} - ${error}`);
            return {
                statusCode: 500,
                headers: {},
                data: undefined
            };
        }
    }

    public formatFileUrl(requested: string): string {
        const url = new URL(requested);
        return `file://${normalizePath(path.join(this.getBaseDir(), url.pathname))}`;
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
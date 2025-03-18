import {App} from "@/main/electron";
import path from "path";
import {FileStat, Fs} from "@/utils/nodejs/fs";
import {Metadata} from "@/main/electron/app/save/metadata";

export type StorageConfig = {
    app: App;
    namespace: string;
};

export type Filter = {
    extensions?: string[];
} | "*";

export type StorageListHandle<Metadata extends Record<string, any>, Content extends Record<string, any>> = {
    name: string;
    json: () => Promise<Content>;
    meta: () => Promise<Metadata>;
};

export class Storage<Metadata extends Record<string, any>, Content extends Record<string, any>> {
    constructor(public readonly config: StorageConfig) {
    }

    async prepareDir(): Promise<void> {
        const root = this.getRoot();
        const res = await Fs.createDir(root);
        if (!res.ok) {
            throw new Error(res.error);
        }
    }

    async read(name: string): Promise<Content> {
        const path = this.resolve(name);
        const handle = await Metadata.read<Metadata, Content>(path);
        const result = await handle.readContent();

        await handle.close();

        return result as Content;
    }

    async readMetadata(name: string): Promise<Metadata> {
        const path = this.resolve(name);
        const handle = await Metadata.read<Metadata, Content>(path);
        const result = await handle.readMetaData();

        await handle.close();

        return result as Metadata;
    }

    async write(name: string, metadata: Metadata, data: Content): Promise<void> {
        const path = this.resolve(name);
        await Metadata.write<Metadata, Content>(path, metadata, data);
    }

    async list(filter: Filter[] | Filter): Promise<StorageListHandle<Metadata, Content>[]> {
        const result = await Fs.listFiles(this.getRoot());
        if (!result.ok) {
            throw new Error(result.error);
        }

        return result.data.filter((stat) => this.filter(stat, filter)).map((stat) => ({
            name: stat.name,
            json: async () => {
                return await this.read(stat.name);
            },
            meta: async () => {
                return await this.readMetadata(stat.name);
            },
        }));
    }

    private filter(stat: FileStat, filter: Filter[] | Filter): boolean {
        const filters = Array.isArray(filter) ? filter : [filter];
        for (const f of filters) {
            if (f === "*") {
                return true;
            }
            if (f.extensions && f.extensions.includes(stat.ext)) {
                return true;
            }
        }
        return false;
    }

    private resolve(name: string): string {
        return path.join(this.getRoot(), name);
    }

    private getRoot(): string {
        return path.join(this.config.app.getUserDataDir(), this.config.namespace);
    }
}

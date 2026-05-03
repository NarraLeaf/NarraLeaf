import { Fs } from "@shared/nodejs/fs";
import { assertSafeStorageKey, resolveContainedFilePath } from "@/main/utils/safeStorageKey";

export interface JsonStoreConfig {
    dir: string;
    name: string;
}

export class JsonStore<T extends Record<string, any>> {
    constructor(public readonly config: JsonStoreConfig) {
        assertSafeStorageKey(config.name, "Json store name");
        this.config = config;
    }

    public async read() {
        await this.sync();
        const data = await Fs.read(this.getPath());
        if (!data.ok) {
            throw new Error(data.error);
        }
        return JSON.parse(data.data) as T;
    }

    public async write(data: T) {
        await this.sync();
        const res = await Fs.write(this.getPath(), JSON.stringify(data));
        if (!res.ok) {
            throw new Error(res.error);
        }
    }

    private async sync() {
        const dirRes = await Fs.createDir(this.config.dir);
        if (!dirRes.ok) {
            throw new Error(dirRes.error);
        }

        const isExists = await Fs.isFileExists(this.getPath());
        if (!isExists.ok) {
            const initRes = await Fs.write(this.getPath(), "{}");
            if (!initRes.ok) {
                throw new Error(initRes.error);
            }
        }
    }

    private getPath() {
        return resolveContainedFilePath(this.config.dir, this.config.name, "Json store path");
    }
}

import {Fs} from "@/utils/nodejs/fs";
import path from "path";
export interface JsonStoreConfig {
    dir: string;
    name: string;
}

export class JsonStore<T extends Record<string, any>> {
    constructor(public readonly config: JsonStoreConfig) {
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
        await Fs.write(this.getPath(), JSON.stringify(data));
    }
    
    private async sync() {
        await Fs.createDir(this.config.dir);

        const isExists = await Fs.isFileExists(this.getPath());
        if (!isExists.ok) {
            await Fs.write(this.getPath(), "{}");
        }
    }

    private getPath() {
        return path.join(this.config.dir, this.config.name);
    }
}

import {Fs} from "@shared/nodejs/fs/queue";
import path from "path";

export interface JsonStoreConfig<T> {
    dir: string;
    name: string;
    initialData: T;
    /**
     * Distort the data before writing. If this is not provided, the data will be written as a JSON string.
     * @param data Json value need to be written
     * @returns The data to write
     */
    beforeWrite?: (data: T) => string | Buffer;
    /**
     * Reconstruct the data after reading. If this is not provided, the data will be reconstructed as a JSON object.
     * @param data The data read from the file
     * @returns The data to reconstruct
     */
    afterRead?: (data: Buffer) => T;
}

export class JsonStore<T extends Record<string, any>> {
    constructor(public readonly config: JsonStoreConfig<T>) {
        this.config = config;
    }

    public async read() {
        await this.sync();
        const data = await Fs.readRaw(this.getPath());
        if (!data.ok) {
            throw new Error(data.error);
        }
        return this.toData(data.data);
    }

    public async write(data: T) {
        await this.sync();

        const raw = this.toRaw(data);
        await this.writeDistorted(raw);
    }

    public bufferToString(data: Buffer) {
        return data.toString("utf-8");
    }
    
    private async sync() {
        await Fs.createDir(this.config.dir);

        const isExists = await Fs.isFileExists(this.getPath());
        if (!isExists.ok) {
            throw new Error(isExists.error);
        } else if (!isExists.data) {
            await this.writeDistorted(this.toRaw(this.config.initialData));
        }
    }

    private getPath() {
        return path.join(this.config.dir, this.config.name);
    }

    private async writeDistorted(raw: string | Buffer) {
        if (typeof raw === "string") {
            await Fs.write(this.getPath(), raw);
        } else {
            await Fs.writeRaw(this.getPath(), raw);
        }
    }

    private toRaw(data: T): string | Buffer {
        if (this.config.beforeWrite) {
            return this.config.beforeWrite(data);
        }
        return JSON.stringify(data);
    }

    private toData(data: Buffer): T {
        if (this.config.afterRead) {
            return this.config.afterRead(data);
        }
        return JSON.parse(this.bufferToString(data)) as T;
    }
}

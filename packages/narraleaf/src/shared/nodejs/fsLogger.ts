import fs from "fs/promises";
import {default as fsSync} from "fs";
import * as msgpack from "msgpack-lite";
import path from "path";

export class FsLogger {
    constructor(public file: string, public header: string) {
    }

    async log(data: string) {
        try {
            if (!await fs.stat(this.file).then(() => true, () => false)) {
                await fs.writeFile(this.file, this.header);
            }
            await fs.appendFile(this.file, "\n" + data);
        } catch (error: any) {
            if (error.code === 'ENOENT') {
                await fs.writeFile(this.file, this.header + "\n" + data);
            } else {
                throw error;
            }
        }
    }
}

export class FsFlag<Data extends Record<string, any>> {
    constructor(public file: string) {
    }

    async flag(data: Data): Promise<void> {
        try {
            await fs.writeFile(this.file, msgpack.encode(data));
        } catch (error: any) {
            if (error.code === 'ENOENT') {
                fsSync.mkdirSync(path.dirname(this.file), { recursive: true });
                await fs.writeFile(this.file, msgpack.encode(data));
            } else {
                throw error;
            }
        }
    }

    async unflag(): Promise<void> {
        try {
            await fs.unlink(this.file);
        } catch (error: any) {
            if (error.code !== 'ENOENT') {
                throw error;
            }
        }
    }

    async hasFlag(): Promise<boolean> {
        return await fs.stat(this.file).then(() => true, () => false);
    }

    async readFlag(): Promise<Data> {
        try {
            return msgpack.decode(await fs.readFile(this.file));
        } catch (error: any) {
            if (error.code === 'ENOENT') {
                throw new Error(`File not found: ${this.file}`);
            } else {
                throw error;
            }
        }
    }

    flagSync(data: Data): void {
        try {
            fsSync.writeFileSync(this.file, msgpack.encode(data));
        } catch (error: any) {
            if (error.code === 'ENOENT') {
                fsSync.mkdirSync(path.dirname(this.file), { recursive: true });
                fsSync.writeFileSync(this.file, msgpack.encode(data));
            } else {
                throw error;
            }
        }
    }
}

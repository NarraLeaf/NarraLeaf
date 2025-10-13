import { Fs, FsResult } from "../fs";

/**
 * FsQueue ensures that file operations on the same path are executed sequentially in order to avoid
 * lock collisions and data races. Operations on different paths are still allowed to run in parallel.
 */
export class FsQueue {
    /**
     * Internal queue map. Each key is an absolute or relative file path, the value is the current tail promise
     * of that file queue.
     */
    private static queues: Map<string, Promise<unknown>> = new Map();

    /**
     * Enqueue an asynchronous action for the given path.
     * The action is executed after all previously queued actions for the same path have resolved.
     * @param path  The file path used as a queue key.
     * @param action A function returning a promise performing the actual FS work.
     */
    private static enqueue<T>(path: string, action: () => Promise<FsResult<T>>): Promise<FsResult<T>> {
        const tail = this.queues.get(path) ?? Promise.resolve();

        // Chain the new action after the existing tail.
        const next = tail.then(() => action());

        // Regardless of success or failure, ensure the queue continues.
        this.queues.set(path, next.catch(() => undefined));

        // Clean up the queue map once this action finishes and no further actions were queued meanwhile.
        next.finally(() => {
            const current = this.queues.get(path);
            if (current === next) {
                this.queues.delete(path);
            }
        });

        return next;
    }

    /* Wrapped Fs helpers */
    public static read(path: string, encoding: BufferEncoding = "utf-8") {
        return this.enqueue(path, () => Fs.read(path, encoding));
    }

    public static readRaw(path: string) {
        return this.enqueue(path, () => Fs.readRaw(path));
    }

    public static write(path: string, data: string, encoding: BufferEncoding = "utf-8") {
        return this.enqueue(path, () => Fs.write(path, data, encoding));
    }

    public static writeRaw(path: string, data: Buffer) {
        return this.enqueue(path, () => Fs.writeRaw(path, data));
    }

    public static append(path: string, data: string, encoding: BufferEncoding = "utf-8") {
        return this.enqueue(path, () => Fs.append(path, data, encoding));
    }

    public static createDir(path: string) {
        return this.enqueue(path, () => Fs.createDir(path));
    }

    public static isFileExists(path: string) {
        return this.enqueue(path, () => Fs.isFileExists(path));
    }

    public static isDirExists(path: string) {
        return this.enqueue(path, () => Fs.isDirExists(path));
    }

    public static copyDir(src: string, destDir: string) {
        return this.enqueue(destDir, () => Fs.copyDir(src, destDir));
    }

    public static cpFile(src: string, destFile: string) {
        return this.enqueue(destFile, () => Fs.cpFile(src, destFile));
    }

    public static getFiles(dir: string, ext?: string | string[]) {
        return this.enqueue(dir, () => Fs.getFiles(dir, ext as any));
    }

    public static listFiles(dir: string) {
        return this.enqueue(dir, () => Fs.listFiles(dir));
    }

    public static listDirs(dir: string) {
        return this.enqueue(dir, () => Fs.listDirs(dir));
    }

    public static deleteFile(path: string) {
        return this.enqueue(path, () => Fs.deleteFile(path));
    }

    public static dirEntries(dir: string) {
        return this.enqueue(dir, () => Fs.dirEntries(dir));
    }
}

export { FsQueue as Fs };

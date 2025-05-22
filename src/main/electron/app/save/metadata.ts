/**
 * About the saved data mechanism:
 * - layer 0 RAW: raw data, includes header + packed data (using msgpack)
 * - layer 1 METADATA:
 *   - header, {@link Metadata.HEADER_SIZE} bytes, describes the length of the metadata
 *   - raw data, includes packed data
 * - layer 2 APP:
 *   - metadata, extracted metadata
 *   - content, unpacked data
 */
import fs from "fs/promises";
import * as msgpack from "msgpack-lite";

export interface MetadataHandle<Metadata extends Record<string, any>, Content extends Record<string, any>> {
    readContent(): Promise<Content>;
    readMetaData(): Promise<Metadata>;
    close(): Promise<void>;
}

export class Metadata {
    public static HEADER_SIZE = 4;

    public static async read<Metadata extends Record<string, any>, Content extends Record<string, any>>(src: string): Promise<MetadataHandle<Metadata, Content>> {
        try {
            const handle = await fs.open(src, 'r');
            const metadata = await this.readMetaData<Metadata>(handle);

            return {
                readContent: async () => {
                    return await this.readContent<Content>(handle);
                },
                readMetaData: async () => {
                    return metadata;
                },
                close: async () => {
                    await handle.close();
                }
            };
        } catch (error) {
            throw new Error(`Failed to read metadata from file. Error: ${error}. File: ${src}`);
        }
    }

    public static async write<Metadata extends Record<string, any>, Content extends Record<string, any>>(src: string, metadata: Metadata, content: Content): Promise<void> {
        await this.writeData<Metadata, Content>(src, metadata, content);
    }

    private static async readMetaData<T extends Record<string, any>>(handle: fs.FileHandle): Promise<T> {
        // get length of the metadata
        const metadataSize = await this.getMetadataSize(handle);
        if (metadataSize <= 0) {
            throw new Error("Invalid metadata size read from file.");
        }

        // read the metadata
        const metadataBuffer = Buffer.alloc(metadataSize);
        await handle.read(metadataBuffer, 0, metadataSize, Metadata.HEADER_SIZE);

        return JSON.parse(metadataBuffer.toString("utf-8")) as T;
    }

    private static async readContent<T extends Record<string, any>>(handle: fs.FileHandle): Promise<T> {
        // get length of the metadata
        const metadataSize = await this.getMetadataSize(handle);

        const contentStartPosition = Metadata.HEADER_SIZE + metadataSize;

        // calculate the size of the content
        const {size} = await handle.stat();
        const contentSize = size - contentStartPosition;
        if (contentSize <= 0) {
            throw new Error("Invalid content size. The file may be corrupted.");
        }

        // read the packed data
        const packedDataBuffer = Buffer.alloc(contentSize);
        await handle.read(packedDataBuffer, 0, contentSize, contentStartPosition);

        return msgpack.decode(packedDataBuffer) as T;
    }

    private static async getMetadataSize(handle: fs.FileHandle): Promise<number> {
        const headerBuffer = Buffer.alloc(Metadata.HEADER_SIZE);
        await handle.read(headerBuffer, 0, Metadata.HEADER_SIZE, 0);
        return headerBuffer.readUInt32BE(0);
    }

    private static async writeData<Metadata extends Record<string, any>, Content extends Record<string, any>>(src: string, metadata: Metadata, content: Content): Promise<void> {
        const metadataBuffer = Buffer.from(JSON.stringify(metadata), "utf-8");
        const packedDataBuffer = msgpack.encode(content);

        const headerBuffer = Buffer.alloc(Metadata.HEADER_SIZE);
        headerBuffer.writeUInt32BE(metadataBuffer.length, 0);

        const outputBuffer = Buffer.concat([headerBuffer, metadataBuffer, packedDataBuffer]);
        await fs.writeFile(src, outputBuffer);
    }
}


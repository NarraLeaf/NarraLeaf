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
    readContent(): Promise<MetadataReadResult<Content>>;
    readMetaData(): Promise<MetadataReadResult<Metadata>>;
    close(): Promise<void>;
}

export enum MetadataReadErrorType {
    INVALID_METADATA_SIZE = "INVALID_METADATA_SIZE",
    INVALID_METADATA = "INVALID_METADATA",
    INVALID_CONTENT_SIZE = "INVALID_CONTENT_SIZE",
    INVALID_CONTENT = "INVALID_CONTENT",
}

export type MetadataReadResult<Content extends Record<string, any>> = {
    ok: true;
    content: Content;
    error: null;
    errorType: null;
} | {
    ok: false;
    content: null;
    error: Error;
    errorType: MetadataReadErrorType;
}

export class Metadata {
    public static HEADER_SIZE = 4;

    private static success<Content extends Record<string, any>>(content: Content): MetadataReadResult<Content> {
        return {
            ok: true,
            content,
            error: null,
            errorType: null,
        }
    }

    private static error<Content extends Record<string, any>>(error: Error, errorType: MetadataReadErrorType): MetadataReadResult<Content> {
        return {
            ok: false,
            content: null,
            error,
            errorType,
        }
    }
    
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

    private static async readMetaData<T extends Record<string, any>>(handle: fs.FileHandle): Promise<MetadataReadResult<T>> {
        // get length of the metadata
        const metadataSize = await this.getMetadataSize(handle);
        if (metadataSize <= 0) {
            return this.error(new Error("Invalid metadata size read from file."), MetadataReadErrorType.INVALID_METADATA_SIZE);
        }

        // read the metadata
        const metadataBuffer = Buffer.alloc(metadataSize);
        await handle.read(metadataBuffer, 0, metadataSize, Metadata.HEADER_SIZE);

        try {
            return this.success(JSON.parse(metadataBuffer.toString("utf-8")) as T);
        } catch (error) {
            return this.error(error as Error, MetadataReadErrorType.INVALID_METADATA);
        }
    }

    private static async readContent<T extends Record<string, any>>(handle: fs.FileHandle): Promise<MetadataReadResult<T>> {
        // get length of the metadata
        const metadataSize = await this.getMetadataSize(handle);

        const contentStartPosition = Metadata.HEADER_SIZE + metadataSize;

        // calculate the size of the content
        const {size} = await handle.stat();
        const contentSize = size - contentStartPosition;
        if (contentSize <= 0) {
            return this.error(new Error("Invalid content size. The file may be corrupted."), MetadataReadErrorType.INVALID_CONTENT_SIZE);
        }

        // read the packed data
        const packedDataBuffer = Buffer.alloc(contentSize);
        await handle.read(packedDataBuffer, 0, contentSize, contentStartPosition);

        try {
            return this.success(msgpack.decode(packedDataBuffer) as T);
        } catch (error) {
            return this.error(error as Error, MetadataReadErrorType.INVALID_CONTENT);
        }
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


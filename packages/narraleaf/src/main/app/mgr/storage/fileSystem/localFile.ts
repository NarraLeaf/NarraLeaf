import path from "path";
import { Fs } from "@shared/nodejs/fs";
import { Metadata } from "@/main/app/mgr/storage/fileSystem/localFileMetadata";
import { StoreProvider } from "@main/app/mgr/storage/storeProvider";
import { SavedGameMeta, SavedGameResult, SaveType } from "@shared/types/save";
import { SavedGame } from "narraleaf-react";
import { assertSafeStorageKey, resolveContainedFilePath } from "@/main/utils/safeStorageKey";

export type StorageConfig = {
    dir: string;
    maxRecoveries?: number;
    maxTemporary?: number;
    forceDelete?: boolean;
};

export class LocalFile extends StoreProvider {
    private static EXT = "dat";
    private static DefaultConfig = {
        maxRecoveries: 5,
        maxTemporary: 1,
        forceDelete: false,
    };

    /** Serializes mutations and reads to avoid interleaved writes / retention races. */
    private opChain: Promise<void> = Promise.resolve();

    static isUnknown(metadata: SavedGameMeta | { id: string; isUnknown: true }): metadata is {
        id: string;
        isUnknown: true;
    } {
        return "isUnknown" in metadata && metadata.isUnknown;
    }

    constructor(public readonly config: StorageConfig) {
        super();
    }

    private enqueue<T>(fn: () => Promise<T>): Promise<T> {
        const run = this.opChain.then(fn);
        this.opChain = run.then(
            () => undefined,
            () => undefined
        );
        return run;
    }

    async get(name: string): Promise<SavedGameResult | null> {
        return this.enqueue(() => this.getInternal(name));
    }

    async metadata(name: string): Promise<SavedGameMeta | null> {
        return this.enqueue(() => this.metadataInternal(name));
    }

    async set(name: string, type: SaveType, metadata: SavedGameMeta, data: SavedGame): Promise<void> {
        return this.enqueue(() => this.setInternal(name, type, metadata, data));
    }

    async list(): Promise<SavedGameMeta[]> {
        return this.enqueue(async () => {
            await this.prepareDir();
            await this.fullCleanup();

            const result = await this.rawListInternal();
            return result.filter((v) => !LocalFile.isUnknown(v)) as SavedGameMeta[];
        });
    }

    async rawList(): Promise<(SavedGameMeta | { id: string; isUnknown: true })[]> {
        return this.enqueue(() => this.rawListInternal());
    }

    async delete(name: string): Promise<void> {
        return this.enqueue(() => this.deleteInternal(name));
    }

    private resolve(name: string): string {
        assertSafeStorageKey(name, "Save id");
        return resolveContainedFilePath(
            this.config.dir,
            `${name}.${LocalFile.EXT}`,
            "Save file path"
        );
    }

    private async getInternal(name: string): Promise<SavedGameResult | null> {
        await this.prepareDir();

        const filePath = this.resolve(name);
        const handle = await Metadata.read<SavedGameMeta, SavedGame>(filePath);
        const metadataResult = await handle.readMetaData();

        if (!metadataResult.ok) {
            console.error(
                `[Main: LocalFile StoreProvider] Failed to read metadata for save game ${name} (error type: ${metadataResult.errorType}).`,
                metadataResult.error
            );
            await handle.close();
            return null;
        }

        const contentResult = await handle.readContent();
        if (!contentResult.ok) {
            console.error(
                `[Main: LocalFile StoreProvider] Failed to read content for save game ${name} (error type: ${contentResult.errorType}).`,
                contentResult.error
            );
            await handle.close();
            return {
                metadata: metadataResult.content,
            };
        }

        await handle.close();

        return {
            savedGame: contentResult.content,
            metadata: metadataResult.content,
        };
    }

    private async metadataInternal(name: string): Promise<SavedGameMeta | null> {
        await this.prepareDir();

        const filePath = this.resolve(name);
        const handle = await Metadata.read<SavedGameMeta, SavedGame>(filePath);
        const result = await handle.readMetaData();

        await handle.close();

        if (!result.ok) {
            console.error(
                `[Main: LocalFile StoreProvider] Failed to read metadata for save game ${name} (error type: ${result.errorType}).`,
                result.error
            );
            return null;
        }

        return result.content;
    }

    private async setInternal(
        name: string,
        type: SaveType,
        metadata: SavedGameMeta,
        data: SavedGame
    ): Promise<void> {
        await this.prepareDir();

        if (type === SaveType.QuickSave) {
            return await this.quickSave(metadata, data);
        }
        if (type === SaveType.Recovery) {
            return await this.createRecovery(metadata, data);
        }

        const filePath = this.resolve(name);
        return await Metadata.write<SavedGameMeta, SavedGame>(filePath, metadata, data);
    }

    private async rawListInternal(): Promise<(SavedGameMeta | { id: string; isUnknown: true })[]> {
        const result = await Fs.listFiles(this.config.dir);
        if (!result.ok) {
            throw new Error(result.error);
        }

        const files = result.data.filter((file) => file.ext === "." + LocalFile.EXT);

        return Promise.all(
            files.map(async (stat) => {
                const name = path.basename(stat.name, "." + LocalFile.EXT);
                try {
                    assertSafeStorageKey(name, "Save id");
                } catch {
                    return { id: name, isUnknown: true };
                }
                const meta = await this.metadataInternal(name);
                if (!meta) {
                    return { id: name, isUnknown: true };
                }
                return meta;
            })
        );
    }

    private async deleteInternal(name: string): Promise<void> {
        await this.prepareDir();

        const filePath = this.resolve(name);
        const res = await Fs.deleteFile(filePath);
        if (!res.ok) {
            throw new Error(res.error);
        }
    }

    private async quickSave(metadata: SavedGameMeta, data: SavedGame): Promise<void> {
        return this.limitedSave(
            SaveType.QuickSave,
            metadata,
            data,
            this.config.maxTemporary || LocalFile.DefaultConfig.maxTemporary
        );
    }

    private async createRecovery(metadata: SavedGameMeta, data: SavedGame): Promise<void> {
        return this.limitedSave(
            SaveType.Recovery,
            metadata,
            data,
            this.config.maxRecoveries || LocalFile.DefaultConfig.maxRecoveries
        );
    }

    private async limitedSave(
        type: SaveType,
        metadata: SavedGameMeta,
        data: SavedGame,
        max: number
    ): Promise<void> {
        const filePath = this.resolve(metadata.id);
        await Metadata.write<SavedGameMeta, SavedGame>(filePath, metadata, data);

        await this.cleanupOldSaves(type, max);
    }

    private async cleanupOldSaves(type: SaveType, max: number): Promise<void> {
        const list = await this.rawListInternal();
        if (this.config.forceDelete) {
            const invalid = list.filter(LocalFile.isUnknown);
            if (invalid.length > 0) {
                const errors: string[] = [];
                console.error(`[Main: LocalFile StoreProvider] Found ${invalid.length} invalid saves.`, invalid);

                await Promise.all(
                    invalid.map(async (v) => {
                        try {
                            assertSafeStorageKey(v.id, "Save id");
                        } catch {
                            return;
                        }
                        const res = await Fs.deleteFile(this.resolve(v.id));
                        if (!res.ok) {
                            errors.push(res.error);
                        } else {
                            console.log(`[Main: LocalFile StoreProvider] Deleted invalid save ${v.id}`);
                        }
                    })
                );

                if (errors.length > 0) {
                    console.error(
                        `[Main: LocalFile StoreProvider] Failed to delete ${errors.length} invalid saves: \n    ${errors.join("\n    ")}`
                    );
                }
            }
        }

        const saves = list.filter((v) => !LocalFile.isUnknown(v) && v.type === type) as SavedGameMeta[];
        const removing = [];
        const sorted = saves.sort((a, b) => (b.updated || 0) - (a.updated || 0));

        for (let i = max; i < sorted.length; i++) {
            removing.push(sorted[i]);
        }

        for (const remove of removing) {
            const filePath = this.resolve(remove.id);
            const res = await Fs.deleteFile(filePath);

            if (!res.ok) {
                throw new Error(res.error);
            }
        }
    }

    private async fullCleanup(): Promise<void> {
        await this.cleanupOldSaves(SaveType.QuickSave, this.config.maxTemporary || LocalFile.DefaultConfig.maxTemporary);
        await this.cleanupOldSaves(SaveType.Recovery, this.config.maxRecoveries || LocalFile.DefaultConfig.maxRecoveries);
    }

    private async prepareDir(): Promise<void> {
        const res = await Fs.createDir(this.config.dir);
        if (!res.ok) {
            throw new Error(res.error);
        }
    }
}

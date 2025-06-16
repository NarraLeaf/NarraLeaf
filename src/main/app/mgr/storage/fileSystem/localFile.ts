import path from "path";
import { Fs } from "@/utils/nodejs/fs";
import { Metadata } from "@/main/app/mgr/storage/fileSystem/localFileMetadata";
import { StoreProvider } from "@/main/app/mgr/storage/storeProvider";
import { SavedGameResult } from "@core/game/SavedGameResult";
import { SavedGameMetadata, SaveType } from "@core/game/save";
import { SavedGame } from "narraleaf-react";

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

    static isUnknown(metadata: SavedGameMetadata | { id: string, isUnknown: true }): metadata is { id: string, isUnknown: true } {
        return "isUnknown" in metadata && metadata.isUnknown;
    }

    constructor(public readonly config: StorageConfig) {
        super();
    }

    async get(name: string): Promise<SavedGameResult | null> {
        await this.prepareDir();

        const path = this.resolve(name);
        const handle = await Metadata.read<SavedGameMetadata, SavedGame>(path);
        const metadataResult = await handle.readMetaData();

        if (!metadataResult.ok) {
            console.error(`[Main: LocalFile StoreProvider] Failed to read metadata for save game ${name} (error type: ${metadataResult.errorType}).`, metadataResult.error);
            await handle.close();
            return null;
        }

        const contentResult = await handle.readContent();
        if (!contentResult.ok) {
            console.error(`[Main: LocalFile StoreProvider] Failed to read content for save game ${name} (error type: ${contentResult.errorType}).`, contentResult.error);
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

    async metadata(name: string): Promise<SavedGameMetadata | null> {
        await this.prepareDir();

        const path = this.resolve(name);
        const handle = await Metadata.read<SavedGameMetadata, SavedGame>(path);
        const result = await handle.readMetaData();

        await handle.close();

        if (!result.ok) {
            console.error(`[Main: LocalFile StoreProvider] Failed to read metadata for save game ${name} (error type: ${result.errorType}).`, result.error);
            return null;
        }

        return result.content;
    }

    async set(name: string, type: SaveType, metadata: SavedGameMetadata, data: SavedGame): Promise<void> {
        await this.prepareDir();

        if (type === SaveType.QuickSave) {
            return await this.quickSave(metadata, data);
        } else if (type === SaveType.Recovery) {
            return await this.createRecovery(metadata, data);
        }

        const path = this.resolve(name);
        return await Metadata.write<SavedGameMetadata, SavedGame>(path, metadata, data);
    }

    async list(): Promise<SavedGameMetadata[]> {
        await this.prepareDir();
        await this.fullCleanup();

        const result = await this.rawList();
        return result.filter((v) => !LocalFile.isUnknown(v)) as SavedGameMetadata[];
    }

    async rawList(): Promise<(SavedGameMetadata | { id: string, isUnknown: true })[]> {
        const result = await Fs.listFiles(this.config.dir);
        if (!result.ok) {
            throw new Error(result.error);
        }

        const files = result.data.filter(file => file.ext === "." + LocalFile.EXT);

        return Promise.all(files.map(async (stat) => {
            const name = path.basename(stat.name, "." + LocalFile.EXT);
            const metadata = await this.metadata(name);
            if (!metadata) {
                return { id: name, isUnknown: true };
            }
            return metadata;
        }));
    }

    async delete(name: string): Promise<void> {
        await this.prepareDir();

        const path = this.resolve(name);
        const res = await Fs.deleteFile(path);
        if (!res.ok) {
            throw new Error(res.error);
        }
    }

    private async quickSave(metadata: SavedGameMetadata, data: SavedGame): Promise<void> {
        return this.limitedSave(SaveType.QuickSave, metadata, data, this.config.maxTemporary || LocalFile.DefaultConfig.maxTemporary);
    }

    private async createRecovery(metadata: SavedGameMetadata, data: SavedGame): Promise<void> {
        return this.limitedSave(SaveType.Recovery, metadata, data, this.config.maxRecoveries || LocalFile.DefaultConfig.maxRecoveries);
    }

    private async limitedSave(type: SaveType, metadata: SavedGameMetadata, data: SavedGame, max: number): Promise<void> {
        const path = this.resolve(metadata.id);
        await Metadata.write<SavedGameMetadata, SavedGame>(path, metadata, data);

        await this.cleanupOldSaves(type, max);
    }

    private async cleanupOldSaves(type: SaveType, max: number): Promise<void> {
        const list = await this.rawList();
        if (this.config.forceDelete) {
            const invalid = list.filter(LocalFile.isUnknown);
            if (invalid.length > 0) {
                const errors: string[] = [];
                console.error(`[Main: LocalFile StoreProvider] Found ${invalid.length} invalid saves.`, invalid);

                await Promise.all(invalid.map(async (v) => {
                    const res = await Fs.deleteFile(this.resolve(v.id));
                    if (!res.ok) {
                        errors.push(res.error);
                    } else {
                        console.log(`[Main: LocalFile StoreProvider] Deleted invalid save ${v.id}`);
                    }
                }));

                if (errors.length > 0) {
                    console.error(`[Main: LocalFile StoreProvider] Failed to delete ${errors.length} invalid saves: \n    ${errors.join("\n    ")}`);
                }
            }
        }

        const saves = list.filter(v => !LocalFile.isUnknown(v) && v.type === type) as SavedGameMetadata[];
        const removing = [];
        const sorted = saves.sort((a, b) =>
            (b.updated || 0) - (a.updated || 0));

        for (let i = max; i < sorted.length; i++) {
            removing.push(sorted[i]);
        }

        for (const remove of removing) {
            const path = this.resolve(remove.id);
            const res = await Fs.deleteFile(path);

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

    private resolve(name: string): string {
        return path.join(this.config.dir, name + "." + LocalFile.EXT);
    }
}

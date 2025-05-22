import path from "path";
import {Fs} from "@/utils/nodejs/fs";
import {Metadata} from "@/main/electron/app/save/metadata";
import {StoreProvider} from "@/main/electron/app/save/storeProvider";
import {SavedGame, SavedGameMetadata, SaveType} from "@core/game/save";

export type StorageConfig = {
    dir: string;
    maxRecoveries?: number;
    maxTemporary?: number;
};

export class LocalFile extends StoreProvider {
    private static EXT = "dat";
    private static DefaultConfig = {
        maxRecoveries: 5,
        maxTemporary: 1,
    };

    constructor(public readonly config: StorageConfig) {
        super();
    }

    async get(name: string): Promise<SavedGame> {
        await this.prepareDir();

        const path = this.resolve(name);
        const handle = await Metadata.read<SavedGameMetadata, SavedGame>(path);
        const result = await handle.readContent();

        await handle.close();

        return result as SavedGame;
    }

    async metadata(name: string): Promise<SavedGameMetadata> {
        await this.prepareDir();

        const path = this.resolve(name);
        const handle = await Metadata.read<SavedGameMetadata, SavedGame>(path);
        const result = await handle.readMetaData();

        await handle.close();

        return result as SavedGameMetadata;
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

        return this.rawList();
    }

    async rawList(): Promise<SavedGameMetadata[]> {
        const result = await Fs.listFiles(this.config.dir);
        if (!result.ok) {
            throw new Error(result.error);
        }

        const files = result.data.filter(file => file.ext === "." + LocalFile.EXT);

        return Promise.all(files.map(async (stat) => {
            const name = path.basename(stat.name, "." + LocalFile.EXT);
            return await this.metadata(name);
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
        const saves = (await this.rawList()).filter(v => v.type === type);
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

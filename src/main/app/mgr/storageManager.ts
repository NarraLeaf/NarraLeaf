import path from "path";
import { App } from "../app";
import { StoreProvider } from "./storage/storeProvider";
import { LocalFile } from "./storage/fileSystem/localFile";
import { SavedGame, SavedGameMetadata, SaveType } from "@core/game/save";
import { SavedGameResult } from "@core/game/SavedGameResult";
import { AppDataNamespace } from "../app";
import { JsonStore } from "../../electron/data/jsonStore";

export class StorageManager {
    private saveStorage: StoreProvider;

    constructor(private app: App) {
        this.saveStorage = this.initializeStorage();
    }

    private initializeStorage(): StoreProvider {
        const config = this.app.getConfig();
        return config.store || new LocalFile({
            dir: path.join(this.app.getUserDataDir(), AppDataNamespace.save),
            forceDelete: config.deleteCorruptedSaves,
        });
    }

    public createJsonStore<T extends Record<string, any>>(name: string): JsonStore<T> {
        return new JsonStore<T>({
            dir: path.join(this.app.getUserDataDir(), AppDataNamespace.json),
            name,
        });
    }

    public async saveGameData(data: SavedGame, type: SaveType, id: string, preview?: string): Promise<void> {
        const metadata = this.getSavedGameMetadata(data, type, id, preview);
        return this.saveStorage.set(metadata.id, type, metadata, data);
    }

    public async readGameData(id: string): Promise<SavedGameResult | null> {
        return this.saveStorage.get(id);
    }

    public async listGameData(): Promise<SavedGameMetadata[]> {
        return await this.saveStorage.list();
    }

    public async deleteGameData(id: string): Promise<void> {
        return this.saveStorage.delete(id);
    }

    private getSavedGameMetadata(save: SavedGame, type: SaveType, id: string, preview?: string): SavedGameMetadata {
        return {
            created: save.meta.created,
            updated: Date.now(),
            id,
            type,
            capture: preview,
            lastSentence: save.meta.lastSentence,
            lastSpeaker: save.meta.lastSpeaker,
        };
    }
} 
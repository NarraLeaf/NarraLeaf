import path from "path";
import { App } from "../app";
import { StoreProvider } from "./storage/storeProvider";
import { LocalFile } from "./storage/fileSystem/localFile";
import { SavedGameMeta, SaveType } from "@core/game/save";
import { SavedGameResult } from "@core/game/SavedGameResult";
import { AppDataNamespace } from "../app";
import { JsonStore } from "../../utils/jsonStore";
import type { SavedGame } from "narraleaf-react";

export class StorageManager {
    private saveStorage: StoreProvider;
    private exposedJsonStores: Record<string, JsonStore<any>> = {};

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

    public createExposedJsonStore<T extends Record<string, any>>(name: string): JsonStore<T> {
        const store = this.createJsonStore<T>(name);
        this.exposeJsonStore(store);

        return store;
    }

    public exposeJsonStore<T extends Record<string, any>>(store: JsonStore<T>): void {
        const name = store.config.name;
        if (this.exposedJsonStores[name]) {
            this.app.logger.warn(`Json store ${name} already exposed. Exposing again will override the existing store.`);
        }

        this.exposedJsonStores[name] = store;
    }

    public getExposedJsonStore<T extends Record<string, any>>(name: string): JsonStore<T> | null {
        return this.exposedJsonStores[name] || null;
    }

    public async saveGameData(data: SavedGame, type: SaveType, id: string, preview?: string): Promise<void> {
        const metadata = this.getSavedGameMetadata(data, type, id, preview);
        return this.saveStorage.set(metadata.id, type, metadata, data);
    }

    public async readGameData(id: string): Promise<SavedGameResult | null> {
        return this.saveStorage.get(id);
    }

    public async listGameData(): Promise<SavedGameMeta[]> {
        return await this.saveStorage.list();
    }

    public async deleteGameData(id: string): Promise<void> {
        return this.saveStorage.delete(id);
    }

    private getSavedGameMetadata(save: SavedGame, type: SaveType, id: string, preview?: string): SavedGameMeta {
        return {
            ...save.meta,
            id,
            type,
            capture: preview,
        };
    }
} 
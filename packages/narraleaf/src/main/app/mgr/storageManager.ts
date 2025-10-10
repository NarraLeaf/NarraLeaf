import path from "path";
import { App } from "../app";
import { StoreProvider } from "./storage/storeProvider";
import { LocalFile } from "./storage/fileSystem/localFile";
import { SavedGameMeta, SavedGameResult, SaveType } from "@shared/types/save";
import { AppDataNamespace } from "../app";
import { JsonStore } from "@main/utils/jsonStore";
import type { SavedGame } from "narraleaf-react";
import { State } from "./storage/state";

export class StorageManager {
    private saveStorage: StoreProvider;
    /**@deprecated */
    private exposedJsonStores: Record<string, JsonStore<any>> = {};
    private states: Record<string, State<any>> = {};

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

    public createState<T extends Record<string, any>>(name: string, initialData: T, dir?: string): State<T> {
        const jsonStore = new JsonStore<T>({
            dir: dir || path.join(this.app.getUserDataDir(), AppDataNamespace.state),
            name,
            initialData,
        });
        return new State<T>({
            jsonStore,
        });
    }

    public createJsonStore<T extends Record<string, any>>(name: string, initialData: T): JsonStore<T> {
        return new JsonStore<T>({
            dir: path.join(this.app.getUserDataDir(), AppDataNamespace.json),
            name,
            initialData,
        });
    }

    /**@deprecated */
    public createExposedJsonStore<T extends Record<string, any>>(name: string): JsonStore<T> {
        const store = this.createJsonStore<T>(name, {} as T);
        this.exposeJsonStore(store);

        return store;
    }

    /**@deprecated */
    public exposeJsonStore<T extends Record<string, any>>(store: JsonStore<T>): void {
        const name = store.config.name;
        if (this.exposedJsonStores[name]) {
            this.app.logger.warn(`Json store ${name} already exposed. Exposing again will override the existing store.`);
        }

        this.exposedJsonStores[name] = store;
    }

    /**@deprecated */
    public getExposedJsonStore<T extends Record<string, any>>(name: string): JsonStore<T> | null {
        return this.exposedJsonStores[name] || null;
    }

    public getState<T extends Record<string, any>>(name: string): State<T> | null {
        return this.states[name] || null;
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
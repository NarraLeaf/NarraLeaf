import path from "path";
import type { Service } from "@/service/app/service";
import { StoreProvider } from "./storage/storeProvider";
import { LocalFile } from "./storage/fileSystem/localFile";
import { SavedGameMeta, SaveType } from "@core/game/save";
import { SavedGameResult } from "@core/game/SavedGameResult";
import { AppDataNamespace } from "../constants";
import { JsonStore } from "../../utils/jsonStore";
import type { SavedGame } from "narraleaf-react";
import { Manager } from "./manager";
import type { RuntimeManager } from "./runtimeManager";

export class StorageManager extends Manager<[RuntimeManager]> {
    private saveStorage: StoreProvider;

    constructor(private app: Service) {
        super();

        this.saveStorage = this.initializeStorage();
    }

    protected async init() { }

    private initializeStorage(): StoreProvider {
        const config = this.app.getConfig();
        const [runtimeManager] = this.getDependencies();
        
        return config.store || new LocalFile({
            dir: path.join(runtimeManager.getUserDir(), AppDataNamespace.save),
            forceDelete: config.deleteCorruptedSaves,
        });
    }

    public createJsonStore<T extends Record<string, any>>(name: string): JsonStore<T> {
        const [runtimeManager] = this.getDependencies();
        return new JsonStore<T>({
            dir: path.join(runtimeManager.getUserDir(), AppDataNamespace.json),
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
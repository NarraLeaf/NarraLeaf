import path from "path";
import type { Service } from "@/service/app/service";
import { StoreProvider } from "./storage/storeProvider";
import { LocalFile } from "./storage/fileSystem/localFile";
import { AppDataNamespace } from "../constants";
import { JsonStore } from "../../utils/jsonStore";
import type { SavedGame, SavedGameMetaData } from "narraleaf-react";
import { Manager } from "./manager";
import type { RuntimeManager } from "./runtimeManager";
import type {SavedGameMetaData as NLRSavedGameMetaData} from "narraleaf-react";
import { ServiceInternalError } from "@/service/utils/error";

// ONLY FOR DEBUGGING
export interface SavedGameMeta extends NLRSavedGameMetaData {
    id: string;
    type: SaveType;
    capture?: string;
}
export enum SaveType {
    Save = 0,
    QuickSave = 1,
    Recovery = 2,
}
export type SavedGameResult = {
    savedGame: SavedGame;
    metadata: SavedGameMetaData;
} | {
    metadata: SavedGameMetaData;
};

export class StorageManager extends Manager<[RuntimeManager]> {
    public saveStorage: StoreProvider | null = null;

    constructor(private app: Service) {
        super();
    }

    protected async init() {
        this.saveStorage = this.initializeStorage();
    }

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
        this.assertSaveStorage();
        return this.saveStorage.set(metadata.id, type, metadata, data);
    }

    public async readGameData(id: string): Promise<SavedGameResult | null> {
        this.assertSaveStorage();
        return this.saveStorage.get(id);
    }

    public async listGameData(): Promise<SavedGameMeta[]> {
        this.assertSaveStorage();
        return await this.saveStorage.list();
    }

    public async deleteGameData(id: string): Promise<void> {
        this.assertSaveStorage();
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

    private assertSaveStorage(): asserts this is { saveStorage: StoreProvider } {
        if (!this.saveStorage) {
            throw new ServiceInternalError("Save storage not initialized");
        }
    }
} 
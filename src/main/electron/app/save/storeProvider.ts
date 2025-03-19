import {SavedGame, SavedGameMetadata, SaveType} from "@core/game/save";

export abstract class StoreProvider {
    abstract get(name: string): Promise<SavedGame>;

    abstract metadata(name: string): Promise<SavedGameMetadata>;

    abstract set(name: string, type: SaveType, metadata: SavedGameMetadata, data: SavedGame): Promise<void>;

    abstract list(): Promise<SavedGameMetadata[]>;

    abstract delete(name: string): Promise<void>;
}

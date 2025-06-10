import {SavedGame, SavedGameMetadata, SaveType} from "@core/game/save";
import { SavedGameResult } from "../../../../core/game/SavedGameResult";

export abstract class StoreProvider {
    abstract get(name: string): Promise<SavedGameResult | null>;

    abstract metadata(name: string): Promise<SavedGameMetadata | null>;

    abstract set(name: string, type: SaveType, metadata: SavedGameMetadata, data: SavedGame): Promise<void>;

    abstract list(): Promise<SavedGameMetadata[]>;

    abstract delete(name: string): Promise<void>;
}

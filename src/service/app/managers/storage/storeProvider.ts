import { SavedGame } from "narraleaf-react";
import type { SavedGameMeta, SavedGameResult, SaveType } from "../storageManager";

export abstract class StoreProvider {
    abstract get(name: string): Promise<SavedGameResult | null>;

    abstract metadata(name: string): Promise<SavedGameMeta | null>;

    abstract set(name: string, type: SaveType, metadata: SavedGameMeta, data: SavedGame): Promise<void>;

    abstract list(): Promise<SavedGameMeta[]>;

    abstract delete(name: string): Promise<void>;
}

import { SavedGameMeta, SavedGameResult, SaveType } from "@shared/types/save";
import { SavedGame } from "narraleaf-react";

/**
 * Pluggable persistence backend for game saves. Assign via {@link BaseAppConfig.store} on {@link AppConfig}.
 * Implementations should treat `name` as an opaque id already validated when routed through {@link App}.
 */
export abstract class StoreProvider {
    abstract get(name: string): Promise<SavedGameResult | null>;

    abstract metadata(name: string): Promise<SavedGameMeta | null>;

    abstract set(name: string, type: SaveType, metadata: SavedGameMeta, data: SavedGame): Promise<void>;

    abstract list(): Promise<SavedGameMeta[]>;

    abstract delete(name: string): Promise<void>;
}

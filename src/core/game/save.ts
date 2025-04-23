/**
 * @todo: use import("narraleaf-react").SavedGame instead
 */
export interface SavedGame {
    name: string;
    meta: {
        created: number;
        updated: number;
    };
    game: Record<string, any>;
}

export interface SavedGameMetadata {
    created: number;
    updated: number;
    id: string;
    type: SaveType;
    capture?: string;
}

export enum SaveType {
    Save = 0,
    QuickSave = 1,
    Recovery = 2,
}

import type {SavedGameMetaData as NLRSavedGameMetaData} from "narraleaf-react";

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

export type {SavedGame} from "narraleaf-react";

export interface SavedGameMetadata {
    created: number;
    updated: number;
    id: string;
    type: SaveType;
    capture?: string;
    lastSentence: string | null;
    lastSpeaker: string | null;
}

export enum SaveType {
    Save = 0,
    QuickSave = 1,
    Recovery = 2,
}

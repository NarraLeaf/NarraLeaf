import type { SavedGameMetaData } from "narraleaf-react";
import { SavedGame } from "narraleaf-react";

export type SavedGameResult = {
    savedGame: SavedGame;
    metadata: SavedGameMetaData;
} | {
    metadata: SavedGameMetaData;
};

export interface SavedGameMeta extends SavedGameMetaData {
    id: string;
    type: SaveType;
    capture?: string;
}

export enum SaveType {
    Save = 0,
    QuickSave = 1,
    Recovery = 2,
}

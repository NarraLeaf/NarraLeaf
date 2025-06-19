import type { SavedGameMetaData } from "narraleaf-react";
import { SavedGame } from "narraleaf-react";


export type SavedGameResult = {
    savedGame: SavedGame;
    metadata: SavedGameMetaData;
} | {
    metadata: SavedGameMetaData;
};

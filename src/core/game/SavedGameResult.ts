import { SavedGameMetadata } from "@/client";
import { SavedGame } from "narraleaf-react";


export type SavedGameResult = {
    savedGame: SavedGame;
    metadata: SavedGameMetadata;
} | {
    metadata: SavedGameMetadata;
};

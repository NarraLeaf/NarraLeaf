import { NarraLeaf } from "@/core/build/constants";
import { SavedGame } from "narraleaf-react";

export class AppAPI {
    constructor(
        private readonly api: typeof window[typeof NarraLeaf],
    ) {}

    async createRecovery(savedGame: SavedGame) {
        await this.api.game.save.createRecovery(savedGame);
    }
}


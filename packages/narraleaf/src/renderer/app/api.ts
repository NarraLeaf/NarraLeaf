import { NarraLeaf } from "@narraleaf/shared";
import { SavedGame } from "narraleaf-react";
import { SavedGameMeta } from "@shared/types/save";

export class GameAPI {
    constructor(
        protected readonly api: typeof window[typeof NarraLeaf],
    ) {}

    async listSaves(): Promise<SavedGameMeta[]> {
        const res = await this.api.game.save.list();
        if (!res.success) {
            throw new Error(res.error);
        }
        return res.data;
    }
}

export class AppAPI extends GameAPI {
    async createRecovery(savedGame: SavedGame) {
        const res = await this.api.game.save.createRecovery(savedGame);
        if (!res.success) {
            throw new Error(res.error ?? "Failed to create recovery save");
        }
    }

    public quit() {
        this.api.app.terminate(null);
    }
}


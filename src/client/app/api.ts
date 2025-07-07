import { NarraLeaf } from "@/core/build/constants";
import { SavedGame } from "narraleaf-react";
import { SavedGameMeta } from "./app.types";

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
        await this.api.game.save.createRecovery(savedGame);
    }

    public quit() {
        this.api.app.terminate(null);
    }
}


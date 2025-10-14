import { NarraLeaf } from "@narraleaf/shared";
import { SavedGame } from "narraleaf-react";
import { SavedGameMeta } from "./app.types";
import { AppEventToken } from "@/main/app/types";

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

    public onStateChange(key: string, listener: (data: Record<string, any>) => void): AppEventToken {
        return this.api.game.state.listen(key, listener);
    }
}


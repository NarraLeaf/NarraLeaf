import { NarraLeaf } from "@narraleaf/shared";
import { SavedGame } from "narraleaf-react";
import { SavedGameMeta } from "./app.types";
import { AppEventToken } from "@/main/app/types";
import { RequestStatus } from "@/shared/types/ipcEvents";

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

    public getState(key: string): Promise<RequestStatus<Record<string, any>>> {
        return this.api.game.state.get(key);
    }

    public setState(key: string, data: Record<string, any>): Promise<RequestStatus<void>> {
        return this.api.game.state.set(key, data);
    }
}


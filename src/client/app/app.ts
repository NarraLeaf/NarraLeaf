import { NarraLeaf } from "@/core/build/constants";
import { CrashReport } from "@/main/app/types";
import { CriticalRendererProcessError } from "@/main/utils/error";
import { EventEmitter } from "events";
import { RootPath } from "narraleaf-react";
import { AppAPI } from "./api";
import { AppConfig } from "./app.types";
import { AppState } from "./utils/appState";

type AppEvents = {};
export type AppStates = {
    isPlaying: boolean;
};


export class App extends AppAPI {
    static DefaultAppStates: AppStates = {
        isPlaying: false,
    };

    public readonly events = new EventEmitter<AppEvents>();
    public readonly state = new AppState<AppStates>(App.DefaultAppStates);
    public readonly config: AppConfig;

    constructor(config: AppConfig) {
        super(config.api);
        this.config = config;
    }

    public getCrashReport(): CrashReport | null {
        return this.config.appInfo.crashReport;
    }

    public crash(error: Error | string | null | undefined = null): void {
        window[NarraLeaf].app.terminate(error);
    }

    public async newGame(): Promise<void> {
        const { game, router } = this.config;

        router.clear().cleanHistory();
        await game.getLiveGame()
            .newGame()
            .waitForRouterExit().promise;

        this.state.set("isPlaying", true);
    }

    public async loadGame(id: string): Promise<void> {
        const { game, router } = this.config;

        const savedGame = await window[NarraLeaf].game.save.read(id);
        if (!savedGame.success) {
            throw new CriticalRendererProcessError("Failed to load game: " + savedGame.error);
        }

        if (!savedGame.data || !("savedGame" in savedGame.data)) {
            throw new Error("Failed to load game, saved game is corrupted");
        }
        const data = savedGame.data;

        router.clear().cleanHistory();
        await game.getLiveGame()
            .newGame()
            .waitForRouterExit().promise;

        this.state.set("isPlaying", true);
        game.getLiveGame().getGameStateForce().events.once("event:state.onRender", () => {
            game.getLiveGame().deserialize(data.savedGame);
        });
    }

    public async exitGame() {
        const { game, router } = this.config;

        game.getLiveGame().reset();
        this.state.set("isPlaying", false);

        router
            .clear()
            .cleanHistory()
            .navigate(RootPath);
    }
}

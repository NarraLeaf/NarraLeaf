import { EventEmitter } from "events";
import { AppState } from "./utils/appState";
import { AppConfig } from "./app.types";
import { CrashReport } from "@/main/app/types";
import { NarraLeafMainWorldProperty } from "@/core/build/constants";
import { CriticalRendererProcessError } from "@/main/utils/error";
import { AppAPI } from "./api";

type AppEvents = {};
type AppStates = {
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
        window[NarraLeafMainWorldProperty].app.terminate(error);
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

        const savedGame = await window[NarraLeafMainWorldProperty].game.save.read(id);
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
}

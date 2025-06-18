import { AppInfo } from "@core/@types/global";
import { CrashReport } from "@/main/app/types";
import { Game } from "narraleaf-react";
import { CriticalRendererProcessError } from "@/main/utils/error";
import { GamePlaybackState } from "../providers/game-state-provider";
import { EventEmitter } from "events";
import { EventToken } from "../types";
import { NarraLeafMainWorldProperty, RendererHomePage } from "@/core/build/constants";

export interface AppConfig {
    appInfo: AppInfo;
};
type AppEvents = {
    "clientEvent:app.stateChanged": [GamePlaybackState];
};

type Router = ReturnType<typeof import("narraleaf-react")["useRouter"]>;

export class App {
    static readonly DefaultGamePlaybackState: GamePlaybackState = {
        isPlaying: false
    };

    public readonly events = new EventEmitter<AppEvents>();
    public readonly appInfo: AppInfo;
    public router: Router | null = null;
    public game: Game | null = null;
    public playbackState: GamePlaybackState = { ...App.DefaultGamePlaybackState };

    constructor(config: AppConfig) {
        this.appInfo = config.appInfo;
    }

    getCrashReport(): CrashReport | null {
        return this.appInfo.crashReport;
    }

    setRouter(router: Router | null): this {
        this.router = router;
        return this;
    }

    getRouter(): Router | null {
        return this.router;
    }

    setGame(game: Game | null): this {
        this.game = game;
        return this;
    }

    getGame(): Game | null {
        return this.game;
    }

    public crash(error: Error | string | null | undefined = null): void {
        window[NarraLeafMainWorldProperty].app.terminate(error);
    }

    public async newGame(): Promise<void> {
        if (!this.game || !this.router) {
            throw new CriticalRendererProcessError("Game or router not mounted");
        }

        this.router.clear().cleanHistory();
        await this.game.getLiveGame()
            .newGame()
            .waitForRouterExit().promise;

        this.dispatchState({ isPlaying: true });
    }

    public async loadGame(id: string): Promise<void> {
        if (!this.game || !this.router) {
            throw new CriticalRendererProcessError("Game or router not mounted");
        }

        const savedGame = await window[NarraLeafMainWorldProperty].game.save.read(id);
        if (!savedGame.success) {
            throw new CriticalRendererProcessError("Failed to load game: " + savedGame.error);
        }

        if (!savedGame.data || !("savedGame" in savedGame.data)) {
            throw new Error("Failed to load game, saved game is corrupted");
        }
        const data = savedGame.data;

        this.router.clear().cleanHistory();
        await this.game.getLiveGame()
            .newGame()
            .waitForRouterExit().promise;

        this.dispatchState({ isPlaying: true });
        this.game.getLiveGame()!.getGameState()?.events.once("event:state.onRender", () => {
            this.game!.getLiveGame()!.deserialize(data.savedGame);
        });
    }

    public exitGame(): void {
        if (!this.game || !this.router) {
            throw new CriticalRendererProcessError("Game or router not mounted");
        }

        this.game.getLiveGame().reset();
        this.dispatchState({ isPlaying: false });
        // this.router.clear().cleanHistory().push(RendererHomePage);
    }

    public onStateChanged(callback: (state: GamePlaybackState) => void): EventToken {
        this.events.on("clientEvent:app.stateChanged", callback);
        return {
            cancel: () => {
                this.events.off("clientEvent:app.stateChanged", callback);
            }
        };
    }

    public dispatchState(state: Partial<GamePlaybackState>) {
        this.playbackState = { ...this.playbackState, ...state };
        this.events.emit("clientEvent:app.stateChanged", this.playbackState);
    }

    public getState(): GamePlaybackState {
        return this.playbackState;
    }
}


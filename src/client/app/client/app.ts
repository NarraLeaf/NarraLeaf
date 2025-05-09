import { AppInfo } from "@core/@types/global";
import { CrashReport } from "@/main/electron/app/app";
import { Game } from "narraleaf-react";
import { CriticalRendererProcessError } from "@/main/error/criticalError";
import { GamePlaybackState } from "../providers/game-state-provider";
import { EventEmitter } from "events";
import { EventToken } from "../types";

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

    newGame(): void {
        if (!this.game || !this.router) {
            throw new CriticalRendererProcessError("Game or router not mounted");
        }

        this.router.clear().cleanHistory();
        this.game.getLiveGame().newGame();
        this.dispatchState({ isPlaying: true });
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


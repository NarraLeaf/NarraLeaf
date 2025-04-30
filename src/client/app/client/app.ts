import {AppInfo} from "@core/@types/global";
import {CrashReport} from "@/main/electron/app/app";
import {Game} from "narraleaf-react";
import { CriticalRendererProcessError } from "@/main/error/criticalError";

export interface AppConfig {
    appInfo: AppInfo;
}

type Router = ReturnType<typeof import("narraleaf-react")["useRouter"]>;

export class App {
    public readonly appInfo: AppInfo;
    public router: Router | null = null;
    public game: Game | null = null;

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
    }
}


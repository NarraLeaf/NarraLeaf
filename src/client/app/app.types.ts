import { AppInfo } from "@/core/@types/global";
import * as NLReact from "narraleaf-react";
import { Game } from "narraleaf-react";

export type EventToken = {
    cancel(): void;
};
export interface AppConfig {
    appInfo: AppInfo;
    router: ReturnType<typeof NLReact["useRouter"]>;
    game: Game;
};

export {
    type NLReact
};
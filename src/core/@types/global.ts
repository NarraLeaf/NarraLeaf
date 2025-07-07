import { PlatformInfo } from "@/utils/pure/os";
import { SavedGameMeta } from "@core/game/save";
import { RequestStatus } from "@core/ipc/events";
import { SavedGameResult } from "@/core/game/SavedGameResult";
import { CrashReport } from "@/main/app/mgr/crashManager";
import { SavedGame } from "narraleaf-react";

export interface ClientAppConfiguration {
    recoveryCreationInterval: number;
    appErrorHandling: "terminate" | "raw" | "restart";
}

export type AppInfo = {
    platform: PlatformInfo;
    isPackaged: boolean;
    crashReport: CrashReport | null;
    config: ClientAppConfiguration;
};

declare global {
    interface Window {
        NarraLeaf: {
            getPlatform(): Promise<AppInfo>;
            app: {
                reload(): void;
                terminate(err: string | Error | null): void;
                requestMain<Request, Response>(event: string, ...args: Response extends void ? [payload?: Request] : [payload: Request]): Promise<RequestStatus<Response>>;
            };
            game: {
                save: {
                    save(gameData: SavedGame, id: string, preview?: string): Promise<RequestStatus<void>>;
                    quickSave(gameData: SavedGame): Promise<RequestStatus<void>>;
                    createRecovery(gameData: SavedGame): Promise<RequestStatus<void>>;
                    read(id: string): Promise<RequestStatus<SavedGameResult | null>>;
                    list(): Promise<RequestStatus<SavedGameMeta[]>>;
                };
            };
        }
    }
}

export {};

import { AppEventToken } from "@/main/app/types";
import { RequestStatus } from "@shared/types/ipcEvents";
import { CrashReport } from "@shared/types/managers";
import { SavedGameMeta, SavedGameResult } from "@shared/types/save";
import { PlatformInfo } from "@shared/utils/os";
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
                state: {
                    get(key: string): Promise<RequestStatus<Record<string, any>>>;
                    set(key: string, data: Record<string, any>): Promise<RequestStatus<void>>;
                    listen(key: string, listener: (data: Record<string, any>) => void): AppEventToken;
                };
            };
        }
    }
}

export { };


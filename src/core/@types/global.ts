import {PlatformInfo} from "@/utils/pure/os";
import {SavedGame, SavedGameMetadata} from "@core/game/save";
import {RequestStatus} from "@core/ipc/events";
import {CrashReport} from "@/main/electron/app/app";

export interface ClientAppConfiguration {
    recoveryCreationInterval: number;
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
                terminate(err: string | Error | null): void;
            };
            game: {
                save: {
                    save(gameData: SavedGame, id: string, preview?: string): Promise<RequestStatus<void>>;
                    quickSave(gameData: SavedGame): Promise<RequestStatus<void>>;
                    createRecovery(gameData: SavedGame): Promise<RequestStatus<void>>;
                    read(id: string): Promise<RequestStatus<SavedGame>>;
                    list(): Promise<RequestStatus<SavedGameMetadata[]>>;
                };
            };
        }
    }
}

export {};

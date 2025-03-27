import {IPCMessageType, IPCType} from "@core/ipc/ipc";
import {PlatformInfo} from "@/utils/pure/os";
import {SavedGame, SavedGameMetadata, SaveType} from "@core/game/save";
import {CrashReport} from "@/main/electron/app/app";

export enum IpcEvent {
    getPlatform = "getPlatform",
    app_terminate = "app.terminate",
    game_save_save = "game.save.save",
    game_save_read = "game.save.read",
    game_save_list = "game.save.list",
    game_save_delete = "game.save.delete",
}

export type VoidRequestStatus = RequestStatus<void>;
export type RequestStatus<T> = {
    success: true;
    data: T;
    error?: never;
} |{
    success: false;
    data?: never;
    error?: string;
};

export type IpcEvents = {
    [IpcEvent.getPlatform]: {
        type: IPCMessageType.request,
        consumer: IPCType.Host,
        data: {},
        response: {
            platform: PlatformInfo;
            isPackaged: boolean;
            crashReport: CrashReport | null;
        };
    };
    [IpcEvent.app_terminate]: {
        type: IPCMessageType.message,
        consumer: IPCType.Host,
        data: {
            err: string | null;
        },
        response: never;
    };
    [IpcEvent.game_save_save]: {
        type: IPCMessageType.request,
        consumer: IPCType.Host,
        data: {
            gameData: Record<string, any>;
            id: string;
            type: SaveType;
            preview?: string;
        },
        response: VoidRequestStatus;
    };
    [IpcEvent.game_save_read]: {
        type: IPCMessageType.request,
        consumer: IPCType.Host,
        data: {
            id: string;
        },
        response: RequestStatus<SavedGame>;
    };
    [IpcEvent.game_save_list]: {
        type: IPCMessageType.request,
        consumer: IPCType.Host,
        data: {},
        response: RequestStatus<SavedGameMetadata[]>;
    };
    [IpcEvent.game_save_delete]: {
        type: IPCMessageType.request,
        consumer: IPCType.Host,
        data: {
            id: string;
        },
        response: VoidRequestStatus;
    };
};

export enum Namespace {
    NarraLeaf = "narraleaf",
}

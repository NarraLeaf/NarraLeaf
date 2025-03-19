import {IPCMessageType, IPCType} from "@core/ipc/ipc";
import {PlatformInfo} from "@/utils/pure/os";
import {SavedGame, SavedGameMetadata, SaveType} from "@core/game/save";

export enum IpcEvent {
    getPlatform = "getPlatform",
    app_terminate = "app.terminate",
    game_save_save = "game.save.save",
    game_save_read = "game.save.read",
    game_save_list = "game.save.list",
    game_save_delete = "game.save.delete",
}

export type VoidRequestStatus = {
    success: boolean;
    error?: string;
};

export type RequestStatus<T> = {
    success: true;
    data: T;
    error?: never;
} | VoidRequestStatus;

export type IpcEvents = {
    [IpcEvent.getPlatform]: {
        type: IPCMessageType.request,
        consumer: IPCType.Host,
        data: {},
        response: {
            platform: PlatformInfo;
            isPackaged: boolean;
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

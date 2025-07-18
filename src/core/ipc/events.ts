import type { SavedGameResult } from "@/core/game/SavedGameResult";
import type { CrashReport } from "@/main/app/mgr/crashManager";
import type { PlatformInfo } from "@/utils/pure/os";
import type { SavedGameMeta, SaveType } from "@core/game/save";
import type { IPCMessageType, IPCType } from "@core/ipc/ipc";
import type { ClientAppConfiguration } from "../@types/global";

export enum IPCEventType {
    getPlatform = "getPlatform",
    appReload = "app.reload",
    appTerminate = "app.terminate",
    appRequestMainEvent = "app.event.requestMain",
    appGetJsonStore = "app.store.getJson",
    appSaveJsonStore = "app.store.saveJson",
    gameSaveGame = "game.save.save",
    gameReadGame = "game.save.read",
    gameListGame = "game.save.list",
    gameDeleteGame = "game.save.delete",
}

export type VoidRequestStatus = RequestStatus<void>;
export type RequestStatus<T> = {
    success: true;
    data: T;
    error?: never;
} | {
    success: false;
    data?: never;
    error?: string;
};

export type IPCEvents = {
    [IPCEventType.getPlatform]: {
        type: IPCMessageType.request,
        consumer: IPCType.Host,
        data: {},
        response: {
            platform: PlatformInfo;
            isPackaged: boolean;
            crashReport: CrashReport | null;
            config: ClientAppConfiguration;
        };
    };
    [IPCEventType.appReload]: {
        type: IPCMessageType.message,
        consumer: IPCType.Host,
        data: {},
        response: never;
    };
    [IPCEventType.appTerminate]: {
        type: IPCMessageType.message,
        consumer: IPCType.Host,
        data: {
            err: string | null;
        },
        response: never;
    };

    [IPCEventType.appGetJsonStore]: {
        type: IPCMessageType.request,
        consumer: IPCType.Host,
        data: {
            name: string;
        },
        response: Record<string, any>;
    };
    [IPCEventType.appSaveJsonStore]: {
        type: IPCMessageType.request,
        consumer: IPCType.Host,
        data: {
            name: string;
            data: Record<string, any>;
        },
        response: void;
    };

    [IPCEventType.gameSaveGame]: {
        type: IPCMessageType.request,
        consumer: IPCType.Host,
        data: {
            gameData: Record<string, any>;
            id: string;
            type: SaveType;
            preview?: string;
        },
        response: void;
    };
    [IPCEventType.gameReadGame]: {
        type: IPCMessageType.request,
        consumer: IPCType.Host,
        data: {
            id: string;
        },
        response: SavedGameResult | null;
    };
    [IPCEventType.gameListGame]: {
        type: IPCMessageType.request,
        consumer: IPCType.Host,
        data: {},
        response: SavedGameMeta[];
    };
    [IPCEventType.gameDeleteGame]: {
        type: IPCMessageType.request,
        consumer: IPCType.Host,
        data: {
            id: string;
        },
        response: void;
    };
    [IPCEventType.appRequestMainEvent]: {
        type: IPCMessageType.request,
        consumer: IPCType.Host,
        data: {
            event: string;
            payload: any;
        },
        response: any;
    };
};

export enum Namespace {
    NarraLeaf = "narraleaf",
}

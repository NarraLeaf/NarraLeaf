import type { SavedGameResult } from "@shared/types/save";
import type { CrashReport } from "@shared/types/managers";
import type { PlatformInfo } from "@shared/utils/os";
import type { SavedGameMeta, SaveType } from "@shared/types/save";
import type { IPCMessageType, IPCType } from "@shared/types/ipc";
import type { ClientAppConfiguration } from "@shared/types/global";

export enum IPCEventType {
    getPlatform = "getPlatform",
    appReload = "app.reload",
    appTerminate = "app.terminate",
    appRequestMainEvent = "app.event.requestMain",
    appGetState = "app.state.get",
    appSetState = "app.state.save",
    appAnnouceState = "app.state.announce",
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

    [IPCEventType.appGetState]: {
        type: IPCMessageType.request,
        consumer: IPCType.Host,
        data: {
            name: string;
        },
        response: Record<string, any>;
    };

    [IPCEventType.appSetState]: {
        type: IPCMessageType.request,
        consumer: IPCType.Host,
        data: {
            name: string;
            data: Record<string, any>;
        },
        response: void;
    };

    [IPCEventType.appAnnouceState]: {
        type: IPCMessageType.message,
        consumer: IPCType.Client,
        data: {
            name: string;
            data: Record<string, any>;
        },
        response: never;
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

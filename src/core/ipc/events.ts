import {IPCMessageType, IPCType} from "@core/ipc/ipc";
import {PlatformInfo} from "@/utils/pure/os";

export enum IpcEvent {
    getPlatform = "getPlatform",
    app_terminate = "app.terminate",
}

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
};

export enum Namespace {
    NarraLeaf = "narraleaf",
}

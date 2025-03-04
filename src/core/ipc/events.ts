import {IPCMessageType, IPCType} from "@core/ipc/ipc";
import {PlatformInfo} from "@/utils/pure/os";

export enum IpcEvent {
    getPlatform = "getPlatform",
}

export type IpcEvents = {
    [IpcEvent.getPlatform]: {
        type: IPCMessageType.request,
        consumer: IPCType.Host,
        data: {},
        response: {
            platform: PlatformInfo;
        };
    };
};

export enum Namespace {
    NarraLeaf = "narraleaf",
}

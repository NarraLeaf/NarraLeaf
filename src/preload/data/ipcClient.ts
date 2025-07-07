import {IPC, IPCType, OnlyMessage, OnlyRequest, SubNamespace} from "@core/ipc/ipc";
import {IPCEvents, RequestStatus} from "@core/ipc/events";
import { AppEventToken } from "@/main/app/types";
import {ipcRenderer} from "electron";
import {MayPromise} from "@/utils/types";

export class IPCClient extends IPC<IPCEvents, IPCType.Client> {
    constructor(namespace: string) {
        super(IPCType.Client, namespace);
    }

    invoke<K extends keyof OnlyRequest<IPCEvents, IPCType.Host>>(key: K, data: IPCEvents[K]["data"]): Promise<RequestStatus<Exclude<IPCEvents[K]["response"], never>>> {
        return ipcRenderer.invoke(this.getEventName(key), data);
    }

    send<K extends keyof OnlyMessage<IPCEvents, IPCType.Host>>(key: K, data: IPCEvents[K]["data"]): void {
        return ipcRenderer.send(this.getEventName(key), data);
    }

    onMessage<K extends keyof OnlyMessage<IPCEvents, IPCType.Host>>(key: K, listener: (data: IPCEvents[K]["data"]) => void): AppEventToken {
        const listenerFn = (_event: Electron.IpcRendererEvent, data: IPCEvents[K]["data"]) => {
            listener(data);
        };
        ipcRenderer.on(this.getEventName(key), listenerFn);
        return {
            cancel: () => {
                ipcRenderer.off(this.getEventName(key), listenerFn);
            }
        };
    }

    onRequest<K extends keyof OnlyRequest<IPCEvents, IPCType.Host>>(
        key: K,
        listener: (data: IPCEvents[K]["data"]) => MayPromise<Exclude<IPCEvents[K]["response"], never>>
    ): AppEventToken {
        const listenerFn = async (_event: Electron.IpcRendererEvent, data: IPCEvents[K]["data"]) => {
            const response = await listener(data);
            ipcRenderer.send(this.getEventName(key, SubNamespace.Reply), response);
        };
        ipcRenderer.on(this.getEventName(key), listenerFn);
        return {
            cancel: () => {
                ipcRenderer.off(this.getEventName(key), listenerFn);
            }
        };
    }
}

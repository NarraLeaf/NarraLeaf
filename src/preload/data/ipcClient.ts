import {IPC, IPCType, OnlyMessage, OnlyRequest, SubNamespace} from "@core/ipc/ipc";
import {IpcEvents} from "@core/ipc/events";
import {AppEventToken} from "@/main/electron/app/app";
import {ipcRenderer} from "electron";
import {MayPromise} from "@/utils/types";

export class IPCClient extends IPC<IpcEvents, IPCType.Client> {
    constructor(namespace: string) {
        super(IPCType.Client, namespace);
    }

    invoke<K extends keyof OnlyRequest<IpcEvents, IPCType.Host>>(key: K, data: IpcEvents[K]["data"]): Promise<Exclude<IpcEvents[K]["response"], never>> {
        return ipcRenderer.invoke(this.getEventName(key), data);
    }

    send<K extends keyof OnlyMessage<IpcEvents, IPCType.Host>>(key: K, data: IpcEvents[K]["data"]): void {
        return ipcRenderer.send(this.getEventName(key), data);
    }

    onMessage<K extends keyof OnlyMessage<IpcEvents, IPCType.Host>>(key: K, listener: (data: IpcEvents[K]["data"]) => void): AppEventToken {
        const listenerFn = (_event: Electron.IpcRendererEvent, data: IpcEvents[K]["data"]) => {
            listener(data);
        };
        ipcRenderer.on(this.getEventName(key), listenerFn);
        return {
            cancel: () => {
                ipcRenderer.off(this.getEventName(key), listenerFn);
            }
        };
    }

    onRequest<K extends keyof OnlyRequest<IpcEvents, IPCType.Host>>(
        key: K,
        listener: (data: IpcEvents[K]["data"]) => MayPromise<Exclude<IpcEvents[K]["response"], never>>
    ): AppEventToken {
        const listenerFn = async (_event: Electron.IpcRendererEvent, data: IpcEvents[K]["data"]) => {
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

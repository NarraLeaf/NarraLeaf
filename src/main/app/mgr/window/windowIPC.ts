import { IPCHost } from "@/main/app/mgr/window/ipcHost";
import { IPCEventType, Namespace } from "@core/ipc/events";
import { IPCMessageType } from "@core/ipc/ipc";
import { IPCHandler } from "./handler/IPCHandler";
import { WindowProxy } from "./windowProxy";

export class WindowIPC {
    private ipc: IPCHost;

    constructor(namespace: Namespace) {
        this.ipc = new IPCHost(namespace);
    }

    public registerHandler<T extends IPCEventType>(window: WindowProxy, handler: IPCHandler<T>): void {
        if (handler.type === IPCMessageType.request) {
            this.ipc.onRequest(window, handler.name, (data) => {
                const handled = handler.handle(window, data);
                if (handled instanceof Promise) {
                    return handled;
                }
                return Promise.resolve(handled);
            });
        } else {
            this.ipc.onMessage(window, handler.name, (data) => handler.handle(window, data));
        }
    }

    public getIPCHost(): IPCHost {
        return this.ipc;
    }
} 
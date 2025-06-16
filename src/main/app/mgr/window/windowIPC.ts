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
            this.ipc.onRequest<T>(window, handler.name, async (data) => {
                try {
                    const handled = await handler.handle(window, data);
                    return handled;
                } catch (error) {
                    return this.ipc.failed(error);
                }
            });
        } else {
            this.ipc.onMessage(window, handler.name, (data) => handler.handle(window, data));
        }
    }

    public getIPCHost(): IPCHost {
        return this.ipc;
    }
} 
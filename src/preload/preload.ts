import {IPCClient} from "@/preload/data/ipcClient";
import {IpcEvent, IpcEvents, Namespace} from "@core/ipc/events";
import {contextBridge} from "electron";
import {NarraLeafMainWorldProperty} from "@core/build/constants";

type Response<K extends keyof IpcEvents> = IpcEvents[K]["response"];

const ipcClient = new IPCClient(Namespace.NarraLeaf)

const APIs: Window["NarraLeaf"] = {
    getPlatform(): Promise<Response<IpcEvent.getPlatform>> {
        return ipcClient.invoke(IpcEvent.getPlatform, {});
    },
    app: {
        terminate(err: string | Error | null): void {
            ipcClient.send(IpcEvent.app_terminate, {
                err: err instanceof Error ? err.message : err,
            });
        }
    }
};

contextBridge.exposeInMainWorld(NarraLeafMainWorldProperty, APIs);

console.log("[NarraLeaf preload] Preload script loaded");

export {};

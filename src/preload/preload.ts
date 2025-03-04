import {IPCClient} from "@/preload/data/ipcClient";
import {IpcEvent, Namespace} from "@core/ipc/events";
import {contextBridge} from "electron";
import {RendererMainWorldProperty} from "@core/build/constants";
import {PlatformInfo} from "@/utils/pure/os";

const ipcClient = new IPCClient(Namespace.NarraLeaf)

const APIs: Window["NarraLeaf"] = {
    getPlatform(): Promise<{ platform: PlatformInfo }> {
        return ipcClient.invoke(IpcEvent.getPlatform, {});
    }
};

contextBridge.exposeInMainWorld(RendererMainWorldProperty, APIs);

console.log("[NarraLeaf preload] Preload script loaded");

export {};

import {IPCClient} from "@/preload/data/ipcClient";
import {IpcEvent, IpcEvents, Namespace} from "@core/ipc/events";
import {contextBridge} from "electron";
import {NarraLeafMainWorldProperty} from "@core/build/constants";
import {SaveType} from "@core/game/save";
import {generateId} from "@/utils/pure/string";

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
        },
    },
    game: {
        save: {
            save(gameData: Record<string, any>, id: string): Promise<Response<IpcEvent.game_save_save>> {
                return ipcClient.invoke(IpcEvent.game_save_save, {gameData, type: SaveType.Save, id});
            },
            quickSave(gameData: Record<string, any>): Promise<Response<IpcEvent.game_save_save>> {
                const id = generateId();
                return ipcClient.invoke(IpcEvent.game_save_save, {gameData, type: SaveType.QuickSave, id});
            },
            createRecovery(gameData: Record<string, any>): Promise<Response<IpcEvent.game_save_save>> {
                const id = generateId();
                return ipcClient.invoke(IpcEvent.game_save_save, {gameData, type: SaveType.Recovery, id});
            },
            read(id: string): Promise<Response<IpcEvent.game_save_read>> {
                return ipcClient.invoke(IpcEvent.game_save_read, {id});
            },
            list(): Promise<Response<IpcEvent.game_save_list>> {
                return ipcClient.invoke(IpcEvent.game_save_list, {});
            },
        },
    },
};

contextBridge.exposeInMainWorld(NarraLeafMainWorldProperty, APIs);

console.log("[NarraLeaf preload] Preload script loaded");

export {};

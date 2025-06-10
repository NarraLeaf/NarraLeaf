import {IPCClient} from "@/preload/data/ipcClient";
import {IPCEventType, IPCEvents, Namespace} from "@core/ipc/events";
import {contextBridge} from "electron";
import {NarraLeafMainWorldProperty, QuickSaveId} from "@core/build/constants";
import {SaveType} from "@core/game/save";
import {generateId} from "@/utils/pure/string";

type Response<K extends keyof IPCEvents> = IPCEvents[K]["response"];

const ipcClient = new IPCClient(Namespace.NarraLeaf)

const APIs: Window["NarraLeaf"] = {
    getPlatform(): Promise<Response<IPCEventType.getPlatform>> {
        return ipcClient.invoke(IPCEventType.getPlatform, {});
    },
    app: {
        terminate(err: string | Error | null): void {
            ipcClient.send(IPCEventType.appTerminate, {
                err: err instanceof Error ? err.message : err,
            });
        },
        requestMain(event: string, payload: any): Promise<Response<IPCEventType.appRequestMainEvent>> {
            return ipcClient.invoke(IPCEventType.appRequestMainEvent, {
                event,
                payload,
            });
        },
    },
    game: {
        save: {
            save(gameData: Record<string, any>, id: string, preview?: string): Promise<Response<IPCEventType.gameSaveGame>> {
                return ipcClient.invoke(IPCEventType.gameSaveGame, {gameData, type: SaveType.Save, id, preview});
            },
            quickSave(gameData: Record<string, any>): Promise<Response<IPCEventType.gameSaveGame>> {
                return ipcClient.invoke(IPCEventType.gameSaveGame, {gameData, type: SaveType.QuickSave, id: QuickSaveId});
            },
            createRecovery(gameData: Record<string, any>): Promise<Response<IPCEventType.gameSaveGame>> {
                const id = generateId();
                return ipcClient.invoke(IPCEventType.gameSaveGame, {gameData, type: SaveType.Recovery, id});
            },
            read(id: string): Promise<Response<IPCEventType.gameReadGame>> {
                return ipcClient.invoke(IPCEventType.gameReadGame, {id});
            },
            list(): Promise<Response<IPCEventType.gameListGame>> {
                return ipcClient.invoke(IPCEventType.gameListGame, {});
            },
        },
    },
};

contextBridge.exposeInMainWorld(NarraLeafMainWorldProperty, APIs);

console.log("[NarraLeaf preload] Preload script loaded");

export {};

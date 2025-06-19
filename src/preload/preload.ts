import {IPCClient} from "@/preload/data/ipcClient";
import {IPCEventType, IPCEvents, Namespace, RequestStatus} from "@core/ipc/events";
import {contextBridge} from "electron";
import {NarraLeaf, QuickSaveId} from "@core/build/constants";
import {SaveType} from "@core/game/save";
import {generateId} from "@/utils/pure/string";
import { AppInfo } from "@core/@types/global";

type Response<K extends keyof IPCEvents> = RequestStatus<IPCEvents[K]["response"]>;

const ipcClient = new IPCClient(Namespace.NarraLeaf)

const APIs: Window["NarraLeaf"] = {
    async getPlatform(): Promise<AppInfo> {
        const result = await ipcClient.invoke(IPCEventType.getPlatform, {});
        if (result.success) {
            return result.data;
        }
        throw new Error(result.error);
    },
    app: {
        reload(): void {
            ipcClient.send(IPCEventType.appReload, {});
        },
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

contextBridge.exposeInMainWorld(NarraLeaf, APIs);

console.log("[NarraLeaf preload] Preload script loaded");

export {};

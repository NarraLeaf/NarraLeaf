import {IPCClient} from "@main/preload/data/ipcClient";
import {IPCEventType, IPCEvents, Namespace, RequestStatus} from "@shared/types/ipcEvents";
import {contextBridge} from "electron";
import {NarraLeaf, QuickSaveId} from "@narraleaf/shared";
import {SaveType} from "@shared/types/save";
import {generateId} from "@shared/utils/string";
import { AppInfo } from "@shared/types/global";
import { AppEventToken } from "../app/types";

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
        state: {
            get(key: string): Promise<Response<IPCEventType.appGetState>> {
                return ipcClient.invoke(IPCEventType.appGetState, {name: key});
            },
            set(key: string, data: Record<string, any>): Promise<Response<IPCEventType.appSetState>> {
                return ipcClient.invoke(IPCEventType.appSetState, {name: key, data});
            },
            listen(key: string, listener: (data: Record<string, any>) => void): AppEventToken {
                return ipcClient.onMessage(IPCEventType.appAnnouceState, ({ name, data }) => {
                    if (name === key) {
                        listener(data);
                    }
                });
            },
        }
    },
};

contextBridge.exposeInMainWorld(NarraLeaf, APIs);
console.log("[NarraLeaf preload] Preload script loaded");

export {};
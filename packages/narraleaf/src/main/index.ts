import {App} from "@/main/app/app";
import {AppConfig} from "@/main/app/config";
import {AppWindow} from "@/main/app/mgr/window/appWindow";

export {
    App,
    AppConfig,
    AppWindow,
};
export type {StoreProvider} from "@/main/app/mgr/storage/storeProvider";
export {IPCEventType, Namespace} from "@shared/types/ipcEvents";
export type {IPCEvents, RequestStatus} from "@shared/types/ipcEvents";
export {assertSafeStorageKey, MAX_STORAGE_KEY_LENGTH} from "@/main/utils/safeStorageKey";
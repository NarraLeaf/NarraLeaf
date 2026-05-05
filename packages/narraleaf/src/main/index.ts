/**
 * Stable Electron **main-process** surface for the `narraleaf` package (`"narraleaf"` and `"narraleaf/main"`).
 *
 * Prefer {@link AppConfig#create} to construct {@link App}, then wire {@link App.onReady} before
 * {@link App.launchApp}. For renderer/preload contracts, see package docs and shared IPC types re-exported here.
 */
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
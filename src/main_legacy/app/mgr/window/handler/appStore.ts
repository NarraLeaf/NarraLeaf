import { IPCEventType } from "@/core/ipc/events";
import { IPCHandler, IPCHandlerProps } from "./IPCHandler";
import { IPCMessageType } from "@/core/ipc/ipc";
import { AppWindow } from "../appWindow";

export class AppGetJsonStoreHandler extends IPCHandler<IPCEventType.appGetJsonStore> {
    readonly name = IPCEventType.appGetJsonStore;
    readonly type = IPCMessageType.request;

    public async handle(window: AppWindow, {name}: IPCHandlerProps<IPCEventType.appGetJsonStore>) {
        const store = window.app.storageManager.getExposedJsonStore(name);
        if (!store) {
            return this.failed("Json store not found");
        }

        return this.tryUse(async () => await store.read() as Record<string, any>);
    }
}

export class AppSaveJsonStoreHandler extends IPCHandler<IPCEventType.appSaveJsonStore> {
    readonly name = IPCEventType.appSaveJsonStore;
    readonly type = IPCMessageType.request;

    public async handle(window: AppWindow, {name, data}: IPCHandlerProps<IPCEventType.appSaveJsonStore>) {
        const store = window.app.storageManager.getExposedJsonStore(name);
        if (!store) {
            return this.failed("Json store not found");
        }

        return this.tryUse(async () => await store.write(data));
    }
}

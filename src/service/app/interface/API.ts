import type { AppConfig } from "./App";
import { WindowConfig } from "./types";
import { Window } from "./window/Window";
import { MainServiceIPCClient } from "../ipc/socket";
import { RuntimeRequestTypes, RuntimeRequestPayload, RuntimeRequestResult, ServiceRequestTypes, ServiceRequestPayload, RuntimeResponseMessage } from "../ipc/protocol";
import { WindowManager } from "./window/WindowManager";
import { MessageHandler } from "../ipc/types";

export class API {
    protected readonly windowManager: WindowManager;
    constructor(
        protected readonly ipcClient: MainServiceIPCClient,
        protected readonly config: AppConfig
    ) {
        this.windowManager = new WindowManager(this);
    }

    public createWindow(config: WindowConfig): Promise<Window> {
        return this.windowManager.createWindow(config);
    }

    /**@internal */
    public sendRequest<T extends RuntimeRequestTypes = any>(
        ...args: [
            T,
            ...RuntimeRequestPayload[T] extends null ? [] : [RuntimeRequestPayload[T]]
        ]
    ): Promise<RuntimeResponseMessage<RuntimeRequestResult[T]>> {
        return this.ipcClient.sendRuntimeRequest(...args);
    }

    /**@internal */
    public onMessage<T extends ServiceRequestTypes = any>(
        requestType: T,
        callback: (payload: ServiceRequestPayload[T]) => void
    ): VoidFunction {
        return this.ipcClient.onMessage(requestType, callback);
    }

    /**@internal */
    public registerHandler<T extends ServiceRequestTypes>(requestType: T, handler: MessageHandler<T>): void {
        this.ipcClient.registerHandler(requestType, handler);
    }

    /**@internal */
    public unregisterHandler<T extends ServiceRequestTypes>(requestType: T): void {
        this.ipcClient.unregisterHandler(requestType);
    }
}

import type { AppConfig } from "./App";
import { WindowConfig } from "./types";
import { Window } from "./window/Window";
import { MainServiceIPCClient } from "../ipc/socket";
import { RuntimeRequestTypes, RuntimeRequestPayload, RuntimeRequestResult } from "../ipc/protocol";
import { ResponseMessage } from "../ipc/types";

export class API {
    constructor(
        protected readonly ipcClient: MainServiceIPCClient,
        protected readonly config: AppConfig
    ) {}

    public createWindow(config: WindowConfig): Promise<Window> {
        return Window.create(config, this);
    }

    /**@internal */
    public sendRequest<T extends RuntimeRequestTypes = any>(
        ...args: [
            T,
            ...RuntimeRequestPayload[T] extends null ? [] : [RuntimeRequestPayload[T]]
        ]
    ): Promise<ResponseMessage<RuntimeRequestResult[T]>> {
        return this.ipcClient.sendRequest(...args);
    }
}

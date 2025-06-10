import {IPC, IPCType, OnlyMessage, OnlyRequest, SubNamespace} from "@core/ipc/ipc";
import {IPCEvents, RequestStatus} from "@core/ipc/events";
import {AppEventToken} from "@/main/app/app";
import {ipcMain} from "electron";

export interface IPCWindow {
    getWebContents(): Electron.WebContents;
}

export class IPCHost extends IPC<IPCEvents, IPCType.Host> {
    private static handling: Record<string, boolean> = {};
    private static events: {
        [key: string]: Array<{
            handler: (data: any, resolve: (response: Exclude<any, never>) => void) => void,
            win: IPCWindow
        }>
    } = {};

    static handle<K extends keyof OnlyRequest<IPCEvents, IPCType.Host>>(
        namespace: string,
        win: IPCWindow,
        listener: (
            data: IPCEvents[K]["data"],
            resolve: (response: Exclude<IPCEvents[K]["response"], never>) => void
        ) => Promise<void>
    ): AppEventToken {
        if (!IPCHost.handling[namespace]) {
            IPCHost.handling[namespace] = true;
            ipcMain.handle(namespace, async (event, data) => {
                return await IPCHost.emitHandler(win, namespace, data);
            });
        }
        if (!IPCHost.events[namespace]) {
            IPCHost.events[namespace] = [];
        } else if (IPCHost.events[namespace].findIndex(listenerObj => listenerObj.win === win) !== -1) {
            console.warn(`Duplicate listener for IPC request: ${namespace}`);
        }
        IPCHost.events[namespace].push({
            handler: listener,
            win
        });

        return {
            cancel: () => {
                const index = IPCHost.events[namespace].findIndex(listenerObj => listenerObj.win === win);
                if (index !== -1) {
                    IPCHost.events[namespace].splice(index, 1);
                }
            }
        };
    }

    static off<K extends keyof OnlyMessage<IPCEvents, IPCType.Host>>(namespace: string, listener: (data: IPCEvents[K]["data"]) => void): void {
        const index = IPCHost.events[namespace].findIndex(listenerObj => listenerObj.handler === listener);
        if (index !== -1) {
            IPCHost.events[namespace].splice(index, 1);
        }
    }

    static emitHandler<K extends keyof OnlyRequest<IPCEvents, IPCType.Host>>(win: IPCWindow, namespace: string, data: IPCEvents[K]["data"]): Promise<IPCEvents[K]["response"]> {
        return new Promise(resolve => {

            for (const listener of IPCHost.events[namespace]) {
                if (listener.win !== win) {
                    continue;
                }
                console.info(`[IPC] Invoking listener for ${namespace}`);
                listener.handler(data, (data: IPCEvents[K]["response"]) => {
                    resolve(data);
                });
                return;
            }

            throw new Error(`Unhandled IPC request: ${namespace}`);
        });
    }

    constructor(namespace: string) {
        super(IPCType.Host, namespace);
    }

    invoke<K extends keyof OnlyRequest<IPCEvents, IPCType.Host>>(
        win: IPCWindow,
        key: K,
        data: IPCEvents[K]["data"]
    ): Promise<Exclude<IPCEvents[K]["response"], never>> {
        win.getWebContents().send(this.getEventName(key), data);
        return new Promise(resolve => {
            const handler = (event: Electron.IpcMainEvent, response: Exclude<IPCEvents[K]["response"], never>) => {
                if (event.sender !== win.getWebContents()) {
                    return;
                }
                resolve(response);
                ipcMain.removeListener(this.getEventName(key, SubNamespace.Reply), handler);
            };
            ipcMain.once(this.getEventName(key, SubNamespace.Reply), handler);
        });
    }

    send<K extends keyof OnlyMessage<IPCEvents, IPCType.Host>>(
        win: IPCWindow,
        key: K,
        data: IPCEvents[K]["data"]
    ): void {
        return win.getWebContents().send(this.getEventName(key), data);
    }

    onMessage<K extends keyof OnlyMessage<IPCEvents, IPCType.Host>>(
        win: IPCWindow,
        key: K,
        listener: (data: IPCEvents[K]["data"]) => void
    ): AppEventToken {
        const listenerFn = (event: Electron.IpcMainEvent, data: IPCEvents[K]["data"]) => {
            if (event.sender !== win.getWebContents()) {
                return;
            }
            listener(data);
        };
        ipcMain.on(this.getEventName(key), listenerFn);
        return {
            cancel: () => {
                ipcMain.removeListener(this.getEventName(key), listenerFn);
            }
        };
    }

    onRequest<K extends keyof OnlyRequest<IPCEvents, IPCType.Host>>(
        win: IPCWindow,
        key: K,
        listener: (data: IPCEvents[K]["data"]) => Promise<Exclude<IPCEvents[K]["response"], never>>
    ): AppEventToken {
        return IPCHost.handle(this.getEventName(key), win, async (data, resolve) => {
            resolve(await listener(data));
        });
    }

    public failed<T>(err: unknown): RequestStatus<T> {
        return {
            success: false,
            error: err instanceof Error ? err.message : String(err),
        };
    }

    public success<T>(data: T): RequestStatus<T>;
    public success(): RequestStatus<void>;
    public success<T = undefined>(data?: T extends undefined ? never : T): RequestStatus<T extends undefined ? void : T> {
        if (data !== undefined) {
            return {
                success: true,
                data,
            };
        }
        return {
            success: true,
            data: undefined as any,
        };
    }

    public async tryUse<T>(exec: () => T | Promise<T>): Promise<RequestStatus<T>> {
        try {
            const data = await exec();
            return this.success(data);
        } catch (err) {
            return this.failed(err);
        }
    }
}

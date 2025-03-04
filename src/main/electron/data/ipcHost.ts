import {IPC, IPCType, OnlyMessage, OnlyRequest, SubNamespace} from "@core/ipc/ipc";
import {IpcEvents} from "@core/ipc/events";
import {AppEventToken} from "@/main/electron/app/app";
import {AppWindow} from "@/main/electron/app/appWindow";
import {ipcMain} from "electron";

export class IPCHost extends IPC<IpcEvents, IPCType.Host> {
    private static handling: Record<string, boolean> = {};
    private static events: {
        [key: string]: Array<{
            handler: (data: any, resolve: (response: Exclude<any, never>) => void) => void,
            win: AppWindow
        }>
    } = {};

    static handle<K extends keyof OnlyRequest<IpcEvents, IPCType.Host>>(
        namespace: string,
        win: AppWindow,
        listener: (
            data: IpcEvents[K]["data"],
            resolve: (response: Exclude<IpcEvents[K]["response"], never>) => void
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

    static off<K extends keyof OnlyMessage<IpcEvents, IPCType.Host>>(namespace: string, listener: (data: IpcEvents[K]["data"]) => void): void {
        const index = IPCHost.events[namespace].findIndex(listenerObj => listenerObj.handler === listener);
        if (index !== -1) {
            IPCHost.events[namespace].splice(index, 1);
        }
    }

    static emitHandler<K extends keyof OnlyRequest<IpcEvents, IPCType.Host>>(win: AppWindow, namespace: string, data: IpcEvents[K]["data"]): Promise<IpcEvents[K]["response"]> {
        return new Promise(resolve => {

            for (const listener of IPCHost.events[namespace]) {
                if (listener.win !== win) {
                    continue;
                }
                console.info(`[IPC] Invoking listener for ${namespace}`);
                listener.handler(data, (data: IpcEvents[K]["response"]) => {
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

    invoke<K extends keyof OnlyRequest<IpcEvents, IPCType.Host>>(win: AppWindow, key: K, data: IpcEvents[K]["data"]): Promise<Exclude<IpcEvents[K]["response"], never>> {
        win.getWebContents().send(this.getEventName(key), data);
        return new Promise(resolve => {
            const handler = (event: Electron.IpcMainEvent, response: Exclude<IpcEvents[K]["response"], never>) => {
                if (event.sender !== win.getWebContents()) {
                    return;
                }
                resolve(response);
                ipcMain.removeListener(this.getEventName(key, SubNamespace.Reply), handler);
            };
            ipcMain.once(this.getEventName(key, SubNamespace.Reply), handler);
        });
    }

    send<K extends keyof OnlyMessage<IpcEvents, IPCType.Host>>(win: AppWindow, key: K, data: IpcEvents[K]["data"]): void {
        return win.getWebContents().send(this.getEventName(key), data);
    }

    onMessage<K extends keyof OnlyMessage<IpcEvents, IPCType.Host>>(win: AppWindow, key: K, listener: (data: IpcEvents[K]["data"]) => void): AppEventToken {
        const listenerFn = (event: Electron.IpcMainEvent, data: IpcEvents[K]["data"]) => {
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

    onRequest<K extends keyof OnlyRequest<IpcEvents, IPCType.Host>>(
        win: AppWindow,
        key: K,
        listener: (data: IpcEvents[K]["data"]) => Promise<Exclude<IpcEvents[K]["response"], never>>
    ): AppEventToken {
        return IPCHost.handle(this.getEventName(key), win, async (data, resolve) => {
            resolve(await listener(data));
        });
    }
}

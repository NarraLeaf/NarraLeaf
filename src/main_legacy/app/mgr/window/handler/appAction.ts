import { IPCEventType, RequestStatus } from "@/core/ipc/events";
import { IPCMessageType } from "@/core/ipc/ipc";
import { AppWindow } from "../appWindow";
import { IPCHandler, IPCHandlerProps } from "./IPCHandler";

export class AppTerminateHandler extends IPCHandler<IPCEventType.appTerminate> {
    readonly name = IPCEventType.appTerminate;
    readonly type = IPCMessageType.message;

    public handle(window: AppWindow, {err}: IPCHandlerProps<IPCEventType.appTerminate>) {
        if (err) {
            const timestamp = new Date().toISOString();
            window.app.logger.error(`The App is terminating due to an error: ${err}`);
            window.app.logger.error(`App Crashed at ${timestamp}`);
            window.app.crash(err);
        } else {
            window.app.quit();
        }
        return { success: true, data: null as never };
    }
}

export class AppRequestMainEventHandler extends IPCHandler<IPCEventType.appRequestMainEvent> {
    readonly name = IPCEventType.appRequestMainEvent;
    readonly type = IPCMessageType.request;

    public async handle(window: AppWindow, {event, payload}: IPCHandlerProps<IPCEventType.appRequestMainEvent>) {
        if (window.isUserEventHandled(event)) {
            try {
                return this.success(await window.invokeUserEvent(event, payload));
            } catch (error) {
                return this.failed(error);
            }
        }
        return this.failed(`Event ${event} not found`);
    }
}

export class AppReloadHandler extends IPCHandler<IPCEventType.appReload> {
    readonly name = IPCEventType.appReload;
    readonly type = IPCMessageType.message;

    public handle(window: AppWindow, {}: IPCHandlerProps<IPCEventType.appReload>) {
        window.win.webContents.reload();
        return { success: true, data: null as never };
    }
}

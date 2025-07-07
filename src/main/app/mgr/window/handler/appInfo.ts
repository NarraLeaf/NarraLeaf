import { IPCEventType } from "@/core/ipc/events";
import { IPCMessageType } from "@/core/ipc/ipc";
import { AppWindow } from "../appWindow";
import { IPCHandler } from "./IPCHandler";

export class AppInfoHandler extends IPCHandler<IPCEventType.getPlatform> {
    readonly name = IPCEventType.getPlatform;
    readonly type = IPCMessageType.request;

    public handle(window: AppWindow) {
        return this.success({
            platform: window.app.platform,
            isPackaged: window.app.isPackaged(),
            crashReport: window.app.getCrashReport(),
            config: window.getClientAppConfig(),
        });
    };
}

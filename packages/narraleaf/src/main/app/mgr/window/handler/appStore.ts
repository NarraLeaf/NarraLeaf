import { IPCEventType } from "@shared/types/ipcEvents";
import { IPCHandler, IPCHandlerProps } from "./IPCHandler";
import { IPCMessageType } from "@shared/types/ipc";
import { AppWindow } from "../appWindow";

export class AppGetStateHandler extends IPCHandler<IPCEventType.appGetState> {
    readonly name = IPCEventType.appGetState;
    readonly type = IPCMessageType.request;

    public async handle(window: AppWindow, {name}: IPCHandlerProps<IPCEventType.appGetState>) {
        const state = window.app.storageManager.getState(name);
        if (!state) {
            return this.failed(`State with name "${name}" not found. All states need to be exposed using the \`app.createState\` method.`);
        }

        return this.tryUse(async () => await state.read());
    }
}

export class AppSaveStateHandler extends IPCHandler<IPCEventType.appSetState> {
    readonly name = IPCEventType.appSetState;
    readonly type = IPCMessageType.request;

    public async handle(window: AppWindow, {name, data}: IPCHandlerProps<IPCEventType.appSetState>) {
        const state = window.app.storageManager.getState(name);
        if (!state) {
            return this.failed(`State with name "${name}" not found. All states need to be exposed using the \`app.createState\` method.`);
        }

        return this.tryUse(async () => await state.write(data));
    }
}

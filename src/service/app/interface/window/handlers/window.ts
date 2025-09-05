import { ServiceRequestResult } from "@/service/app/ipc/protocol";
import { MessageHandler, ServiceRequestMessage, ServiceResponseMessage } from "@/service/app/ipc/types";
import { WindowManager } from "../WindowManager";

export class WindowCloseEventHandler implements MessageHandler<"sidecar:window.on_close"> {
    constructor(private readonly manager: WindowManager) {
    }

    public async handleMessage(message: ServiceRequestMessage<"sidecar:window.on_close">): Promise<ServiceResponseMessage<ServiceRequestResult["sidecar:window.on_close"]>> {
        const windowLabel = message.payload.label;
        if (windowLabel && this.manager.hasWindow(windowLabel)) {
            this.manager.closeWindow(windowLabel);
        }

        return {
            type: "ServiceResponse",
            id: message.id,
            success: true,
            data: void 0,
        };
    }
}

/*!
 * Window Event Handlers
 *
 * Handles window-related events and sidecar communication
 * for window lifecycle management.
 */

import { ServiceRequestMessage, ServiceResponseMessage } from "../../../ipc/types";
import { ServiceRequestResult } from "../../../ipc/protocol";
import { WindowManager } from "../WindowManager";

/**
 * Window Close Event Handler
 *
 * Handles window close events from the sidecar
 */
export class WindowCloseEventHandler {
    constructor(private windowManager: WindowManager) {}

    /**
     * Handle window close event
     */
    async handleMessage(message: ServiceRequestMessage<"sidecar:window.on_close">): Promise<ServiceResponseMessage<ServiceRequestResult["sidecar:window.on_close"]> | null> {
        const { label } = message.payload;
        
        // Find and close the window
        const window = this.windowManager.getWindow(label);
        if (window && !window.isClosed()) {
            window.dispose();
        }

        // Remove from window manager
        this.windowManager.closeWindow(label);

        return {
            type: 'ServiceResponse',
            id: message.id,
            success: true,
            data: undefined
        };
    }
}
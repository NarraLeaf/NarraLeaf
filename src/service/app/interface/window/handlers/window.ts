/*!
 * Window Event Handlers
 *
 * Handles window-related events and sidecar communication
 * for window lifecycle management.
 */

import { ServiceRequestMessage, ServiceResponseMessage } from "../../../ipc/types";
import { ServiceRequestResult } from "../../../ipc/protocol";
import { WindowManager } from "../WindowManager";
import { Window } from "../Window";

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

/**
 * Window Ready Event Handler
 *
 * Handles window ready events from Tauri
 */
export class WindowReadyEventHandler {
    constructor(private windowManager: WindowManager) {}

    /**
     * Handle window ready event
     */
    async handleMessage(message: ServiceRequestMessage<"sidecar:window.on_ready">): Promise<ServiceResponseMessage<ServiceRequestResult["sidecar:window.on_ready"]> | null> {
        const { window_label } = message.payload;
        
        // Create a proxy for the main window
        const mainWindowConfig = {
            label: window_label,
            title: "Main Window",
            width: 1200,
            height: 800,
            center: true,
            decorations: true,
            alwaysOnTop: false,
            taskbar: true,
            show: true,
            resizable: true,
            closable: true,
            minimizable: true,
            maximizable: true,
            focus: false,
            transparent: false,
            fullscreen: false,
        };

        // Create window proxy (this doesn't actually create a window, just a proxy)
        const mainWindow = await Window.createProxy(mainWindowConfig, this.windowManager['api']);
        
        // Set the main window in the manager
        this.windowManager.setMainWindow(mainWindow);

        return {
            type: 'ServiceResponse',
            id: message.id,
            success: true,
            data: undefined
        };
    }
}
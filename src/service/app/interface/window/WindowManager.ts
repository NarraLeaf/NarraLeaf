/*!
 * Window Manager
 *
 * NEW ARCHITECTURE: Manages the main window proxy and provides centralized
 * window lifecycle management and event handling.
 * 
 * In the new architecture:
 * - Only manages the main window created by Tauri
 * - Receives window events from Tauri (onReady, onClose)
 * - No longer creates windows directly
 */

import { ServiceRequestResult } from "../../ipc/protocol";
import { MessageHandler, ServiceRequestMessage, ServiceResponseMessage } from "../../ipc/types";
import { API } from "../API";
import { Window, WindowConfig } from "./Window";
import { WindowCloseEventHandler, WindowReadyEventHandler } from "./handlers/window";

export class WindowManager {
    private readonly api: API;
    private readonly windows: Map<string, Window> = new Map();
    private readonly cleanup: (() => void)[] = [];
    private mainWindow: Window | null = null;
    private mainWindowReady: boolean = false;

    constructor(api: API) {
        this.api = api;
        this.setupServiceHandler();
    }

    /**
     * Create a new window and add it to the manager
     */
    public async createWindow(config: WindowConfig): Promise<Window> {
        throw new Error("Window creation is not supported in the new architecture. Only the main window managed by Tauri is allowed.");
    }

    /**
     * Get the main window proxy
     * Returns null if the main window is not ready yet
     */
    public getMainWindow(): Window | null {
        return this.mainWindow;
    }

    /**
     * Check if the main window is ready
     */
    public isMainWindowReady(): boolean {
        return this.mainWindowReady;
    }

    /**
     * Set the main window proxy (called when window is ready)
     */
    public setMainWindow(window: Window): void {
        this.mainWindow = window;
        this.mainWindowReady = true;
        this.windows.set("main", window);
    }

    /**
     * Get all active windows
     */
    public getAllWindows(): Window[] {
        return Array.from(this.windows.values());
    }

    /**
     * Get window by label
     */
    public getWindow(label: string): Window | undefined {
        return this.windows.get(label);
    }

    /**
     * Check if window exists
     */
    public hasWindow(label: string): boolean {
        return this.windows.has(label);
    }

    /**
     * Get window count
     */
    public getWindowCount(): number {
        return this.windows.size;
    }

    /**
     * Close all windows
     */
    public async closeAllWindows(): Promise<void> {
        const closePromises = Array.from(this.windows.values())
            .filter(window => !window.isClosed())
            .map(window => window.close());
        await Promise.all(closePromises);
    }

    /**
     * Close window by label
     */
    public async closeWindow(label: string): Promise<void> {
        const window = this.windows.get(label);
        if (window && !window.isClosed()) {
            window.dispose();
        }

        this.windows.delete(label);
    }

    /**
     * Get window labels
     */
    public getWindowLabels(): string[] {
        return Array.from(this.windows.keys());
    }

    /**
     * Check if any windows are open
     */
    public hasOpenWindows(): boolean {
        return this.windows.size > 0;
    }

    /**
     * Setup service handler to prevent event listeners from being lost
     */
    private setupServiceHandler(): void {
        // Register handler for window ready events
        this.api.registerHandler("sidecar:window.on_ready", new WindowReadyEventHandler(this));
        
        // Register handler for window close events
        this.api.registerHandler("sidecar:window.on_close", new WindowCloseEventHandler(this));
        
        // Add cleanup function to unregister the handlers
        this.cleanup.push(() => {
            this.api.unregisterHandler("sidecar:window.on_ready");
            this.api.unregisterHandler("sidecar:window.on_close");
        });
    }

    /**
     * Cleanup all resources
     */
    public dispose(): void {
        this.cleanup.forEach(cleanup => cleanup());
        this.cleanup.length = 0;
        this.windows.clear();

        this.closeAllWindows();
    }
}
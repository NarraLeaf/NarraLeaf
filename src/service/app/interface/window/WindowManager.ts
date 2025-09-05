import { ServiceRequestResult } from "../../ipc/protocol";
import { MessageHandler, ServiceRequestMessage, ServiceResponseMessage } from "../../ipc/types";
import { API } from "../API";
import { WindowCloseEventHandler } from "./handlers/window";
import { Window, WindowConfig } from "./Window";

export class WindowManager {
    private readonly api: API;
    private readonly windows: Map<string, Window> = new Map();
    private readonly cleanup: (() => void)[] = [];

    constructor(api: API) {
        this.api = api;
        this.setupServiceHandler();
    }

    /**
     * Create a new window and add it to the manager
     */
    public async createWindow(config: WindowConfig): Promise<Window> {
        const window = await Window.create(config, this.api);
        this.windows.set(config.label, window);
        
        return window;
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
     * Setup service handler to prevent event listeners from being lost
     */
    private setupServiceHandler(): void {
        // Register handler for window close events
        this.api.registerHandler("sidecar:window.on_close", new WindowCloseEventHandler(this));
        
        // Add cleanup function to unregister the handler
        this.cleanup.push(() => {
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
}

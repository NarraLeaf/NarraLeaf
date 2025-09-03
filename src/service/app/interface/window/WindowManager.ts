import { API } from "../API";
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
            await window.close();
        }
    }

    /**
     * Setup service handler to prevent event listeners from being lost
     */
    private setupServiceHandler(): void {
        // Register handler for window close events
        const unregister = this.api.onMessage("sidecar:window.on_close", (payload: { label: string; timestamp: number }) => {
            // Extract window label from payload
            const windowLabel = payload.label;
            if (windowLabel && this.windows.has(windowLabel)) {
                // Get the window instance and mark it as closed
                const window = this.windows.get(windowLabel);
                if (window) {
                    window.dispose();
                }
                
                // Remove the closed window from our map
                this.windows.delete(windowLabel);
            }
        });

        this.cleanup.push(unregister);
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

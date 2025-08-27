import { App, HookEvents } from "../app";
import { SidecarService } from "../sidecarService";
import path from "path";

export interface WindowConfig {
    width?: number;
    height?: number;
    x?: number;
    y?: number;
    title?: string;
    url?: string;
}

export class WindowManager {
    private windows: Map<string, string> = new Map(); // windowId -> label mapping

    constructor(
        private app: SidecarService,
    ) {}

    public initialize(): void {
        // In Sidecar mode, window management is handled through Tauri API
        this.app.logger.info('WindowManager initialized in Sidecar mode');
    }

    public async createWindow(config: WindowConfig): Promise<{ id: string }> {
        try {
            const windowLabel = `window_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            // Send request to Tauri process to create window
            const result = await this.app.sendTauriRequest('window.create', {
                label: windowLabel,
                config: {
                    width: config.width || 1200,
                    height: config.height || 800,
                    x: config.x,
                    y: config.y,
                    title: config.title || 'NarraLeaf',
                    url: config.url || this.getDefaultUrl(),
                }
            });

            const windowId = result.id || windowLabel;
            this.windows.set(windowId, windowLabel);

            this.app.logger.info(`Created window: ${windowId}`);
            return { id: windowId };
        } catch (error) {
            this.app.logger.error('Failed to create window:' + (error as Error).message);
            throw error;
        }
    }

    public async closeWindow(windowId: string): Promise<void> {
        try {
            const windowLabel = this.windows.get(windowId);
            if (!windowLabel) {
                throw new Error(`Window not found: ${windowId}`);
            }

            await this.app.sendTauriRequest('window.close', {
                label: windowLabel
            });

            this.windows.delete(windowId);
            this.app.logger.info(`Closed window: ${windowId}`);
        } catch (error) {
            this.app.logger.error('Failed to close window:' + (error as Error).message);
            throw error;
        }
    }

    public async focusWindow(windowId: string): Promise<void> {
        try {
            const windowLabel = this.windows.get(windowId);
            if (!windowLabel) {
                throw new Error(`Window not found: ${windowId}`);
            }

            await this.app.sendTauriRequest('window.focus', {
                label: windowLabel
            });

            this.app.logger.info(`Focused window: ${windowId}`);
        } catch (error) {
            this.app.logger.error('Failed to focus window:' + (error as Error).message);
            throw error;
        }
    }

    public getWindowLabel(windowId: string): string | null {
        return this.windows.get(windowId) || null;
    }

    public getAllWindows(): string[] {
        return Array.from(this.windows.keys());
    }

    private getDefaultUrl(): string {
        // In Sidecar mode, return the appropriate URL for the renderer
        if (this.app.isHttpDevServerMode()) {
            const devServerPort = this.app.devToolManager.getMetadata().httpMode?.port ?? 3000;
            return `http://localhost:${devServerPort}/`;
        } else {
            // Return app:// protocol URL that will be handled by Tauri
            return 'app://index.html';
        }
    }

    public async launchMainWindow(config: Partial<WindowConfig> = {}): Promise<{ id: string }> {
        return this.createWindow({
            ...config,
            title: config.title || 'NarraLeaf'
        });
    }

    public getMainWindow(): { id: string } | null {
        const windows = this.getAllWindows();
        return windows.length > 0 ? { id: windows[0] } : null;
    }

    public closeMainWindow(): void {
        const mainWindow = this.getMainWindow();
        if (mainWindow) {
            this.closeWindow(mainWindow.id).catch(error => {
                this.app.logger.error('Failed to close main window:' + (error as Error).message);
            });
        }
    }
} 
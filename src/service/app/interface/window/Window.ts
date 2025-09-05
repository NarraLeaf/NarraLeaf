/*!
 * Window Class
 *
 * Represents a single window instance with its configuration,
 * lifecycle management, and operation methods.
 */

import { mergeConfig } from "@/service/utils/data";
import { ServiceError } from "@/service/utils/error";
import { RuntimeRequestPayload, RuntimeRequestResult } from "../../ipc/protocol";
import { API } from "../API";
import EventEmitter from "node:events";
import { WindowConfig, WindowRequestTypes, WindowEvents } from "./types";

// Re-export types for external use
export type { WindowConfig, WindowRequestTypes, WindowEvents } from "./types";

export class Window {
    private readonly config: WindowConfig;
    private readonly api: API;
    private readonly label: string;
    private cleanup: (() => void)[] = [];
    private closed: boolean = false;
    private events: EventEmitter<WindowEvents> = new EventEmitter();

    /**@internal */
    private static readonly DefaultConfig: WindowConfig = {
        label: "",
        title: "",
        width: 1200,
        height: 800,
        center: false,
        decorations: true,
        alwaysOnTop: false,
        taskbar: true,
        show: false,
        resizable: true,
        closable: true,
        minimizable: true,
        maximizable: true,
        focus: false,
        transparent: false,
        fullscreen: false,
    };

    /**@internal */
    public static create(config: WindowConfig, api: API): Promise<Window> {
        return new Window(config, api).initialize();
    }

    private constructor(config: WindowConfig, api: API) {
        this.config = mergeConfig(config, Window.DefaultConfig);
        this.api = api;
        this.label = config.label;
    }

    /**
     * Maximizes the window to fill the entire screen
     */
    public maximize(): Promise<this> { 
        return this.chainRequests("tauri:window.maximize", {}); 
    }
    
    /**
     * Minimizes the window to the taskbar
     */
    public minimize(): Promise<this> { 
        return this.chainRequests("tauri:window.minimize", {}); 
    }
    
    /**
     * Makes the window visible to the user
     */
    public show(): Promise<this> { 
        return this.chainRequests("tauri:window.show", {}); 
    }
    
    /**
     * Hides the window from view
     */
    public hide(): Promise<this> { 
        return this.chainRequests("tauri:window.hide", {}); 
    }
    
    /**
     * Brings the window to front and gives it keyboard focus
     */
    public setFocus(): Promise<this> { 
        return this.chainRequests("tauri:window.set_focus", {}); 
    }
    
    /**
     * Moves the window to the specified screen coordinates
     * @param x Horizontal position in pixels from left edge
     * @param y Vertical position in pixels from top edge
     */
    public setPosition(x: number, y: number): Promise<this> { 
        return this.chainRequests("tauri:window.set_position", { x, y }); 
    }
    
    /**
     * Resizes the window to the specified dimensions
     * @param width New width in pixels
     * @param height New height in pixels
     */
    public setSize(width: number, height: number): Promise<this> { 
        return this.chainRequests("tauri:window.set_size", { width, height }); 
    }
    
    /**
     * Changes the window title displayed in title bar and taskbar
     * @param title New window title text
     */
    public setTitle(title: string): Promise<this> { 
        return this.chainRequests("tauri:window.set_title", { title }); 
    }
    
    /**
     * Centers the window on the primary display
     */
    public center(): Promise<this> { 
        return this.chainRequests("tauri:window.center", {}); 
    }
    
    /**
     * Shows or hides window decorations (title bar, borders, controls)
     * @param decorations Whether to show window decorations
     */
    public setDecorations(decorations: boolean): Promise<this> { 
        return this.chainRequests("tauri:window.set_decorations", { decorations }); 
    }
    
    /**
     * Enables or disables window resizing by user
     * @param resizable Whether the window can be resized
     */
    public setResizable(resizable: boolean): Promise<this> { 
        return this.chainRequests("tauri:window.set_resizable", { resizable }); 
    }
    
    /**
     * Enables or disables the close button
     * @param closable Whether the window can be closed by user
     */
    public setClosable(closable: boolean): Promise<this> { 
        return this.chainRequests("tauri:window.set_closable", { closable }); 
    }
    
    /**
     * Enables or disables the minimize button
     * @param minimizable Whether the window can be minimized
     */
    public setMinimizable(minimizable: boolean): Promise<this> { 
        return this.chainRequests("tauri:window.set_minimizable", { minimizable }); 
    }
    
    /**
     * Enables or disables the maximize button
     * @param maximizable Whether the window can be maximized
     */
    public setMaximizable(maximizable: boolean): Promise<this> { 
        return this.chainRequests("tauri:window.set_maximizable", { maximizable }); 
    }
    
    /**
     * Makes the window background transparent (only works during creation)
     * @param transparent Whether the window should be transparent
     */
    public setTransparent(transparent: boolean): Promise<this> { 
        return this.chainRequests("tauri:window.set_transparent", { transparent }); 
    }
    
    /**
     * Switches the window to or from fullscreen mode
     * @param fullscreen Whether the window should be fullscreen
     */
    public setFullscreen(fullscreen: boolean): Promise<this> { 
        return this.chainRequests("tauri:window.set_fullscreen", { fullscreen }); 
    }
    
    /**
     * Navigates the window to a new URL
     * @param url The URL to navigate to
     */
    public setUrl(url: string): Promise<this> { 
        return this.chainRequests("tauri:window.set_url", { url }); 
    }

    /**
     * Closes the window and cleans up resources
     */
    public async close(): Promise<void> {
        if (this.closed) {
            return;
        }

        await this.chainRequests("tauri:window.close", {});
        this.dispose();
    }

    /**
     * Checks if the window has been closed
     * @returns True if the window is closed, false otherwise
     */
    public isClosed(): boolean {
        return this.closed;
    }

    /**
     * Register a close event listener
     */
    public onClose(callback: () => void): void {
        this.events.on("closed", callback);
    }

    /**
     * Unregister a close event listener
     */
    public offClose(callback: () => void): void {
        this.events.off("closed", callback);
    }

    /**
     * Initialize the window
     */
    private async initialize(): Promise<this> {
        return await this.chainRequests("tauri:window.create", {
            title: this.config.title,
            width: this.config.width,
            height: this.config.height,
            center: this.config.center,
            decorations: this.config.decorations,
            always_on_top: this.config.alwaysOnTop,
            skip_taskbar: !this.config.taskbar,
            show: this.config.show,
            resizable: this.config.resizable,
            closable: this.config.closable,
            minimizable: this.config.minimizable,
            maximizable: this.config.maximizable,
            focus: this.config.focus,
            transparent: this.config.transparent,
            fullscreen: this.config.fullscreen,
            x: this.config.x,
            y: this.config.y,
            url: this.config.url,
        });
    }

    /**
     * Execute a window request
     */
    private async request<T extends WindowRequestTypes>(
        requestType: T,
        payload: Omit<RuntimeRequestPayload[T], "label">
    ): Promise<RuntimeRequestResult[T]> {
        if (this.closed) {
            throw new ServiceError(`Trying to execute requests on a closed window (label: ${this.label})`);
        }

        const result = await this.api.sendRequest(...[requestType, ...[{
            ...payload,
            label: this.config.label,
        }]] as [
            T,
            ...(RuntimeRequestPayload[T] extends null ? [] : [RuntimeRequestPayload[T]])
        ]);

        if (!result.success) {
            throw new ServiceError(`Failed to execute request ${requestType}: ${result.error}`);
        }

        return result.data;
    }

    /**
     * Chain window requests for fluent API
     */
    private async chainRequests<T extends WindowRequestTypes>(
        requestType: T,
        payload: Omit<RuntimeRequestPayload[T], "label">
    ): Promise<this> {
        await this.request(requestType, payload);
        return this;
    }

    /**@internal */
    public dispose(): void {
        this.closed = true;
        this.cleanup.forEach(cleanup => cleanup());
        this.cleanup = [];
        this.events.emit("closed");
    }
}
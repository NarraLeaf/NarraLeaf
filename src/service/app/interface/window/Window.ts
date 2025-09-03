import { mergeConfig } from "@/service/utils/data";
import { SidecarServiceError } from "@/service/utils/error";
import { RuntimeRequestPayload, RuntimeRequestResult } from "../../ipc/protocol";
import { API } from "../API";

export interface WindowConfig {
    /**
     * Unique identifier for the window.
     * 
     * This label is used internally by Tauri to track and manage the window.
     * It must be unique across all windows in the application and should be
     * a valid string identifier. This label is used for window operations
     * like showing, hiding, focusing, and closing specific windows.
     * 
     * @example "main-window", "settings-dialog", "game-screen"
     */
    label: string;

    /**
     * Window title displayed in the title bar and taskbar.
     * 
     * This is the human-readable title that appears in the window's title bar,
     * taskbar entry, and window switcher. It's separate from the document title
     * that might be set in the web content.
     */
    title: string;

    /**
     * Initial width of the window in pixels.
     * 
     * Sets the horizontal size of the window when it's first created.
     * The window can be resized by the user unless resizing is disabled.
     * 
     * @minimum 1
     */
    width: number;

    /**
     * Initial height of the window in pixels.
     * 
     * Sets the vertical size of the window when it's first created.
     * The window can be resized by the user unless resizing is disabled.
     * 
     * @minimum 1
     */
    height: number;

    /**
     * Initial horizontal position of the window on screen.
     * 
     * Sets the X coordinate (distance from left edge of screen) where
     * the window will be positioned when created. If not specified,
     * the window will use the system's default positioning logic.
     * 
     * @optional
     */
    x?: number;

    /**
     * Initial vertical position of the window on screen.
     * 
     * Sets the Y coordinate (distance from top edge of screen) where
     * the window will be positioned when created. If not specified,
     * the window will use the system's default positioning logic.
     * 
     * @optional
     */
    y?: number;

    /**
     * Whether to center the window on screen when created.
     * 
     * When set to true, the window will be automatically positioned
     * at the center of the primary display, ignoring any x/y coordinates
     * that might be set. This is useful for creating dialogs or
     * modal windows that should appear centered.
     * 
     * @optional
     * @default false
     */
    center?: boolean;

    /**
     * Whether to show window decorations (title bar, borders, etc.).
     * 
     * Window decorations include the title bar, minimize/maximize/close buttons,
     * and window borders. When set to false, the window becomes borderless
     * and the application must provide its own window controls.
     * 
     * @optional
     * @default true
     */
    decorations?: boolean;

    /**
     * Whether the window should always stay on top of other windows.
     * 
     * When enabled, the window will remain visible above other applications
     * even when they are focused. Useful for tool windows, notifications,
     * or other UI elements that need to remain visible.
     * 
     * @optional
     * @default false
     */
    alwaysOnTop?: boolean;

    /**
     * Whether the window should appear in the taskbar.
     * 
     * When set to false, the window will not show up in the system taskbar
     * or dock. This is useful for background windows, tool windows,
     * or windows that should be hidden from the user's task switching.
     * 
     * @optional
     * @default true
     */
    taskbar?: boolean;

    /**
     * Whether the window should be visible immediately after creation.
     * 
     * When set to false (default), the window is created but remains hidden.
     * You can show it later using window.show(). When set to true,
     * the window becomes visible immediately after creation.
     * 
     * @optional
     * @default false
     */
    show?: boolean;

    /**
     * Whether the window can be resized by the user.
     * 
     * When set to false, the window size is fixed and cannot be changed
     * by dragging the window borders or using the maximize button.
     * This is useful for dialogs, tool windows, or other UI elements
     * that should maintain a specific size.
     * 
     * @optional
     * @default true
     */
    resizable?: boolean;

    /**
     * Whether the window can be closed by the user.
     * 
     * When set to false, the close button in the title bar is disabled
     * and the window cannot be closed through normal user interaction.
     * The window can still be closed programmatically. This is useful
     * for critical windows that should not be accidentally closed.
     * 
     * @optional
     * @default true
     */
    closable?: boolean;

    /**
     * Whether the window can be minimized by the user.
     * 
     * When set to false, the minimize button in the title bar is disabled
     * and the window cannot be minimized through normal user interaction.
     * The window can still be minimized programmatically. This is useful
     * for windows that should always remain visible.
     * 
     * @optional
     * @default true
     */
    minimizable?: boolean;

    /**
     * Whether the window can be maximized by the user.
     * 
     * When set to false, the maximize button in the title bar is disabled
     * and the window cannot be maximized through normal user interaction.
     * The window can still be maximized programmatically. This is useful
     * for windows that should maintain their specific size.
     * 
     * @optional
     * @default true
     */
    maximizable?: boolean;

    /**
     * Whether the window should be focused when created.
     * 
     * When set to true, the window will receive keyboard focus immediately
     * after creation. This is useful for main application windows or
     * dialogs that should be ready for user input.
     * 
     * @optional
     * @default false
     */
    focus?: boolean;

    /**
     * Whether the window should be transparent.
     * 
     * When set to true, the window background becomes transparent,
     * allowing content behind the window to show through. This is useful
     * for creating overlay effects or custom window shapes.
     * 
     * @optional
     * @default false
     */
    transparent?: boolean;

    /**
     * Whether the window should be fullscreen when created.
     * 
     * When set to true, the window will be created in fullscreen mode,
     * taking up the entire screen and hiding the taskbar/dock.
     * This is useful for games, presentations, or immersive applications.
     * 
     * @optional
     * @default false
     */
    fullscreen?: boolean;

    /**
     * The URL to load into the window. 
     * @optional
     */
    url?: string;
};

export type WindowRequestTypes = 
   "tauri:window.create" |
   "tauri:window.maximize" |
   "tauri:window.minimize" |
   "tauri:window.close" |
   "tauri:window.show" |
   "tauri:window.hide" |
   "tauri:window.set_focus" |
   "tauri:window.set_position" |
   "tauri:window.set_size" |
   "tauri:window.set_title" |
   "tauri:window.center" |
   "tauri:window.set_decorations" |
   "tauri:window.set_resizable" |
   "tauri:window.set_closable" |
   "tauri:window.set_minimizable" |
   "tauri:window.set_maximizable" |
   "tauri:window.set_transparent" |
   "tauri:window.set_fullscreen" |
   "tauri:window.set_url";

export class Window {
    private readonly config: WindowConfig;
    private readonly api: API;
    private readonly label: string;
    private cleanup: (() => void)[] = [];
    private closed: boolean = false;

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

    public maximize(): Promise<this> { return this.chainRequests("tauri:window.maximize", {}); }
    public minimize(): Promise<this> { return this.chainRequests("tauri:window.minimize", {}); }
    public show(): Promise<this> { return this.chainRequests("tauri:window.show", {}); }
    public hide(): Promise<this> { return this.chainRequests("tauri:window.hide", {}); }
    public setFocus(): Promise<this> { return this.chainRequests("tauri:window.set_focus", {}); }
    public setPosition(x: number, y: number): Promise<this> { return this.chainRequests("tauri:window.set_position", { x, y }); }
    public setSize(width: number, height: number): Promise<this> { return this.chainRequests("tauri:window.set_size", { width, height }); }
    public setTitle(title: string): Promise<this> { return this.chainRequests("tauri:window.set_title", { title }); }
    public center(): Promise<this> { return this.chainRequests("tauri:window.center", {}); }
    public setDecorations(decorations: boolean): Promise<this> { return this.chainRequests("tauri:window.set_decorations", { decorations }); }
    public setResizable(resizable: boolean): Promise<this> { return this.chainRequests("tauri:window.set_resizable", { resizable }); }
    public setClosable(closable: boolean): Promise<this> { return this.chainRequests("tauri:window.set_closable", { closable }); }
    public setMinimizable(minimizable: boolean): Promise<this> { return this.chainRequests("tauri:window.set_minimizable", { minimizable }); }
    public setMaximizable(maximizable: boolean): Promise<this> { return this.chainRequests("tauri:window.set_maximizable", { maximizable }); }
    public setTransparent(transparent: boolean): Promise<this> { return this.chainRequests("tauri:window.set_transparent", { transparent }); }
    public setFullscreen(fullscreen: boolean): Promise<this> { return this.chainRequests("tauri:window.set_fullscreen", { fullscreen }); }
    public setUrl(url: string): Promise<this> { return this.chainRequests("tauri:window.set_url", { url }); }

    public async close(): Promise<void> {
        if (this.closed) {
            return;
        }

        await this.chainRequests("tauri:window.close", {});

        this.dispose();
    }

    public isClosed(): boolean {
        return this.closed;
    }


    private async initialize(): Promise<this> {
        return await this.chainRequests("tauri:window.create", {
            title: this.config.title,
            width: this.config.width,
            height: this.config.height,
            center: this.config.center,
            decorations: this.config.decorations,
            always_on_top: this.config.alwaysOnTop,
            skip_taskbar: this.config.taskbar,
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

    private async request<T extends WindowRequestTypes>(
        requestType: T,
        payload: Omit<RuntimeRequestPayload[T], "label">
    ): Promise<RuntimeRequestResult[T]> {
        if (this.closed) {
            throw new SidecarServiceError(`Trying to execute requests on a closed window (label: ${this.label})`);
        }

        const result = await this.api.sendRequest(...[requestType, ...[{
            ...payload,
            label: this.config.label,
        }]] as [
            T,
            ...(RuntimeRequestPayload[T] extends null ? [] : [RuntimeRequestPayload[T]])
        ]);

        if (!result.success) {
            throw new SidecarServiceError(`Failed to execute request ${requestType}: ${result.error}`);
        }

        return result.data;
    }

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
    }
}

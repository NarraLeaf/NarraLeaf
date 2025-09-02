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
};

export class Window {
    private config: WindowConfig;
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

    constructor(config: WindowConfig) {
        this.config = config;
    }
}

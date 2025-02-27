import {App, AppEventToken} from "@/main/electron/app/app";
import {BrowserWindow, WebPreferences} from "electron";
import _ from "lodash";

export interface WindowConfig {
    isolated: boolean;
    waitUntilReady: boolean;
    /**
     * https://www.electronjs.org/docs/latest/api/browser-window#setting-the-backgroundcolor-property
     *
     * Examples of valid `backgroundColor` values:
     *
     * * Hex
     *   * #fff (shorthand RGB)
     *   * #ffff (shorthand ARGB)
     *   * #ffffff (RGB)
     *   * #ffffffff (ARGB)
     * * RGB
     *   * `rgb\(([\d]+),\s*([\d]+),\s*([\d]+)\)`
     *     * e.g. rgb(255, 255, 255)
     * * RGBA
     *   * `rgba\(([\d]+),\s*([\d]+),\s*([\d]+),\s*([\d.]+)\)`
     *     * e.g. rgba(255, 255, 255, 1.0)
     * * HSL
     *   * `hsl\((-?[\d.]+),\s*([\d.]+)%,\s*([\d.]+)%\)`
     *     * e.g. hsl(200, 20%, 50%)
     * * HSLA
     *   * `hsla\((-?[\d.]+),\s*([\d.]+)%,\s*([\d.]+)%,\s*([\d.]+)\)`
     *     * e.g. hsla(200, 20%, 50%, 0.5)
     * * Color name
     *   * Options are listed in SkParseColor.cpp
     *   * Similar to CSS Color Module Level 3 keywords, but case-sensitive.
     *     * e.g. `blueviolet` or `red`
     */
    backgroundColor: string;
    width?: number;
    height?: number;
    devTools?: boolean;
}

export class AppWindow {
    public static readonly DefaultConfig: WindowConfig = {
        isolated: true,
        waitUntilReady: true,
        backgroundColor: "#fff"
    }
    public readonly app: App;
    public readonly config: WindowConfig;
    public readonly win: BrowserWindow;

    constructor(app: App, config: Partial<WindowConfig>) {
        this.app = app;
        this.config = _.defaultsDeep(config, AppWindow.DefaultConfig);
        this.win = new BrowserWindow({
            webPreferences: this.getWebPreference(),
            width: this.config.width,
            height: this.config.height,
        });

        this.prepare();
    }

    prepare() {
        this.win.setBackgroundColor(this.config.backgroundColor);
    }

    getWebPreference(): WebPreferences {
        return {
            contextIsolation: this.config.isolated,
        };
    }

    onClosed(fn: () => void): AppEventToken {
        this.win.on("closed", () => {
            fn();
        });
        return {
            cancel: () => {
                this.win.removeListener("closed", fn);
            }
        };
    }

    public getWebContents() {
        return this.win.webContents;
    }

    public onKeyUp(key: KeyboardEvent["key"], fn: () => void): AppEventToken {
        const handler = (event: Electron.Event, input: Electron.Input) => {
            if (input.type === "keyUp" && input.key === key) {
                fn();
                event.preventDefault();
            }
        };
        this.getWebContents().on("before-input-event", handler);
        return {
            cancel: () => {
                this.getWebContents().removeListener("before-input-event", handler);
            }
        };
    }

    public toggleDevTools() {
        this.win.webContents.toggleDevTools();
    }

    async show(): Promise<void> {
        if (!this.config.waitUntilReady) {
            this.win.show();
        }
        return new Promise<void>(resolve => {
            this.win.once("ready-to-show", () => {
                this.win.show();
                resolve();
            });
        });
    }

    async loadURL(url: string): Promise<void> {
        return this.win.loadURL(url);
    }

    async loadFile(file: string): Promise<void> {
        return this.win.loadFile(file);
    }
}


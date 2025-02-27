import {app} from "electron";
import {AppConfig} from "@/main/electron/app/config";
import {EventEmitter} from "events";
import {AppWindow, WindowConfig} from "@/main/electron/app/appWindow";
import {RendererOutputHTMLFileName} from "@core/build/constants";
import {CriticalMainProcessError} from "@/main/error/criticalError";
import {Platform, PlatformInfo, safeExecuteFn} from "@/utils/pure/os";
import {TempNamespace} from "@core/constants/tempNamespace";
import path from "path";

type AppEvents = {
    "ready": [];
};

export type AppEventToken = {
    cancel(): void;
};

export class App {
    public static Events = {
        Ready: "ready"
    } as const;
    public readonly electronApp: Electron.App;
    public readonly events: EventEmitter<AppEvents> = new EventEmitter();
    public readonly platform: PlatformInfo;

    constructor(public config: AppConfig) {
        this.electronApp = app;
        this.platform = Platform.getInfo(process);

        this.prepare();
    }

    onReady(fn: (...args: AppEvents["ready"]) => void): AppEventToken {
        const handler = () => {
            safeExecuteFn(fn);
        };
        this.events.on<"ready">(App.Events.Ready, handler);

        return {
            cancel: () => {
                this.events.off(App.Events.Ready, handler);
            }
        };
    }

    createWindow(config: Partial<WindowConfig>): AppWindow {
        return new AppWindow(this, config);
    }

    getConfig() {
        return this.config.getConfig(this.platform);
    }

    prepare() {
        const config = this.config.getConfig(this.platform);
        if (!this.electronApp && !app) {
            throw new CriticalMainProcessError("Electron app is not available");
        }
        this.electronApp.whenReady().then(() => {
            this.events.emit(App.Events.Ready);
            if (config.forceSandbox) {
                this.electronApp.enableSandbox();
            }
        });
    }

    public getEntryFile(): string {
        const appDir = this.electronApp.getAppPath();
        return path.resolve(appDir, TempNamespace.RendererBuild, RendererOutputHTMLFileName);
    }

    public terminate(): void {
        this.electronApp.quit();
    }

    public async launchApp(config: Partial<WindowConfig> = {}): Promise<AppWindow> {
        const win = new AppWindow(this, config);
        await win.loadFile(this.getEntryFile());
        await win.show();

        return win;
    }
}

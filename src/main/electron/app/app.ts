import {app} from "electron";
import {AppConfig} from "@/main/electron/app/config";
import {EventEmitter} from "events";
import {safeExecuteFn} from "@/utils/userInput";
import {Platform, PlatformInfo} from "@/utils/platform";
import {AppWindow, WindowConfig} from "@/main/electron/app/appWindow";
import {RendererOutputHTMLFileName, Separator} from "@core/build/constants";
import {CriticalMainProcessError} from "@/main/error/criticalError";
import {TempNamespace} from "@core/project/project";

type AppEvents = {
    "ready": [];
};

type AppEventToken = {
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
        this.events.on<"ready">(App.Events.Ready, () => {
            safeExecuteFn(fn);
        });

        return {
            cancel: () => {
                this.events.off(App.Events.Ready, fn);
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
        const prefix = `..${Separator}`.repeat(
            TempNamespace.MainBuild.split(Separator).filter(Boolean).length
        );
        return `${prefix}${TempNamespace.RendererBuild}${Separator}${RendererOutputHTMLFileName}`;
    }

    public terminate(): void {
        this.electronApp.quit();
    }
}

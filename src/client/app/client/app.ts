import {AppInfo} from "@core/@types/global";
import {CrashReport} from "@/main/electron/app/app";


export interface AppConfig {
    appInfo: AppInfo;
}

export class App {
    public readonly appInfo: AppInfo;

    constructor(config: AppConfig) {
        this.appInfo = config.appInfo;
    }

    getCrashReport(): CrashReport | null {
        return this.appInfo.crashReport;
    }
}


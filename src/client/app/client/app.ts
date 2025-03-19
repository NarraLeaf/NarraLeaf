import {AppInfo} from "@core/@types/global";


export interface AppConfig {
    appInfo: AppInfo;
}

export class App {
    public readonly appInfo: AppInfo;

    constructor(config: AppConfig) {
        this.appInfo = config.appInfo;
    }

}


import _ from "lodash";
import {App} from "@/main/app/app";
import {PlatformInfo, PlatformSystem} from "@/utils/pure/os";
import {StoreProvider} from "@/main/app/mgr/storage/storeProvider";
import { CrashManager, DevToolManager, MenuManager, ProtocolManager, StorageManager, WindowManager } from "./mgr/managers";

export interface BaseAppConfig {
    forceSandbox: boolean;
    recoveryCreationInterval: number;
    appErrorHandling: "terminate" | "raw" | "restart";
    deleteCorruptedSaves: boolean;
    store?: StoreProvider;
}

export interface IWindowsConfig {
    /**
     * Application icon path relative to the project root
     *
     * should be a path to a .ico file
     */
    appIcon?: string;
}

export interface ILinuxConfig {
    /**
     * Application icon path relative to the project root
     *
     * should be a path to a .png file
     */
    appIcon?: string;
}

export interface IMacConfig {
    /**
     * Application icon path relative to the project root
     *
     * should be a path to a .icns file
     */
    appIcon?: string;
}

type PlatformConfigMap = {
    [MainPlatform.Windows]: IWindowsConfig;
    [MainPlatform.Linux]: ILinuxConfig;
    [MainPlatform.Mac]: IMacConfig;
};

export enum MainPlatform {
    Windows = "windows",
    Linux = "linux",
    Mac = "mac"
}

export class AppConfig {
    public static readonly DefaultBaseConfig: BaseAppConfig = {
        forceSandbox: false,
        recoveryCreationInterval: 5000,
        appErrorHandling: "terminate",
        deleteCorruptedSaves: false,
    };
    public static readonly DefaultWindowsConfig: IWindowsConfig = {};
    public static readonly DefaultLinuxConfig: ILinuxConfig = {};
    public static readonly DefaultMacConfig: IMacConfig = {};
    public static Platform = MainPlatform;

    public baseConfig: BaseAppConfig;
    public platformConfigs: PlatformConfigMap;

    constructor(baseConfig: Partial<BaseAppConfig> = {}) {
        this.baseConfig = _.defaultsDeep(baseConfig, AppConfig.DefaultBaseConfig);
        this.platformConfigs = {
            [MainPlatform.Windows]: AppConfig.DefaultWindowsConfig,
            [MainPlatform.Linux]: AppConfig.DefaultLinuxConfig,
            [MainPlatform.Mac]: AppConfig.DefaultMacConfig
        };
    }

    configure(platform: MainPlatform, config: Partial<PlatformConfigMap[MainPlatform]>): this {
        this.platformConfigs[platform] = _.defaultsDeep(config, this.platformConfigs[platform]);
        return this;
    }

    configWindows(config: Partial<IWindowsConfig>): this {
        return this.configure(MainPlatform.Windows, config);
    }

    configLinux(config: Partial<ILinuxConfig>): this {
        return this.configure(MainPlatform.Linux, config);
    }

    configMac(config: Partial<IMacConfig>): this {
        return this.configure(MainPlatform.Mac, config);
    }

    create(): App {
        return new App(this);
    }

    getMainPlatform(platform: PlatformInfo): MainPlatform {
        switch (platform.system) {
            case PlatformSystem.win32:
                return MainPlatform.Windows;
            case PlatformSystem.linux:
                return MainPlatform.Linux;
            case PlatformSystem.darwin:
                return MainPlatform.Mac;
            default:
                throw new Error(`Unsupported platform: ${platform.system}`);
        }
    }

    getConfig(platform: PlatformInfo): BaseAppConfig & PlatformConfigMap[MainPlatform] {
        const mainPlatform = this.getMainPlatform(platform);
        return _.defaultsDeep(this.baseConfig, this.platformConfigs[mainPlatform]);
    }
}

export const AppLifeCycleViolationTimeout = 5000;

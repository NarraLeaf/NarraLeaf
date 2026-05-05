import { defaultsDeep } from "lodash";
import {App} from "@/main/app/app";
import {PlatformInfo, PlatformSystem} from "@shared/utils/os";
import {StoreProvider} from "@/main/app/mgr/storage/storeProvider";
import { MainPlatform } from "@narraleaf/shared";

/** Cross-platform knobs merged into {@link AppConfig} and ultimately consumed by {@link App}. */
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

/**
 * Mutable configuration builder for {@link App}: deep-merges base + per-OS slices, then {@link AppConfig#create}.
 */
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
        this.baseConfig = defaultsDeep(baseConfig, AppConfig.DefaultBaseConfig);
        this.platformConfigs = {
            [MainPlatform.Windows]: AppConfig.DefaultWindowsConfig,
            [MainPlatform.Linux]: AppConfig.DefaultLinuxConfig,
            [MainPlatform.Mac]: AppConfig.DefaultMacConfig
        };
    }

    /**
     * Deep-merges `config` into the stored settings for `platform` (chainable).
     */
    public configure(platform: MainPlatform, config: Partial<PlatformConfigMap[MainPlatform]>): this {
        this.platformConfigs[platform] = defaultsDeep(config, this.platformConfigs[platform]);
        return this;
    }

    /** @see {@link configure} */
    public configWindows(config: Partial<IWindowsConfig>): this {
        return this.configure(MainPlatform.Windows, config);
    }

    /** @see {@link configure} */
    public configLinux(config: Partial<ILinuxConfig>): this {
        return this.configure(MainPlatform.Linux, config);
    }

    /** @see {@link configure} */
    public configMac(config: Partial<IMacConfig>): this {
        return this.configure(MainPlatform.Mac, config);
    }

    /**
     * Builds a main-process {@link App} from this configuration.
     *
     * Prefer this over calling {@link App.create} directly so construction stays tied to the merged `AppConfig`.
     *
     * @returns A new {@link App} ready for {@link App.onReady} / lifecycle wiring.
     *
     * @example
     * ```ts
     * import { AppConfig } from "narraleaf";
     *
     * const app = new AppConfig({ appErrorHandling: "restart" })
     *   .configWindows({ appIcon: "build/icon.ico" })
     *   .create();
     *
     * app.onReady(() => {
     *   void app.launchApp();
     * });
     * ```
     */
    public create(): App {
        return App.create(this);
    }

    /** Maps detailed {@link PlatformInfo} to a {@link MainPlatform} bucket. */
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

    /** Merged {@link BaseAppConfig} plus the resolved per-OS slice for `platform`. */
    getConfig(platform: PlatformInfo): BaseAppConfig & PlatformConfigMap[MainPlatform] {
        const mainPlatform = this.getMainPlatform(platform);
        return defaultsDeep(this.baseConfig, this.platformConfigs[mainPlatform]);
    }
}

export const AppLifeCycleViolationTimeout = 5000;

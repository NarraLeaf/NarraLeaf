import { defaultsDeep } from "lodash";
import {App} from "@/main/app/app";
import {PlatformInfo, PlatformSystem} from "@shared/utils/os";
import {StoreProvider} from "@/main/app/mgr/storage/storeProvider";
import { MainPlatform } from "@narraleaf/shared";

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
     * Configures platform-specific settings for the application.
     * Merges the provided configuration with existing platform settings using deep merge.
     * 
     * @param platform - The target platform to configure
     * @param config - Partial configuration object to merge with existing settings
     * @returns This instance for method chaining
     */
    public configure(platform: MainPlatform, config: Partial<PlatformConfigMap[MainPlatform]>): this {
        this.platformConfigs[platform] = defaultsDeep(config, this.platformConfigs[platform]);
        return this;
    }

    /**
     * Configures Windows-specific application settings.
     * Convenience method for configuring Windows platform settings.
     * 
     * @param config - Partial Windows configuration object
     * @returns This instance for method chaining
     */
    public configWindows(config: Partial<IWindowsConfig>): this {
        return this.configure(MainPlatform.Windows, config);
    }

    /**
     * Configures Linux-specific application settings.
     * Convenience method for configuring Linux platform settings.
     * 
     * @param config - Partial Linux configuration object
     * @returns This instance for method chaining
     */
    public configLinux(config: Partial<ILinuxConfig>): this {
        return this.configure(MainPlatform.Linux, config);
    }

    /**
     * Configures macOS-specific application settings.
     * Convenience method for configuring macOS platform settings.
     * 
     * @param config - Partial macOS configuration object
     * @returns This instance for method chaining
     */
    public configMac(config: Partial<IMacConfig>): this {
        return this.configure(MainPlatform.Mac, config);
    }

    /**
     * Creates and returns a new App instance using this configuration.
     * Initializes the application with the configured settings.
     * 
     * @returns A new App instance configured with this AppConfig
     */
    public create(): App {
        return App.create(this);
    }

    /**
     * Maps platform information to the corresponding MainPlatform enum value.
     * Converts detailed platform info to simplified platform categories.
     * 
     * @param platform - Platform information object containing system details
     * @returns The corresponding MainPlatform enum value
     * @throws Error if the platform system is not supported
     */
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

    /**
     * Retrieves the complete configuration for a specific platform.
     * Merges base configuration with platform-specific settings.
     * 
     * @param platform - Platform information to get configuration for
     * @returns Merged configuration object containing both base and platform-specific settings
     */
    getConfig(platform: PlatformInfo): BaseAppConfig & PlatformConfigMap[MainPlatform] {
        const mainPlatform = this.getMainPlatform(platform);
        return defaultsDeep(this.baseConfig, this.platformConfigs[mainPlatform]);
    }
}

export const AppLifeCycleViolationTimeout = 5000;

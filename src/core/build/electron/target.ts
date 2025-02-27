import {
    Configuration,
    LinuxConfiguration,
    MacConfiguration,
    PlatformSpecificBuildOptions,
    TargetConfiguration,
    TargetSpecificOptions,
    WindowsConfiguration
} from "electron-builder";
import {MainPlatform} from "@/main/electron/app/config";

export enum WindowsBuildTarget {
    nsis = "nsis",
    nsisWeb = "nsis-web",
    portable = "portable",
    appx = "appx",
    msi = "msi",
    msiWrapped = "msi-wrapped",
    squirrel = "squirrel",
    sevenZip = "7z",
    zip = "zip",
    tarXz = "tar.xz",
    tarLz = "tar.lz",
    tarGz = "tar.gz",
    tarBz2 = "tar.bz2",
    dir = "dir",
}

export enum ArchType {
    x64 = "x64",
    ia32 = "ia32",
    armv7l = "armv7l",
    arm64 = "arm64",
    universal = "universal",
}

export interface IBaseBuildConfig {
    asar: boolean;
    extend: Configuration;
}

export interface IBaseTargetConfig {
    arch?: ArchType | ArchType[];
}

export interface IWindowsBuildConfig extends IBaseTargetConfig {
    target: WindowsBuildTarget | string;
}

export abstract class BuildTarget {
    public static WindowsBuildTarget = WindowsBuildTarget;

    public static isTarget(t: any): t is BuildTarget {
        return t != null && t.__sig === "BuildTarget";
    }

    public static Windows(config: IWindowsBuildConfig) {
        return new WindowsConfig(config);
    }

    public static Mac(config: IBaseTargetConfig) {
        return new MacConfig(config);
    }

    public static Linux(config: IBaseTargetConfig) {
        return new LinuxConfig(config);
    }

    static createTarget(targets: BuildTarget | BuildTarget[]): TargetConfiguration[] {
        return Array.isArray(targets)
            ? targets.map(t => t.toTargetConfiguration())
            : [targets.toTargetConfiguration()];
    }

    static createCommonConfig(targets: BuildTarget | BuildTarget[]): Configuration {
        const platforms: {
            [MainPlatform.Windows]?: WindowsConfig,
            [MainPlatform.Mac]?: MacConfig,
            [MainPlatform.Linux]?: LinuxConfig,
        } = {};

        const buildTargets = Array.isArray(targets) ? targets : [targets];
        for (const target of buildTargets) {
            platforms[target.getTargetFlag()] = target as any;
        }

        return {
            win: platforms[MainPlatform.Windows]?.toPlatformConfiguration(),
            ...platforms[MainPlatform.Windows]?.toTargetOptions(),
            mac: platforms[MainPlatform.Mac]?.toPlatformConfiguration(),
            ...platforms[MainPlatform.Mac]?.toTargetOptions(),
            linux: platforms[MainPlatform.Linux]?.toPlatformConfiguration(),
            ...platforms[MainPlatform.Linux]?.toTargetOptions(),
        };
    }

    private __sig = "BuildTarget";

    protected constructor(public config: IBaseTargetConfig) {
    }

    abstract toTargetConfiguration(): TargetConfiguration;

    abstract toPlatformConfiguration(): PlatformSpecificBuildOptions;

    abstract toTargetOptions(): TargetSpecificOptions;

    abstract getTargetFlag(): MainPlatform;
}

export class WindowsConfig extends BuildTarget {
    constructor(public config: IWindowsBuildConfig) {
        super(config);
    }

    toTargetConfiguration(): TargetConfiguration {
        return {
            target: this.config.target,
            arch: this.config.arch
        };
    }

    toPlatformConfiguration(): WindowsConfiguration {
        return {
            signtoolOptions: {
                sign: null,
            }
        };
    }

    toTargetOptions(): TargetSpecificOptions {
        if (this.config.target === WindowsBuildTarget.dir) {
            return {
                publish: null
            };
        }

        throw new Error(`Unsupported Windows target: ${this.config.target}`);
    }

    getTargetFlag(): MainPlatform {
        return MainPlatform.Windows;
    }
}

export class MacConfig extends BuildTarget {
    constructor(public config: IBaseTargetConfig) {
        super(config);
    }

    toTargetConfiguration(): TargetConfiguration {
        return {
            target: MainPlatform.Mac,
            arch: this.config.arch
        };
    }

    toPlatformConfiguration(): MacConfiguration {
        return {};
    }

    toTargetOptions(): TargetSpecificOptions {
        return {};
    }

    getTargetFlag(): MainPlatform {
        return MainPlatform.Mac;
    }
}

export class LinuxConfig extends BuildTarget {
    constructor(public config: IBaseTargetConfig) {
        super(config);
    }

    toTargetConfiguration(): TargetConfiguration {
        return {
            target: MainPlatform.Linux,
            arch: this.config.arch
        };
    }

    toPlatformConfiguration(): LinuxConfiguration {
        return {};
    }

    toTargetOptions(): TargetSpecificOptions {
        return {};
    }

    getTargetFlag(): MainPlatform {
        return MainPlatform.Linux;
    }
}



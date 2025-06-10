import {PlatformBuildTarget} from "./base";
import {TargetConfiguration, TargetSpecificOptions, WindowsConfiguration} from "electron-builder";
import {IBaseTargetConfig} from "./types";
import {MainPlatform} from "@/main/app/config";

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

export interface IWindowsBuildConfig extends IBaseTargetConfig {
    target: WindowsBuildTarget | string;
}

export class WindowsConfig extends PlatformBuildTarget {
    public static WindowsBuildTarget = WindowsBuildTarget;

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
            },
            icon: this.config.icon,
        };
    }

    toTargetOptions(): TargetSpecificOptions {
        switch (this.config.target) {
            case WindowsBuildTarget.dir:
                return {
                    publish: null
                };
            case WindowsBuildTarget.nsis:
            case WindowsBuildTarget.nsisWeb:
                return {
                    artifactName: "${productName}-Setup-${version}.${ext}"
                };
            case WindowsBuildTarget.portable:
                return {
                    artifactName: "${productName}-Portable-${version}.${ext}"
                };
            case WindowsBuildTarget.appx:
                return {
                    artifactName: "${productName}-${version}.${ext}"
                };
            case WindowsBuildTarget.msi:
            case WindowsBuildTarget.msiWrapped:
                return {
                    artifactName: "${productName}-${version}.${ext}"
                };
            case WindowsBuildTarget.squirrel:
                return {
                    artifactName: "${productName}-${version}.${ext}"
                };
            case WindowsBuildTarget.sevenZip:
            case WindowsBuildTarget.zip:
            case WindowsBuildTarget.tarXz:
            case WindowsBuildTarget.tarLz:
            case WindowsBuildTarget.tarGz:
            case WindowsBuildTarget.tarBz2:
                return {
                    artifactName: "${productName}-${version}.${ext}"
                };
            default:
                throw new Error(`Unsupported Windows target: ${this.config.target}`);
        }
    }

    getTargetFlag(): MainPlatform {
        return MainPlatform.Windows;
    }
} 
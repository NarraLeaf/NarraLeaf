import {PlatformBuildTarget} from "./base";
import {TargetConfiguration, TargetSpecificOptions, LinuxConfiguration, CompressionLevel} from "electron-builder";
import {IBaseTargetConfig} from "./types";
import {MainPlatform} from "@/main/electron/app/config";

export enum LinuxBuildTarget {
    AppImage = "AppImage",
    snap = "snap",
    deb = "deb",
    rpm = "rpm",
    pacman = "pacman",
    p5p = "p5p",
    apk = "apk",
    freebsd = "freebsd",
    pkg = "pkg",
    zip = "zip",
    tarXz = "tar.xz",
    tarLz = "tar.lz",
    tarGz = "tar.gz",
    tarBz2 = "tar.bz2",
    dir = "dir",
}

interface IAppImageTargetOptions extends TargetSpecificOptions {
    category?: string;
    license?: string;
}

interface ISnapTargetOptions extends TargetSpecificOptions {
    confinement?: "strict" | "classic" | "devmode";
    grade?: "stable" | "devel";
}

interface IDebTargetOptions extends TargetSpecificOptions {
    depends?: string[];
    recommends?: string[];
    suggests?: string[];
    conflicts?: string[];
    provides?: string[];
}

interface IRpmTargetOptions extends TargetSpecificOptions {
    depends?: string[];
    recommends?: string[];
    suggests?: string[];
    conflicts?: string[];
    provides?: string[];
}

export interface ILinuxBuildConfig extends IBaseTargetConfig {
    target: LinuxBuildTarget | string;
    category?: string;
    maintainer?: string;
    vendor?: string;
    synopsis?: string;
    description?: string;
    mimeTypes?: string[];
    desktop?: {
        Name?: string;
        Comment?: string;
        GenericName?: string;
        Categories?: string;
        Keywords?: string;
        MimeType?: string;
        StartupWMClass?: string;
        [key: string]: any;
    };
    executableName?: string;
    packageCategory?: string;
    compression?: CompressionLevel;
    depends?: string[];
    recommends?: string[];
    suggests?: string[];
    conflicts?: string[];
    provides?: string[];
    fpm?: string[];
    afterInstall?: string;
    afterRemove?: string;
    maintainerEmail?: string;
    homepage?: string;
    license?: string;
    [key: string]: any;
}

export class LinuxConfig extends PlatformBuildTarget {
    constructor(public config: ILinuxBuildConfig) {
        super(config);
    }

    toTargetConfiguration(): TargetConfiguration {
        return {
            target: this.config.target,
            arch: this.config.arch,
        };
    }

    toPlatformConfiguration(): LinuxConfiguration {
        return {
            icon: this.config.icon,
            category: this.config.category,
            maintainer: this.config.maintainer,
            vendor: this.config.vendor,
            synopsis: this.config.synopsis,
            description: this.config.description,
            mimeTypes: this.config.mimeTypes,
            desktop: this.config.desktop,
            executableName: this.config.executableName,
            packageCategory: this.config.packageCategory,
            compression: this.config.compression,
        };
    }

    toTargetOptions(): TargetSpecificOptions {
        switch (this.config.target) {
            case LinuxBuildTarget.AppImage:
                return {
                    artifactName: "${productName}-${version}.${ext}",
                    category: this.config.category || "Development",
                    license: this.config.license || "MIT",
                } as IAppImageTargetOptions;
            case LinuxBuildTarget.snap:
                return {
                    artifactName: "${productName}-${version}.${ext}",
                    confinement: "strict",
                    grade: "stable",
                } as ISnapTargetOptions;
            case LinuxBuildTarget.deb:
                return {
                    artifactName: "${productName}-${version}.${ext}",
                    depends: this.config.depends || [],
                    recommends: this.config.recommends || [],
                    suggests: this.config.suggests || [],
                    conflicts: this.config.conflicts || [],
                    provides: this.config.provides || [],
                } as IDebTargetOptions;
            case LinuxBuildTarget.rpm:
                return {
                    artifactName: "${productName}-${version}.${ext}",
                    depends: this.config.depends || [],
                    recommends: this.config.recommends || [],
                    suggests: this.config.suggests || [],
                    conflicts: this.config.conflicts || [],
                    provides: this.config.provides || [],
                } as IRpmTargetOptions;
            case LinuxBuildTarget.pacman:
            case LinuxBuildTarget.p5p:
            case LinuxBuildTarget.apk:
            case LinuxBuildTarget.freebsd:
            case LinuxBuildTarget.pkg:
                return {
                    artifactName: "${productName}-${version}.${ext}"
                };
            case LinuxBuildTarget.zip:
            case LinuxBuildTarget.tarXz:
            case LinuxBuildTarget.tarLz:
            case LinuxBuildTarget.tarGz:
            case LinuxBuildTarget.tarBz2:
                return {
                    artifactName: "${productName}-${version}.${ext}"
                };
            case LinuxBuildTarget.dir:
                return {
                    publish: null
                };
            default:
                throw new Error(`Unsupported Linux target: ${this.config.target}`);
        }
    }

    getTargetFlag(): MainPlatform {
        return MainPlatform.Linux;
    }
} 
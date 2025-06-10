import {PlatformBuildTarget} from "./base";
import {TargetConfiguration, TargetSpecificOptions, MacConfiguration} from "electron-builder";
import {IBaseTargetConfig} from "./types";
import {MainPlatform} from "@/main/app/config";

export enum MacBuildTarget {
    dmg = "dmg",
    zip = "zip",
    tarXz = "tar.xz",
    tarLz = "tar.lz",
    tarGz = "tar.gz",
    tarBz2 = "tar.bz2",
    dir = "dir",
    pkg = "pkg",
    mas = "mas",
    masDev = "mas-dev",
}

export interface IMacBuildConfig extends IBaseTargetConfig {
    target: MacBuildTarget | string;
    identity?: string;
    hardenedRuntime?: boolean;
    gatekeeperAssess?: boolean;
    entitlements?: string;
    entitlementsInherit?: string;
    bundleVersion?: string;
    bundleShortVersion?: string;
    darkModeSupport?: boolean;
    extendInfo?: { [key: string]: any };
}

export class MacConfig extends PlatformBuildTarget {
    constructor(public config: IMacBuildConfig) {
        super(config);
    }

    toTargetConfiguration(): TargetConfiguration {
        return {
            target: this.config.target,
            arch: this.config.arch
        };
    }

    toPlatformConfiguration(): MacConfiguration {
        return {
            icon: this.config.icon,
            identity: this.config.identity,
            hardenedRuntime: this.config.hardenedRuntime,
            gatekeeperAssess: this.config.gatekeeperAssess,
            entitlements: this.config.entitlements,
            entitlementsInherit: this.config.entitlementsInherit,
            bundleVersion: this.config.bundleVersion,
            bundleShortVersion: this.config.bundleShortVersion,
            darkModeSupport: this.config.darkModeSupport,
            extendInfo: this.config.extendInfo,
        };
    }

    toTargetOptions(): TargetSpecificOptions {
        switch (this.config.target) {
            case MacBuildTarget.dmg:
                return {
                    artifactName: "${productName}-${version}.${ext}",
                };
            case MacBuildTarget.pkg:
                return {
                    artifactName: "${productName}-${version}.${ext}"
                };
            case MacBuildTarget.zip:
            case MacBuildTarget.tarXz:
            case MacBuildTarget.tarLz:
            case MacBuildTarget.tarGz:
            case MacBuildTarget.tarBz2:
                return {
                    artifactName: "${productName}-${version}.${ext}"
                };
            case MacBuildTarget.dir:
                return {
                    publish: null
                };
            case MacBuildTarget.mas:
            case MacBuildTarget.masDev:
                return {
                    artifactName: "${productName}-${version}.${ext}"
                };
            default:
                throw new Error(`Unsupported Mac target: ${this.config.target}`);
        }
    }

    getTargetFlag(): MainPlatform {
        return MainPlatform.Mac;
    }
} 
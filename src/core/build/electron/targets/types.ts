import { Configuration, PlatformSpecificBuildOptions, TargetConfiguration, TargetSpecificOptions } from "electron-builder";
import { MainPlatform } from "@/main/electron/app/config";

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
    icon?: string;
    publish?: {
        provider?: string;
        owner?: string;
        repo?: string;
        token?: string;
        private?: boolean;
        releaseType?: string;
        draft?: boolean;
        prerelease?: boolean;
        releaseNotes?: string;
        releaseName?: string;
        host?: string;
        channel?: string;
        [key: string]: any;
    };
    artifactName?: string;
    [key: string]: any;
}

export interface IBuildTarget {
    toTargetConfiguration(): TargetConfiguration;
    toPlatformConfiguration(): PlatformSpecificBuildOptions;
    toTargetOptions(): TargetSpecificOptions;
    getTargetFlag(): MainPlatform;
} 
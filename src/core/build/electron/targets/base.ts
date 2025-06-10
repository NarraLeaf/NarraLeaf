import {
    Configuration,
    PlatformSpecificBuildOptions,
    TargetConfiguration,
    TargetSpecificOptions,
} from "electron-builder";
import {MainPlatform} from "@/main/app/config";
import { IBaseTargetConfig, IBuildTarget } from "./types";

export abstract class PlatformBuildTarget implements IBuildTarget {
    public static isTarget(t: any): t is PlatformBuildTarget {
        return t != null && t.__sig === "BuildTarget";
    }

    static createTarget(targets: PlatformBuildTarget | PlatformBuildTarget[]): TargetConfiguration[] {
        const targetConfigs: TargetConfiguration[] = [];
        const buildTargets = Array.isArray(targets) ? targets : [targets];
        
        for (const target of buildTargets) {
            const config = target.toTargetConfiguration();
            const existingConfig = targetConfigs.find(c => 
                c.arch === config.arch && 
                c.target === config.target
            );
            
            if (!existingConfig) {
                targetConfigs.push(config);
            }
        }
        
        return targetConfigs;
    }

    static createCommonConfig(targets: PlatformBuildTarget | PlatformBuildTarget[]): Configuration {
        const platforms: {
            [MainPlatform.Windows]?: any[],
            [MainPlatform.Mac]?: any[],
            [MainPlatform.Linux]?: any[],
        } = {};

        const buildTargets = Array.isArray(targets) ? targets : [targets];
        for (const target of buildTargets) {
            const platform = target.getTargetFlag();
            if (!platforms[platform]) {
                platforms[platform] = [];
            }
            platforms[platform]?.push(target);
        }

        return {
            win: platforms[MainPlatform.Windows]?.[0]?.toPlatformConfiguration(),
            ...platforms[MainPlatform.Windows]?.reduce((acc, config) => ({
                ...acc,
                ...config.toTargetOptions()
            }), {}),
            mac: platforms[MainPlatform.Mac]?.[0]?.toPlatformConfiguration(),
            ...platforms[MainPlatform.Mac]?.reduce((acc, config) => ({
                ...acc,
                ...config.toTargetOptions()
            }), {}),
            linux: platforms[MainPlatform.Linux]?.[0]?.toPlatformConfiguration(),
            ...platforms[MainPlatform.Linux]?.reduce((acc, config) => ({
                ...acc,
                ...config.toTargetOptions()
            }), {}),
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
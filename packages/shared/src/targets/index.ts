import type { PlatformBuildTarget } from "./base";
import { IWindowsBuildConfig, WindowsConfig } from "./windows";
import { IMacBuildConfig, MacConfig } from "./mac";
import { ILinuxBuildConfig, LinuxConfig } from "./linux";

export class BuildTarget {
    public static Windows(config: IWindowsBuildConfig): PlatformBuildTarget {
        return new WindowsConfig(config);
    }

    public static Mac(config: IMacBuildConfig): PlatformBuildTarget {
        return new MacConfig(config);
    }

    public static Linux(config: ILinuxBuildConfig): PlatformBuildTarget {
        return new LinuxConfig(config);
    }
}

export * from './base';
export * from './windows';
export * from './mac';
export * from './linux'; 
export * from './types';
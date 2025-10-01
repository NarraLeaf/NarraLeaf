import type { PlatformBuildTarget } from "./targets/base";
import { IWindowsBuildConfig, WindowsConfig } from "./targets/windows";
import { IMacBuildConfig, MacConfig } from "./targets/mac";
import { ILinuxBuildConfig, LinuxConfig } from "./targets/linux";

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

export * from './targets/base';
export * from './targets/windows';
export * from './targets/mac';
export * from './targets/linux'; 
export * from './targets/types';
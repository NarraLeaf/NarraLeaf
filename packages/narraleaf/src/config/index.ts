/**
 * Build-time configuration types shared with tooling (`"narraleaf/config"`).
 * Re-exports platform and target shapes from `@narraleaf/shared`; no main-process runtime classes.
 */
export {
    BuildTarget, WindowsBuildTarget, IWindowsBuildConfig, WindowsConfig,
    MacBuildTarget, IMacBuildConfig, MacConfig,
    LinuxBuildTarget, ILinuxBuildConfig, LinuxConfig,
    IBaseTargetConfig, PlatformBuildTarget,
    ArchType, IBaseBuildConfig, IBuildTarget, MainPlatform,
    ProjectConfig,
} from "@narraleaf/shared";
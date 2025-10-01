export enum TempNamespace {
    RendererBuild = "app-build/renderer",
    MainBuild = "app-build/main",
    RendererBuildTemp = "app-build/.cache/renderer",
    License = "app-build/.cache/license",
    Public = "app-build/public",
}
export enum DevTempNamespace {
    MainBuild = "app-dev/main",
    RendererBuild = "app-dev/renderer",
    MainBuildCache = "app-dev/.cache/main-watch",
    RendererBuildCache = "app-dev/.cache/renderer-watch",
    RendererBuildTemp = "app-dev/.cache/renderer",
}

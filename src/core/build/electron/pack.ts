import {Project} from "@core/project/project";
import type {Configuration} from "electron-builder";
import {BuildTarget} from "@core/build/electron/target";
import path from "path";
import {MainOutputFileName} from "@core/build/constants";
import {TempNamespace} from "@core/constants/tempNamespace";

export type AppBuildResult = {
    distDir: string;
    _res: any;
};

export async function buildApp(project: Project): Promise<AppBuildResult> {
    const {default: builder, Platform} = await import("electron-builder");
    const distDir = project.fs.resolve(project.config.build.dist);
    const enableFastPack = project.config.build.dev;

    const entryFile = path.join(TempNamespace.MainBuild, MainOutputFileName);

    const config: Configuration = {
        target: BuildTarget.createTarget(project.config.build.targets),
        compression: enableFastPack ? "store" : "maximum",
        appId: project.config.build.appId,
        productName: project.config.build.productName,
        directories: {
            output: distDir,
        },
        npmRebuild: false,
        nodeGypRebuild: false,
        files: [
            {
                from: project.getTempDir(TempNamespace.RendererBuild),
                to: TempNamespace.RendererBuild,
            },
            {
                from: project.getTempDir(TempNamespace.MainBuild),
                to: TempNamespace.MainBuild,
            },
            "package.json",
        ],
        extraMetadata: {
            main: entryFile,
        },
        ...BuildTarget.createCommonConfig(project.config.build.targets),
    };

    const result = await builder.build({
        targets: Platform.current().createTarget(),
        config,
    });

    return {
        distDir,
        _res: result,
    };
}

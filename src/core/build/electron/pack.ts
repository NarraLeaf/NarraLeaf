import {Project, TempNamespace} from "@core/project/project";
import type {Configuration} from "electron-builder";
import {BuildTarget} from "@core/build/electron/target";
import {rest} from "@/utils/str";
import {Logger} from "@/cli/logger";
import path from "path";
import {MainOutputFileName} from "@core/build/constants";

export type AppBuildResult = {
    distDir: string;
    _res: any;
};

export async function buildApp(project: Project, logger: Logger): Promise<AppBuildResult> {
    const {default: builder, Platform} = await import("electron-builder");
    const distDir = project.fs.resolve(project.config.build.dist);
    const enableFastPack = project.config.build.dev;

    const rendererFiles = rest(path.relative(project.getRootDir(), project.getTempDir(TempNamespace.RendererBuild)));
    const mainFiles = rest(path.relative(project.getRootDir(), project.getTempDir(TempNamespace.MainBuild)));
    const entryFile = path.join(path.relative(project.getRootDir(), project.getTempDir(TempNamespace.MainBuild)), MainOutputFileName);

    logger
        .info("Including files in the build:")
        .info("Renderer:", rendererFiles)
        .info("Main:", mainFiles);

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
            rendererFiles,
            mainFiles
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

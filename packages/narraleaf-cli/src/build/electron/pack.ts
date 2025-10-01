import { Project } from "@/project/project";
import type { Configuration } from "electron-builder";
import { PlatformBuildTarget } from "@/build/electron/target";
import path from "path";
import { MainOutputFileName } from "@narraleaf/shared";
import { TempNamespace } from "@narraleaf/shared";
import NarraLeafLicense from "@/build/assets/app-licence-narraleaf.ejs";
import NarraLeafReactLicense from "@/build/assets/app-licence-narraleaf-react.ejs";
import { Fs } from "@/utils/fs";
import ejs from "ejs";
import { RendererProject } from "@/project/renderer/rendererProject";
import { normalize, sep } from "@/utils/string";
import { rest } from "@/utils/os";

export type AppBuildResult = {
    distDir: string;
    _res: any;
};

export async function buildApp(rendererProject: RendererProject): Promise<AppBuildResult> {
    const project = rendererProject.project;
    const { default: builder, Platform } = await import("electron-builder");
    const distDir = project.fs.resolve(project.config.build.dist);
    const enableFastPack = project.config.build.dev;
    const logr = project.app.createLogger();

    const entryFile = path.join(TempNamespace.MainBuild, MainOutputFileName);

    logr.info("Renderer build", project.getTempDir(TempNamespace.RendererBuild))
        .info("Main build", project.getTempDir(TempNamespace.MainBuild))
        .info("Entry file", entryFile)
        .info("Public directory", rendererProject.getPublicDir())
        .info("Resources directory", project.config.resources)
        .info("License directory", project.getTempDir(TempNamespace.License))
        .info("Dist directory", distDir);

    const config: Configuration = {
        target: PlatformBuildTarget.createTarget(project.config.build.targets),
        compression: enableFastPack ? "store" : "maximum",
        appId: project.config.build.appId,
        productName: project.config.build.productName,
        directories: {
            app: "app",
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
            {
                from: rendererProject.getPublicDir(),
                to: TempNamespace.Public,
            },
            "package.json",
            "narraleaf.config.js",
            "!**/*.map",
        ],
        extraMetadata: {
            main: entryFile,
        },
        extraFiles: [
            {
                from: project.getTempDir(TempNamespace.License),
                to: ".",
            }
        ],
        extraResources: [
            rest(normalize(project.config.resources), sep.posix),
        ],
        ...PlatformBuildTarget.createCommonConfig(project.config.build.targets),
    };

    await writeLicense(project, project.getTempDir(TempNamespace.License));
    const result = await builder.build({
        targets: Platform.current().createTarget(),
        config,
    });

    return {
        distDir,
        _res: result,
    };
}

async function writeLicense(project: Project, distDir: string): Promise<void> {
    await Fs.createDir(distDir);

    const narraleafLicense = path.join(distDir, "LICENSE.narraleaf.txt");
    await Fs.write(narraleafLicense, ejs.render(NarraLeafLicense, {
        version: project.app.config.version,
    }));

    const narraleafReactLicense = path.join(distDir, "LICENSE.narraleaf-react.txt");
    await Fs.write(narraleafReactLicense, ejs.render(NarraLeafReactLicense, {
        version: project.app.config.version,
    }));
}

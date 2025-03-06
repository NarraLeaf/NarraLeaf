import {Project} from "@core/project/project";
import type {Configuration} from "electron-builder";
import {BuildTarget} from "@core/build/electron/target";
import path from "path";
import {MainOutputFileName} from "@core/build/constants";
import {TempNamespace} from "@core/constants/tempNamespace";
import NarraLeafLicense from "@/assets/app-licence-narraleaf.ejs";
import NarraLeafReactLicense from "@/assets/app-licence-narraleaf-react.ejs";
import {Fs} from "@/utils/nodejs/fs";
import ejs from "ejs";
import {RendererProject} from "@core/project/renderer/rendererProject";

export type AppBuildResult = {
    distDir: string;
    _res: any;
};

export async function buildApp(rendererProject: RendererProject): Promise<AppBuildResult> {
    const project = rendererProject.project;
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
            {
                from: rendererProject.getPublicDir(),
                to: TempNamespace.Public,
            },
            "package.json",
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
        ...BuildTarget.createCommonConfig(project.config.build.targets),
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

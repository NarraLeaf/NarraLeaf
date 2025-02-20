import {RendererProject} from "@core/project/renderer/rendererProject";
import {Project} from "@core/project/project";
import {Fs} from "@/utils/fs";
import {createStructure} from "@core/build/renderer/prepare";
import {BuildTempStructure, RendererAppEntryPoint, RendererHTMLEntryPoint} from "@core/build/renderer/tempSrc";
import {WebpackConfig, WebpackMode} from "@core/build/renderer/webpack";
import path from "path";
import {Babel} from "@core/build/renderer/babel";
import {StyleSheet} from "@core/build/renderer/stylesheet";
import HtmlWebpackPlugin from "html-webpack-plugin";
import {Logger} from "@/cli/logger";
import webpack from "webpack";
import {OutputFileName, OutputHTMLFileName, OutputPublicDir} from "@core/build/constants";

export type RendererBuildResult = {
    dir: string;
    htmlEntry: string;
};

export async function buildRenderer(
    {rendererProject, logger}: {
        rendererProject: RendererProject;
        logger: Logger;
    }
): Promise<RendererBuildResult> {
    const buildDir = rendererProject.project.getTempDir(Project.TempNamespace.RendererBuild);
    const outputDir = rendererProject.project.getTempDir(Project.TempNamespace.RendererBuild_Dist);
    const publicDir = rendererProject.getPublicDir();
    const appEntry = path.resolve(buildDir, RendererAppEntryPoint.name);
    const htmlEntry = path.resolve(buildDir, RendererHTMLEntryPoint.name);

    await Fs.createDir(buildDir);
    await createStructure(BuildTempStructure, rendererProject, buildDir);

    const webpackConfig = new WebpackConfig({
        mode: WebpackMode.Development,
        entry: appEntry,
        outputDir: outputDir,
        outputFilename: OutputFileName,
        extensions: [".ts", ".tsx", ".js", ".jsx"],
    })
        .useModule(new Babel())
        .useModule(new StyleSheet())
        .usePlugin(new HtmlWebpackPlugin({
            template: htmlEntry,
        }));
    const config = webpackConfig.getConfiguration();

    await new Promise<void>((resolve, reject) => {
        webpack(config, (err, stats) => {
            if (err) {
                reject(err);
            } else if (stats) {
                logger.raw(stats.toString({
                    colors: true,
                }));
                resolve();
            }
        });
    });
    await Fs.copyDir(publicDir, path.resolve(outputDir, OutputPublicDir));

    return {
        dir: outputDir,
        htmlEntry: path.resolve(outputDir, OutputHTMLFileName),
    };
}


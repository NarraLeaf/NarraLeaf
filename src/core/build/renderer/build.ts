import {RendererProject} from "@core/project/renderer/rendererProject";
import {Project} from "@core/project/project";
import {createStructure} from "@core/build/renderer/prepare";
import {BuildTempStructure, RendererAppEntryPoint, RendererHTMLEntryPoint} from "@core/build/renderer/tempSrc";
import {WebpackConfig, WebpackMode} from "@core/build/webpack";
import path from "path";
import {Babel} from "@core/build/renderer/babel";
import {StyleSheet} from "@core/build/renderer/stylesheet";
import HtmlWebpackPlugin from "html-webpack-plugin";
import webpack from "webpack";
import {RendererOutputFileName, RendererOutputHTMLFileName, RendererOutputPublicDir} from "@core/build/constants";
import {Fs} from "@/utils/contaminated/fs";

export type RendererBuildResult = {
    dir: string;
    htmlEntry: string;
};

export async function buildRenderer(
    {rendererProject}: {
        rendererProject: RendererProject;
    }
): Promise<RendererBuildResult> {
    const buildDir = rendererProject.project.getTempDir(Project.TempNamespace.RendererBuildCache);
    const outputDir = rendererProject.project.getTempDir(Project.TempNamespace.RendererBuild);
    const publicDir = rendererProject.getPublicDir();
    const appEntry = path.resolve(buildDir, RendererAppEntryPoint.name);
    const htmlEntry = path.resolve(buildDir, RendererHTMLEntryPoint.name);
    const packMode = rendererProject.project.config.build.dev ? WebpackMode.Development : WebpackMode.Production;

    await Fs.createDir(buildDir);
    await createStructure(BuildTempStructure, rendererProject, buildDir);

    const webpackConfig = new WebpackConfig({
        mode: packMode,
        entry: appEntry,
        outputDir: outputDir,
        outputFilename: RendererOutputFileName,
        extensions: [".ts", ".tsx", ".js", ".jsx"],
    })
        .useModule(new Babel(true))
        .useModule(new StyleSheet())
        .usePlugin(new HtmlWebpackPlugin({
            template: htmlEntry,
        }))
        .useNodeModule(rendererProject.project.fs.resolve("node_modules"));
    const config = webpackConfig.getConfiguration();

    await new Promise<void>((resolve, reject) => {
        webpack(config, (err, stats) => {
            if (err) {
                reject(err);
            } else if (stats) {
                console.log(stats.toString({
                    colors: true,
                }));
                resolve();
            }
        });
    });
    await Fs.copyDir(publicDir, path.resolve(outputDir, RendererOutputPublicDir));

    return {
        dir: outputDir,
        htmlEntry: path.resolve(outputDir, RendererOutputHTMLFileName),
    };
}


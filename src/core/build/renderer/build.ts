import {RendererProject} from "@core/project/renderer/rendererProject";
import {Project} from "@core/project/project";
import {createStructure} from "@core/build/renderer/prepare";
import {createRendererAppStructure, RendererHTMLEntryPoint} from "@core/build/renderer/tempSrc";
import {WebpackConfig, WebpackMode} from "@core/build/webpack";
import path from "path";
import {Babel} from "@core/build/renderer/babel";
import {StyleSheet} from "@core/build/renderer/stylesheet";
import webpack from "webpack";
import {RendererOutputFileName, RendererOutputHTMLFileName} from "@core/build/constants";
import {Fs} from "@/utils/nodejs/fs";
import {App} from "@/cli/app";
import {getFileTree} from "@/utils/nodejs/string";

export type RendererBuildResult = {
    dir: string;
    htmlEntry: string;
};

export type RendererBuildWatchToken = {
    close(): Promise<void>;
};

export async function buildRenderer(
    {rendererProject}: {
        rendererProject: RendererProject;
    }
): Promise<RendererBuildResult> {
    const pages = await getPages(rendererProject);
    const rendererAppStructure = createRendererAppStructure(pages);
    const buildDir = rendererProject.project.getTempDir(Project.TempNamespace.RendererBuildTemp);
    const outputDir = rendererProject.project.getTempDir(Project.TempNamespace.RendererBuild);
    const appEntry = path.resolve(buildDir, rendererAppStructure.name);
    const packMode = rendererProject.project.config.build.dev ? WebpackMode.Development : WebpackMode.Production;

    await Fs.createDir(buildDir);
    await createStructure([
        rendererAppStructure,
    ], rendererProject, buildDir);
    await createStructure([
        RendererHTMLEntryPoint,
    ], rendererProject, outputDir, false);

    const webpackConfig = new WebpackConfig({
        mode: packMode,
        entry: appEntry,
        outputDir: outputDir,
        outputFilename: RendererOutputFileName,
        extensions: [".ts", ".tsx", ".js", ".jsx"],
    })
        .useModule(new Babel(true))
        .useModule(new StyleSheet())
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

    return {
        dir: outputDir,
        htmlEntry: path.resolve(outputDir, RendererOutputHTMLFileName),
    };
}

export async function watchRenderer(
    {rendererProject, onRebuild}: {
        rendererProject: RendererProject;
        onRebuild?: () => void;
    }
): Promise<RendererBuildWatchToken> {
    const pages = await getPages(rendererProject);
    const rendererAppStructure = createRendererAppStructure(pages);
    const buildTempDir = rendererProject.project.getDevTempDir(Project.DevTempNamespace.RendererBuildTemp);
    const buildDistDir = rendererProject.project.getDevTempDir(Project.DevTempNamespace.RendererBuild);
    const appEntry = path.resolve(buildTempDir, rendererAppStructure.name);
    const logr = App.createLogger(rendererProject.project.app);

    await Fs.createDir(buildTempDir);
    await createStructure([
        rendererAppStructure,
    ], rendererProject, buildTempDir);
    await createStructure([
        RendererHTMLEntryPoint,
    ], rendererProject, buildDistDir, true);

    const webpackConfig = new WebpackConfig({
        mode: WebpackMode.Development,
        entry: appEntry,
        outputDir: buildDistDir,
        outputFilename: RendererOutputFileName,
        extensions: [".ts", ".tsx", ".js", ".jsx"],
        extend: {
            cache: {
                type: "filesystem",
                cacheDirectory: rendererProject.project.getDevTempDir(Project.DevTempNamespace.RendererBuildCache),
            },
        }
    })
        .useModule(new Babel(true))
        .useModule(new StyleSheet())
        .useNodeModule(rendererProject.project.fs.resolve("node_modules"));

    const config = webpackConfig.getConfiguration();
    const compiler = webpack(config);
    let initialBuild = true, initialBuildResolve: () => void;

    compiler.watch({}, (err, stats) => {
        if (err) {
            logr
                .error("Renderer build failed")
                .error(err);
        } else if (stats) {
            if (initialBuild) {
                logr.info("Initial build of renderer process finished", stats.toString({
                    colors: true,
                }));
                initialBuild = false;
                initialBuildResolve();
                return;
            }
            logr.info("Renderer built", stats.toString({
                colors: true,
            }));
            if (onRebuild) {
                onRebuild();
            }
        }
    });

    await new Promise<void>(resolve => {
        initialBuildResolve = resolve;
    });

    return {
        close(): Promise<void> {
            return new Promise<void>(resolve => {
                compiler.close(() => {
                    logr.info("Renderer build stopped");
                    resolve();
                });
            })
        }
    };
}

async function getPages(rendererProject: RendererProject): Promise<string[]> {
    const logr = rendererProject.project.app.createLogger();
    const pagesDir = rendererProject.getPagesDir();
    const result = await Fs.getFiles(
        pagesDir,
        [".js", ".jsx", ".ts", ".tsx"]
    );

    if (!result.ok) {
        logr.warn("Failed to get pages:", result.error);
        return [];
    }

    logr
        .debug("Scanning", pagesDir)
        .info("Scanning", result.data.length, "pages")
        .info(getFileTree("Pages Found", result.data.map(p => ({
            type: "file",
            name: path.parse(p).base,
        })), []));

    return result.data;
}


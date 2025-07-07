import { RendererProject } from "@core/project/renderer/rendererProject";
import { Project } from "@core/project/project";
import { createStructure } from "@core/build/renderer/prepare";
import { createRendererAppStructure, RendererHTMLEntryPoint } from "@core/build/renderer/tempSrc";
import { WebpackConfig, WebpackMode } from "@core/build/webpack";
import path from "path";
import { Babel } from "@core/build/renderer/babel";
import { StyleSheet } from "@core/build/renderer/stylesheet";
import webpack from "webpack";
import { RendererOutputFileName, RendererOutputHTMLFileName } from "@core/build/constants";
import { Fs } from "@/utils/nodejs/fs";
import { App } from "@/cli/app";
import chokidar from "chokidar";

export type RendererBuildResult = {
    dir: string;
    htmlEntry: string;
};

export type RendererBuildWatchToken = {
    close(): Promise<void>;
};

export async function buildRenderer(
    { rendererProject }: {
        rendererProject: RendererProject;
    }
): Promise<RendererBuildResult> {
    const isProduction = !rendererProject.project.config.build.dev;
    const rendererAppStructure = await createRendererAppStructure(rendererProject, isProduction);
    const buildDir = rendererProject.project.getTempDir(Project.TempNamespace.RendererBuildTemp);
    const outputDir = rendererProject.project.getTempDir(Project.TempNamespace.RendererBuild);
    const appEntry = path.resolve(buildDir, rendererAppStructure.name);
    const packMode = rendererProject.project.config.build.dev ? WebpackMode.Development : WebpackMode.Production;
    const libNodeModules = path.resolve(rendererProject.project.app.config.cliRoot, "node_modules");

    await Fs.createDir(buildDir);
    await Fs.createDir(outputDir);
    await createStructure([
        rendererAppStructure,
    ], rendererProject, buildDir);

    const webpackConfig = new WebpackConfig({
        mode: packMode,
        entry: appEntry,
        outputDir: outputDir,
        outputFilename: RendererOutputFileName,
        extensions: [".ts", ".tsx", ".js", ".jsx"],
        extend: {
            resolveLoader: {
                modules: [
                    'node_modules',
                    path.resolve(rendererProject.project.app.config.cliRoot, 'node_modules'),
                    path.resolve(rendererProject.project.fs.resolve('node_modules'))
                ]
            }
        }
    })
        .useModule(new Babel(true))
        .useModule(new StyleSheet())
        .useNodeModule(libNodeModules)
        .useNodeModule(rendererProject.project.fs.resolve("node_modules"));
    const config = webpackConfig.getConfiguration(rendererProject.project.app);

    await new Promise<void>((resolve, reject) => {
        webpack(config, async (err, stats) => {
            if (err) {
                reject(err);
            } else if (stats) {
                console.log(stats.toString({
                    colors: true,
                }));

                await createStructure([
                    RendererHTMLEntryPoint,
                ], rendererProject, outputDir, false);
                if (!(await Fs.isFileExists(outputDir + path.sep + "index.html"))) {
                    throw new Error("Renderer build failed");
                }

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
    { rendererProject, onRebuild }: {
        rendererProject: RendererProject;
        onRebuild?: () => void;
    }
): Promise<RendererBuildWatchToken> {
    const rendererAppStructure = await createRendererAppStructure(rendererProject);
    const buildTempDir = rendererProject.project.getDevTempDir(Project.DevTempNamespace.RendererBuildTemp);
    const buildDistDir = rendererProject.project.getDevTempDir(Project.DevTempNamespace.RendererBuild);
    const appEntry = path.resolve(buildTempDir, rendererAppStructure.name);
    const logr = App.createLogger(rendererProject.project.app);
    const usePostcss = (await rendererProject.project.fs.isFileExists("postcss.config.js")).ok;
    const libNodeModules = path.resolve(rendererProject.project.app.config.cliRoot, "node_modules");
    
    await Fs.createDir(buildTempDir);
    await Fs.createDir(buildDistDir);
    await createStructure([
        rendererAppStructure,
    ], rendererProject, buildTempDir);

    const webpackConfig = new WebpackConfig({
        mode: WebpackMode.Development,
        entry: appEntry,
        outputDir: buildDistDir,
        outputFilename: RendererOutputFileName,
        extensions: [".ts", ".tsx", ".js", ".jsx"],
        extend: {
            cache: false,
            devtool: "source-map",
            resolveLoader: {
                modules: [
                    'node_modules',
                    path.resolve(rendererProject.project.app.config.cliRoot, 'node_modules'),
                    path.resolve(rendererProject.project.fs.resolve('node_modules'))
                ]
            }
        }
    })
        .useModule(new Babel(true))
        .useModule(new StyleSheet(usePostcss))
        .useNodeModule(libNodeModules)
        .useNodeModule(rendererProject.project.fs.resolve("node_modules"));

    const config = webpackConfig.getConfiguration(rendererProject.project.app);
    const compiler = webpack(config);
    let initialBuild = true, initialBuildResolve: () => void;

    compiler.watch({}, async (err, stats) => {
        if (err) {
            logr
                .error("Renderer build failed")
                .error(err);
        }
        if (!stats) return;
        if (initialBuild) {
            logr.info("Initial build of renderer process finished", stats.toString({
                colors: true,
            }));

            await createStructure([
                RendererHTMLEntryPoint,
            ], rendererProject, buildDistDir, true);

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
    });

    await new Promise<void>(resolve => {
        initialBuildResolve = resolve;
    });

    // ------------------------------------------------------------------
    // Watch pages directory to regenerate the renderer App entry whenever
    // a page file (add/remove) changes. This keeps the routing structure
    // in sync during dev without restarting the dev server.
    // ------------------------------------------------------------------
    const pagesWatcher = chokidar.watch(rendererProject.getPagesDir(), {
        ignored: /(^|[\\/])\../, // ignore dotfiles
        ignoreInitial: true,
    });

    const regenerateAppEntry = async () => {
        try {
            const newStructure = await createRendererAppStructure(rendererProject);
            await createStructure([
                newStructure,
            ], rendererProject, buildTempDir);
            logr.info("Detected page change, regenerated renderer app entry");
        } catch (e) {
            logr.error("Failed to regenerate renderer app entry", e as Error);
        }
    };

    pagesWatcher
        .on("add", regenerateAppEntry)
        .on("unlink", regenerateAppEntry)
        .on("addDir", regenerateAppEntry)
        .on("unlinkDir", regenerateAppEntry);

    return {
        close(): Promise<void> {
            return new Promise<void>(resolve => {
                const shutdown = async () => {
                    await pagesWatcher.close();
                    compiler.close(() => {
                        logr.info("Renderer build stopped");
                        resolve();
                    });
                };

                shutdown();
            })
        }
    };
}




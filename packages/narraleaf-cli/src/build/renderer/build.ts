import { RendererProject } from "@/project/renderer/rendererProject";
import { Project } from "@/project/project";
import { createStructure } from "@/build/renderer/prepare";
import { createRendererAppStructure, RendererHTMLEntryPoint } from "@/build/renderer/tempSrc";
import { WebpackConfig, WebpackMode } from "@/build/webpack";
import path from "path";
import { Babel } from "@/build/renderer/babel";
import { StyleSheet } from "@/build/renderer/stylesheet";
import webpack from "webpack";
import { RendererOutputFileName, RendererOutputHTMLFileName } from "@narraleaf/shared";
import { Fs } from "@/utils/fs";
import { App } from "@/interface/app";
import fs from "fs";
import { createAppRouter } from "./router/scan";

function watchDirectory(
    dir: string,
    onChange: () => void,
): { close: () => void } {
    const IGNORED_DOTFILES = /(^|[\\/])\../;
    const watchers: fs.FSWatcher[] = [];
    const watchedPaths = new Set<string>();

    const addWatcher = (current: string) => {
        if (watchedPaths.has(current)) return;
        if (IGNORED_DOTFILES.test(current)) return;

        try {
            const watcher = fs.watch(current, { persistent: true }, (event, filename) => {
                if (!filename) return;
                if (IGNORED_DOTFILES.test(filename)) return;

                // Fire the change callback – debouncing/throttling is left up
                // to the caller if required (not needed in current usage).
                onChange();

                // If a new directory was created, ensure we start watching it
                if (event === "rename") {
                    const fullPath = path.join(current, filename.toString());
                    if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
                        addWatcher(fullPath);
                    }
                }
            });
            watchers.push(watcher);
            watchedPaths.add(current);

            // Recursively watch existing sub-directories so they are covered.
            for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
                if (entry.isDirectory()) {
                    addWatcher(path.join(current, entry.name));
                }
            }
        } catch {
            // Ignore directories we fail to watch (permissions/eperm etc.).
        }
    };

    addWatcher(dir);

    return {
        close() {
            for (const watcher of watchers) {
                watcher.close();
            }
            watchedPaths.clear();
        },
    };
}

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

    // Create alias map in production to hide real file paths
    let aliasMap: Record<string, string> = {};
    if (isProduction) {
        // Build alias map similar to createRendererAppStructure logic
        const appRouterData = await createAppRouter(rendererProject);
        const allPaths: { path: string; id: string }[] = [];
        let pathCounter = 0;
        const collect = (item: any, prefix = "") => {
            if (item && "children" in item) {
                if (item.layout) allPaths.push({ path: item.layout.path, id: `${prefix}_layout_${pathCounter++}` });
                if (item.indexHandler) allPaths.push({ path: item.indexHandler.path, id: `${prefix}_index_${pathCounter++}` });
                item.children.forEach((child: any, idx: number) => collect(child, `${prefix}_child_${idx}`));
            } else if (item && "path" in item) {
                allPaths.push({ path: item.path, id: `${prefix}_page_${pathCounter++}` });
            }
        };
        collect(appRouterData.root);
        if (appRouterData.errorHandler) collect(appRouterData.errorHandler, "_error");

        for (const { path: p, id } of allPaths) {
            aliasMap[`NL_MODULE_${id}`] = p;
        }
        // alias for application root entry file
        aliasMap["NL_APP_ENTRY"] = rendererProject.getAppEntry();
    }

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
            },
            ...(isProduction ? { resolve: { alias: aliasMap } } : {})
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

    if (!compiler) {
        throw new Error("CompilerNotFound: Cannot initialize webpack compiler when watching renderer process");
    }

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

    const pagesWatcher = watchDirectory(rendererProject.getPagesDir(), regenerateAppEntry);

    return {
        close(): Promise<void> {
            return new Promise<void>(resolve => {
                const shutdown = async () => {
                    pagesWatcher.close();
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




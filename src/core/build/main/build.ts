import {Project} from "@core/project/project";
import {WebpackConfig, WebpackMode} from "@core/build/webpack";
import {MainOutputFileName, PreloadFileName} from "@core/build/constants";
import {Babel} from "@core/build/renderer/babel";
import webpack from "webpack";
import path from "path";
import {Builtins} from "@core/build/main/biltins";
import NodeExternals from "webpack-node-externals";
import {Fs} from "@/utils/nodejs/fs";
import {App} from "@/cli/app";


export type MainBuildResult = {
    entry: string;
};

export type MainBuildWatchToken = {
    close(): Promise<void>;
};

export async function buildMain(
    {userEntry, project}: {
        userEntry: string;
        project: Project;
    }
): Promise<MainBuildResult> {
    const preloadFile = path.resolve(project.app.config.cliRoot, "dist", PreloadFileName);
    const distDir = project.getTempDir(Project.TempNamespace.MainBuild);
    const packMode = project.config.build.dev ? WebpackMode.Development : WebpackMode.Production;

    await Fs.createDir(distDir);
    await Fs.cpFile(preloadFile, path.resolve(distDir, PreloadFileName));

    const webpackConfig = new WebpackConfig({
        mode: packMode,
        entry: userEntry,
        outputDir: distDir,
        outputFilename: MainOutputFileName,
        extensions: [".ts", ".js"],
        extend: {
            resolve: {},
            externals: [
                NodeExternals(),
                ...Builtins,
                "narraleaf",
            ],
            target: "electron-main"
        }
    })
        .useModule(new Babel(false))
        .useNodeModule(project.fs.resolve("node_modules"));
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
        entry: path.resolve(distDir, MainOutputFileName),
    };
}

export async function watchMain(
    {userEntry, project, onRebuild}: {
        userEntry: string;
        project: Project;
        onRebuild?: () => void;
    }
): Promise<MainBuildWatchToken> {
    const preloadFile = path.resolve(project.app.config.cliRoot, "dist", PreloadFileName);
    const distDir = project.getDevTempDir(Project.DevTempNamespace.MainBuild);
    const logr = App.createLogger(project.app);

    await Fs.createDir(distDir);
    await Fs.cpFile(preloadFile, path.resolve(distDir, PreloadFileName));

    const webpackConfig = new WebpackConfig({
        mode: WebpackMode.Development,
        entry: userEntry,
        outputDir: distDir,
        outputFilename: MainOutputFileName,
        extensions: [".ts", ".js"],
        extend: {
            resolve: {},
            externals: [
                NodeExternals(),
                ...Builtins,
                "narraleaf",
            ],
            target: "electron-main",
            cache: {
                type: "filesystem",
                cacheDirectory: project.getDevTempDir(Project.DevTempNamespace.MainBuildCache),
            },
        }
    })
        .useModule(new Babel(false))
        .useNodeModule(project.fs.resolve("node_modules"));
    const config = webpackConfig.getConfiguration();
    const compiler = webpack(config);
    let initialBuild = true, initialBuildResolve: () => void;

    compiler.watch({}, (err, stats) => {
        if (err) {
            logr
                .error(`Failed to build main (using entry: ${userEntry})`)
                .error(err);
        } else if (stats) {
            if (initialBuild) {
                logr.info("Initial build of main process finished", stats.toString({
                    colors: true,
                }));
                initialBuild = false;
                initialBuildResolve();
                return;
            }
            logr.info("Main built", stats.toString({
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
                    logr.info("Main watcher closed");
                    resolve();
                });
            })
        }
    };
}

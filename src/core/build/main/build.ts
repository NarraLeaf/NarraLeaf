import {Project} from "@core/project/project";
import {Logger} from "@/cli/logger";
import {Fs} from "@/utils/fs";
import {WebpackConfig, WebpackMode} from "@core/build/webpack";
import {MainOutputFileName} from "@core/build/constants";
import {Babel} from "@core/build/renderer/babel";
import webpack from "webpack";
import path from "path";
import {Builtins} from "@core/build/main/biltins";
import NodeExternals from "webpack-node-externals";


export type MainBuildResult = {
    entry: string;
};

export async function buildMain(
    {userEntry, logger, project}: {
        userEntry: string;
        logger: Logger;
        project: Project;
    }
): Promise<MainBuildResult> {
    const distDir = project.getTempDir(Project.TempNamespace.MainBuild);
    const packMode = project.config.dev ? WebpackMode.Development : WebpackMode.Production;

    await Fs.createDir(distDir);

    const webpackConfig = new WebpackConfig({
        mode: packMode,
        entry: userEntry,
        outputDir: distDir,
        outputFilename: MainOutputFileName,
        extensions: [".ts", ".js"],
        extend: {
            resolve: {
            },
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
                logger.raw(stats.toString({
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

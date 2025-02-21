import {Project} from "@core/project/project";
import {Logger} from "@/cli/logger";
import {Fs} from "@/utils/fs";
import {WebpackConfig, WebpackMode} from "@core/build/webpack";
import {MainOutputFileName} from "@core/build/constants";
import {Babel} from "@core/build/renderer/babel";
import {webpack} from "webpack";
import path from "path";


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
    })
        .useModule(new Babel(false));
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

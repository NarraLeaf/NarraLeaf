import {Command} from "commander";
import {App} from "@/interface/app";
import {errorToStack, errorToString, timeStringify} from "@/utils/string";
import {parseDirStructure} from "@/project/projectConfig/parser";
import {BaseProjectStructure} from "@/project/projectConfig/baseProject";
import {Project} from "@/project/project";
import {DevServer} from "@/build/dev/devServer";
import {Logger} from "@/utils/logger";


interface DevOptions {
}

export default async function dev(this: Command, app: App, []: [DevOptions]) {
    const logr = App.createLogger(app);
    logr.info("Starting dev server...");

    const time = Date.now();

    try {
        const path = app.cwd();
        const projectStructure = await parseDirStructure(BaseProjectStructure, app.resolvePath(path));

        const project = new Project(app, app.resolvePath(path), projectStructure);
        const rendererProject = await project.createRendererProject();
        logr.info("Listening project at", app.resolvePath(path));

        logr.debug("cli root", app.config.cliRoot);

        const devServer = new DevServer(rendererProject);
        await devServer.start();

        logr.info(Logger.chalk.bgGray("Dev server started. Press Ctrl+C to stop"));
        await devServer.onTerminate(app.getProcess(), async () => {
            logr.info("Stopping dev server...");
            await devServer.stop();
            logr.info(`Dev tasks finished in ${timeStringify(Date.now() - time)}`);
        });
    } catch (e) {
        logr.error("Failed to build project:", errorToString(e));
        logr.error("Stack:", errorToStack(e));
        app.forceExit(1);
    }
}

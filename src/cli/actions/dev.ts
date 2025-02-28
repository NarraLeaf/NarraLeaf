import {Command} from "commander";
import {App} from "@/cli/app";
import {errorToStack, errorToString} from "@/utils/pure/string";
import {parseDirStructure} from "@core/project/projectConfig/parser";
import {BaseProjectStructure} from "@core/project/projectConfig/baseProject";
import {Project} from "@core/project/project";


interface DevOptions {
}

export default async function dev(this: Command, app: App, [path]: [string, DevOptions]) {
    const logr = App.createLogger(app);
    logr.info("Starting dev server...");

    try {
        const projectStructure = await parseDirStructure(BaseProjectStructure, app.resolvePath(path));

        const project = new Project(app, app.resolvePath(path), projectStructure);
        const rendererProject = await project.createRendererProject();
        logr.info("Listening project at", app.resolvePath(path));

        logr.debug("cli root", app.config.cliRoot);
    } catch (e) {
        logr.error("Failed to build project:", errorToString(e));
        logr.error("Stack:", errorToStack(e));
    }
}

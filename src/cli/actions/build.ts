import {Command} from "commander";
import {App} from "../app";
import {parseDirStructure} from "@core/project/projectConfig/parser";
import {errorToString} from "@/utils/str";
import {BaseProjectStructure} from "@core/project/projectConfig/baseProject";
import {Project} from "@core/project/project";

type BuildOptions = {};

export default async function build(this: Command, app: App, [path]: [string, BuildOptions]) {
    const logger = App.createLogger(app);
    logger.info("Building project...");

    try {
        // Prepare project
        const time = Date.now();
        const projectStructure = await parseDirStructure(BaseProjectStructure, app.resolvePath(path));
        const project = new Project(app.resolvePath(path), projectStructure);
        logger.info("Building project at", app.resolvePath(path));

        // Building Renderer
        const rendererProject = await project.createRendererProject();
        logger
            .info("Building project... This may take a while")
            .info("Building renderer (1/2)");
        await project.buildRenderer(rendererProject, logger);

        // Building Main
        logger.info("Building main (2/2)");
        await project.buildMain(logger);

        logger.info("Project built in", String(Date.now() - time), "ms");
    } catch (e) {
        logger.error("Failed to buildRenderer project:", errorToString(e));
    }
}

import {Command} from "commander";
import {App} from "../app";
import {parseDirStructure} from "@core/project/projectConfig/parser";
import {errorToString} from "@/utils/str";
import {BaseProjectStructure} from "@core/project/projectConfig/baseProject";
import {Project} from "@core/project/project";

type BuildOptions = {};

export default async function build(this: Command, app: App, [path]: [string, BuildOptions]) {
    const logger = App.createLogger(app);
    logger.info("Building project at", path);

    try {
        const time = Date.now();
        const projectStructure = await parseDirStructure(BaseProjectStructure, app.resolvePath(path));
        const project = new Project(app.resolvePath(path), projectStructure);

        const rendererProject = await project.createRendererProject();
        logger.info("request temp dir", project.getTempDir(Project.TempNamespace.RendererBuild));

        logger.info("Building project...");
        await project.build(rendererProject, logger);

        logger.info("Project built in", String(Date.now() - time), "ms");
    } catch (e) {
        logger.error("Failed to build project:", errorToString(e));
    }
}

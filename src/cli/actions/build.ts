import {Command} from "commander";
import {App} from "../app";
import {parseDirStructure} from "@core/project/projectConfig/parser";
import {errorToString} from "@/utils/str";
import {BaseProjectStructure} from "@core/project/projectConfig/baseProject";
import {Project} from "@core/project/project";
import {AppProjectRendererStructure} from "@core/project/projectConfig/appProject";
import {RendererProject} from "@core/project/renderer/rendererProject";

type BuildOptions = {};

export default async function build(this: Command, app: App, [path]: [string, BuildOptions]) {
    const logger = App.createLogger(app);
    logger.info("Building project at", path);

    try {
        const projectStructure = await parseDirStructure(BaseProjectStructure, app.resolvePath(path));
        console.log(projectStructure); // debug

        const project = new Project(app.resolvePath(path), projectStructure);

        const rendererRoot = project.fs.resolve(project.config.renderer.baseDir);
        console.log(rendererRoot); // debug

        const rendererStructure = await parseDirStructure(AppProjectRendererStructure, rendererRoot);
        console.log(rendererStructure); // debug

        const rendererProject = new RendererProject(project, rendererStructure);
        console.log(rendererProject.structure.app); // debug
    } catch (e) {
        logger.error("Failed to build project:", errorToString(e));
    }
}

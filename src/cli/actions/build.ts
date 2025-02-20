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
        const projectStructure = await parseDirStructure(BaseProjectStructure, app.resolvePath(path));
        console.log(projectStructure); // debug

        const project = new Project(app.resolvePath(path), projectStructure);

        const rendererProject = await project.createRendererProject();
        console.log(rendererProject.structure.app); // debug
        console.log(rendererProject.getAppEntry(), rendererProject.getPagesDir(), rendererProject.getPublicDir()); // debug

        console.log("request temp dir", project.getTempDir(Project.TempNamespace.RendererBuild)); // debug

        await project.build(rendererProject);
    } catch (e) {
        logger.error("Failed to build project:", errorToString(e));
    }
}

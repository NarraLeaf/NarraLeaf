import {Command} from "commander";
import {App} from "../app";
import {parseDirStructure} from "@core/project/projectConfig/parser";
import {BaseProjectStructure} from "@core/project/projectConfig/baseProject";
import {Project} from "@core/project/project";
import {errorToStack, errorToString} from "@/utils/pure/string";

type BuildOptions = {};

export default async function build(this: Command, app: App, []: [BuildOptions]) {
    const logr = App.createLogger(app);
    logr.info("Building project...");

    try {
        // Prepare project
        const time = Date.now();
        const path = app.cwd();
        const projectStructure = await parseDirStructure(BaseProjectStructure, app.resolvePath(path));
        const project = new Project(app, app.resolvePath(path), projectStructure);
        logr.info("Building project at", app.resolvePath(path));

        // Building Renderer
        const rendererProject = await project.createRendererProject();
        logr.info("Building project... This may take a while")
            .info("Building renderer (1/3)");
        await project.buildRenderer(rendererProject);

        // Building Main
        logr.info("Building main (2/3)");
        await project.buildMain();

        // Pack app
        logr.info("Packing app (3/3)");
        await project.buildApp(rendererProject);

        logr.info("Project built in", String(Date.now() - time), "ms");
    } catch (e) {
        logr.error("Failed to build project:", errorToString(e));
        logr.error("Stack:", errorToStack(e));
    }
}

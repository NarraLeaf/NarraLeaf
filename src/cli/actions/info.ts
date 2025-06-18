import { parseDirStructure } from "@/core/project/projectConfig/parser";
import {App} from "../app";
import {Command} from "commander";
import { BaseProjectStructure } from "@/core/project/projectConfig/baseProject";
import { Project } from "@/core/project/project";
import { createAppRouter } from "@/core/build/renderer/router/scan";

export default async function info(this: Command, app: App, []: []) {
    const logger = App.createLogger(app);
    logger.info("Platform Info:", app.getPlatform());

    const {actions: _, ...config} = app.config;
    logger.info("App Config:", config);

    const path = app.cwd();
    const projectStructure = await parseDirStructure(BaseProjectStructure, app.resolvePath(path));

    const project = new Project(app, app.resolvePath(path), projectStructure);
    const rendererProject = await project.createRendererProject();
    
    logger.info("Renderer Project:", rendererProject.project.config);
    logger.info("Renderer Project Root:", rendererProject.project.getRootDir());
    logger.info("Renderer Project Node Modules:", rendererProject.project.fs.resolve("node_modules"));

    const router = await createAppRouter(rendererProject);
    logger.info("Router:", JSON.stringify(router, null, 2));
}

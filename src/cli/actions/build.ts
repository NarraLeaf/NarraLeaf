import {Command} from "commander";
import {App} from "../app";
import {parseProjectStructure} from "@core/project/projectConfig/parser";
import {errorToString} from "@/utils/str";
import {BaseProjectStructure} from "@core/project/projectConfig/baseProject";

type BuildOptions = {};

export default async function build(this: Command, app: App, [path]: [string, BuildOptions]) {
    const logger = App.createLogger(app);
    logger.info("Building project at", path);

    try {
        const project = await parseProjectStructure(BaseProjectStructure, app.resolvePath(path));
        console.log(project); // debug
    } catch (e) {
        logger.error("Failed to build project:", errorToString(e));
    }
}

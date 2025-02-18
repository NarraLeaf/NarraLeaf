import {Command} from "commander";
import {App} from "../app";
import {exec} from "../utils/platform";
import path from "path";

type InitOptions = {};

export default async function init(this: Command, app: App, [p]: [string, InitOptions]) {
    const logger = App.createLogger(app);
    const projectPath = path.isAbsolute(p) ? p : path.resolve(app.getProcess().cwd(), p);

    await exec(["npx", "narraleaf-skeleton", projectPath], app.getProcess());

    logger.info("Project initialized at", projectPath);
}

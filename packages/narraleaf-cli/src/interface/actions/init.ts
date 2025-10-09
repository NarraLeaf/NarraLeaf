import {Command} from "commander";
import {App} from "@/interface/app";
import path from "path";
import {exec} from "@/utils/os";

type InitOptions = {};

export default async function init(this: Command, app: App, [p]: [string, InitOptions]) {
    const logger = App.createLogger(app);
    const projectPath = path.isAbsolute(p) ? p : path.resolve(app.getProcess().cwd(), p);

    await exec(["npx", "narraleaf-skeleton@latest", projectPath], app.getProcess());

    logger.info("Project initialized at", projectPath);
}

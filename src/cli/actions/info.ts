import {App} from "../app";
import {Command} from "commander";

export default async function info(this: Command, app: App, []: []) {
    const logger = App.createLogger(app);
    logger.info("Platform Info:", app.getPlatform());
}

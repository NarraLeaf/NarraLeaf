import {App} from "../app";
import {Command} from "commander";
import {FallTask, Logger} from "../utils/logger";

export default async function info(this: Command, app: App, []: []) {
    /**
     * CLI test
     */
    const logger = App.createLogger(app);
    logger.info("Platform Info:", app.getPlatform());

    const fall = new FallTask(app, logger);
    fall.start("Login Information");
    await fall.input("Enter your name:");
    await fall.input("Enter your email:");

    await fall.waitForLoading<void>(async (resolve) => {
        setTimeout(() => {
            resolve();
        }, 3000);
    }, "logging in...");

    fall.end("Exit");

    const fall2 = new FallTask(app, logger);

    fall2.start("Profile Download");

    const time = Date.now();

    await fall2.waitForProgress<void>("loading...", 25, async (resolve, _, progress) => {
        const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
        for (let i = 0; i < 25; i++) {
            await sleep(100);
            progress.incrementTask();
        }
        resolve();
    });

    fall2.end(`Downloaded ${Logger.chalk.blue("25")} files in ${Date.now() - time}ms`);
}

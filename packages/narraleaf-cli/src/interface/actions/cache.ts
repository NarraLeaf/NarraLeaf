import {App} from "@/interface/app";
import {Command} from "commander";

export default async function info(this: Command, app: App, [action]: [string]) {
    const logger = App.createLogger(app);
}

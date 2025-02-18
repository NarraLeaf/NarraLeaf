import {Command} from "commander";
import {App} from "../app";

type BuildOptions = {};

export default function build(this: Command, app: App, [path]: [string, BuildOptions]) {}

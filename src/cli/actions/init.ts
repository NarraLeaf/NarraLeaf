import {Command} from "commander";
import {App} from "../app";

type InitOptions = {};

export default function init(this: Command, app: App, [path]: [string, InitOptions]) {}

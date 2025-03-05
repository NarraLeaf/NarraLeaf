import {CLIRegistry} from "./app";
import {Command} from "commander";
import info from "./actions/info";
import init from "./actions/init";
import build from "./actions/build";
import dev from "@/cli/actions/dev";


export const ActionRegistry: CLIRegistry = [
    {
        name: "info",
        command: new Command("info"),
        action: info,
    },
    {
        name: "init",
        command: new Command("init")
            .argument("[path]", "The path to the project directory", "."),
        action: init,
    },
    {
        name: "build",
        command: new Command("build")
            .argument("[path]", "The path to the project directory", "."),
        action: build,
    },
    {
        name: "dev",
        command: new Command("dev")
            .argument("[path]", "The path to the project directory", "."),
        action: dev,
    }
];

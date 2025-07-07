import {CLIRegistry} from "./app";
import {Command} from "commander";
import info from "./actions/info";
import init from "./actions/init";
import build from "./actions/build";
import dev from "@/cli/actions/dev";
import cache from "@/cli/actions/cache";

export const ActionRegistry: CLIRegistry = [
    {
        name: "info",
        command: new Command("info"),
        action: info,
    },
    {
        name: "init",
        command: new Command("init")
            .argument("[path]", "The path to the project directory", ".")
            .description("Initialize a new NarraLeaf project"),
        action: init,
    },
    {
        name: "build",
        command: new Command("build")
            .description("Build the project"),
        action: build,
    },
    {
        name: "dev",
        command: new Command("dev")
            .description("Start the development server"),
        action: dev,
    },
    {
        name: "cache",
        command: new Command("cache")
            .description("Manage the cache")
            .argument("[action]", "The action to perform", "where")
            .option("--force", "Force the action to be performed", false),
        action: cache,
    },
];

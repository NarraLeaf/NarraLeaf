import {CLIRegistry} from "./app";
import {Command} from "commander";
import info from "./actions/info";
import init from "./actions/init";


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
    }
];

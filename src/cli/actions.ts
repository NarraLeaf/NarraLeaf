import {CLIRegistry} from "./app";
import {Command} from "commander";
import info from "./actions/info";


export const ActionRegistry: CLIRegistry = [
    {
        name: "info",
        command: new Command("info"),
        action: info,
    }
];

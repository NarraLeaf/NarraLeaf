import {Command, program} from "commander";
import {Platform, PlatformInfo} from "@/utils/platform";
import {Logger} from "./logger";

type AppConfig = {
    name: string;
    version: string;
    actions: CLIRegistry;
};
type AppOptions = {
    debug: boolean;
};
export type CLIRegistry = {
    name: string;
    command: Command;
    action: (this: Command, app: App, options: any) => void;
}[];

export class App {
    public static LogLevel = {
        info: true,
        warn: true,
        error: true,
        debug: false,
    };

    public static createLogger(app: App): Logger {
        return new Logger({
            ...App.LogLevel,
            debug: app.opts().debug,
            platform: app.getPlatform(),
        });
    }

    public process: NodeJS.Process | undefined;

    constructor(private config: AppConfig) {
        this.registerCommands(config.actions);
    }

    public async run(process: NodeJS.Process): Promise<Command> {
        this.process = process;
        program
            .name(this.config.name)
            .version(this.config.version)
            .option("--debug", "Enable debug mode", false);
        return program.parseAsync(process.argv);
    }

    public opts(): AppOptions {
        return program.opts();
    }

    public getPlatform(): PlatformInfo {
        if (!this.process) {
            throw new Error("Cannot access platform info before running the app");
        }
        return Platform.getInfo(this.process);
    }

    public getProcess(): NodeJS.Process {
        if (!this.process) {
            throw new Error("Cannot access process before running the app");
        }
        return this.process;
    }

    private registerCommands(registry: CLIRegistry) {
        registry.forEach(({command, action}) => {
            program.addCommand(command.action((...args: any[]) => {
                return action.bind(command)(this, args);
            }));
        });
    }
}

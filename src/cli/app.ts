import {Command, program} from "commander";
import {Logger} from "./logger";
import path from "path";
import {Platform, PlatformInfo} from "@/utils/pure/os";
import {errorToString} from "@/utils/pure/string";
import {ChildProcess} from "child_process";

type AppConfig = {
    name: string;
    version: string;
    actions: CLIRegistry;
    cliRoot: string;
    cliDist: string;
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
    private childProcesses: ChildProcess[] = [];

    constructor(public config: AppConfig) {
        this.registerCommands(config.actions);

        if (!this.config.cliRoot) {
            throw new Error("cliRoot is required");
        }
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
            throw new Error("Cannot access platform info before running the App");
        }
        return Platform.getInfo(this.process);
    }

    public getProcess(): NodeJS.Process {
        if (!this.process) {
            throw new Error("Cannot access process before running the App");
        }
        return this.process;
    }

    public resolvePath(p: string): string {
        if (path.isAbsolute(p)) {
            return p;
        }
        return path.resolve(this.getProcess().cwd(), p);
    }

    public cwd(): string {
        return this.getProcess().cwd();
    }

    public createLogger(): Logger {
        return App.createLogger(this);
    }

    public registerChildProcess(process: ChildProcess): this {
        this.childProcesses.push(process);
        return this;
    }

    public unregisterChildProcess(process: ChildProcess): this {
        this.childProcesses = this.childProcesses.filter((p) => p !== process);
        return this;
    }

    public forceExit(code: number = 0): void {
        const logr = this.createLogger();
        this.childProcesses.forEach((process) => {
            try {
                process.kill("SIGKILL");
            } catch (e) {
                logr.warn("Failed to kill child process", errorToString(e));
            }
        });
        logr.warn("Force exiting with code", code);
        this.process?.exit(code);
    }

    private registerCommands(registry: CLIRegistry) {
        registry.forEach(({command, action}) => {
            program.addCommand(command.action((...args: any[]) => {
                return action.bind(command)(this, args);
            }));
        });
    }
}

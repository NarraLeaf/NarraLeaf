import chalk from "chalk";
import {Fs} from "./fs";
import {PlatformInfo, PlatformSystem} from "./platform";

type LoggerConfig = {
    debug: boolean;
    info: boolean;
    warn: boolean;
    error: boolean;
    platform: PlatformInfo;
};

type MessageContent = string | null | undefined | Array<any> | object;

export class Logger {
    public static readonly chalk = chalk;
    public static Types = {
        INFO: "INFO",
        WARN: "WARN",
        ERROR: "ERROR",
        DEBUG: "DEBUG"
    };
    private files: string[] = [];

    constructor(private config: LoggerConfig) {}

    public addFile(file: string): this {
        this.files.push(file);
        return this;
    }

    public offFile(file: string): this {
        this.files = this.files.filter((f) => f !== file);
        return this;
    }

    public debug(...content: MessageContent[]): this {
        if (!this.config.debug) {
            const message = this.mkMessage(Logger.Types.DEBUG, content);

            console.log(chalk.gray(message));
            this.appendLog(message);
        }
        return this;
    }

    public info(...content: MessageContent[]): this {
        if (this.config.info) {
            const message = this.mkMessage(Logger.Types.INFO, content);
            console.log(chalk.white(message));
            this.appendLog(message);
        }
        return this;
    }

    public warn(...content: MessageContent[]): this {
        if (this.config.warn) {
            const message = this.mkMessage(Logger.Types.WARN, content);
            console.log(chalk.yellow(message));
            this.appendLog(message);
        }
        return this;
    }

    public error(...content: MessageContent[]): this {
        if (this.config.error) {
            const message = this.mkMessage(Logger.Types.ERROR, content);
            console.log(chalk.red(message));
            this.appendLog(message);
        }
        return this;
    }

    private mkMessage(type: string, content: MessageContent[]): string {
        const time = new Date().toISOString();
        return `${time} [${type}] ` + content.map((c) => this.messageToString(c)).join(" ");
    }

    private messageToString(content: MessageContent): string {
        if (Array.isArray(content)) {
            return JSON.stringify(content);
        }

        if (typeof content === "object" && content !== null) {
            return JSON.stringify(content, null, 2);
        }

        return String(content);
    }

    private appendLog(message: string): void {
        for (const file of this.files) {
            const lineSuffix = this.config.platform.system === PlatformSystem.win32 ? "\r\n" : "\n";
            Fs.appendSync(file, message + lineSuffix);
        }
    }
}


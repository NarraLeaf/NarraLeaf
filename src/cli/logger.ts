import chalk from "chalk";
import {App} from "./app";
import {input, confirm} from "./inquirer";
import {Fs} from "@/utils/nodejs/fs";
import {PlatformInfo, PlatformSystem} from "@/utils/pure/os";
import {sliceString} from "@/utils/pure/string";

type LoggerConfig = {
    debug: boolean;
    info: boolean;
    warn: boolean;
    error: boolean;
    platform: PlatformInfo;
};

type MessageContent = string | number | null | undefined | Array<any> | object;

export class Logger {
    public static readonly chalk = chalk;
    public static Types = {
        INFO: "INFO",
        WARN: "WARN",
        ERROR: "ERROR",
        DEBUG: "DEBUG"
    };
    private files: string[] = [];

    constructor(private config: LoggerConfig) {
    }

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

    public raw(content: string): this {
        console.log(content);
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

class LoadingTask {
    static Frames = {
        0: ["-", "\\", "|", "/"],
    }

    text: string | undefined;
    frame: keyof typeof LoadingTask.Frames;
    _tick: number | undefined;
    _interval: NodeJS.Timeout | undefined;

    constructor(protected app: App, protected fallTask: FallTask, frame: keyof typeof LoadingTask.Frames = 0) {
        this.frame = frame;
    }

    start(str: string) {
        this.text = str;
        this._interval = setInterval(() => this.tick(), 100);
        return this;
    }

    clearLine(str?: string) {
        const clearLine = '\r' + ' '.repeat(this.app.getProcess().stdout.columns);
        if (str && str.length) this.app.getProcess().stdout.write(`${clearLine}\r${this.fallTask.getEndPrefix()} ${str}`);
        else this.app.getProcess().stdout.write(`${clearLine}\r`);
    }

    end(str?: string) {
        if (this._interval) clearInterval(this._interval);
        this.clearLine(str);
    }

    tick() {
        if (this._tick === undefined) this._tick = 0;
        else this._tick++;
        let output = [this.getAnimation(this._tick), this.text].join(" ");
        this.clearLine(output);
        return this;
    }

    setText(str: string) {
        this.text = str;
        return this;
    }

    getAnimation(tick: number) {
        const frames = LoadingTask.Frames[this.frame];
        return frames[tick % frames.length];
    }
}

class ProgressTask extends LoadingTask {
    static MaxLength = 120;
    static ProgressBarFrames = {
        0: {
            active: Logger.chalk.bgWhite(" "),
            inactive: Logger.chalk.bgGray(" ")
        }
    }

    maxTask: number;
    currentTask: number;
    pFrame: keyof typeof ProgressTask.ProgressBarFrames;

    constructor(
        protected app: App,
        protected fallTask: FallTask,
        frame: keyof typeof LoadingTask.Frames = 0,
        pFrame: keyof typeof ProgressTask.ProgressBarFrames = 0
    ) {
        super(app, fallTask, frame);

        this.maxTask = this.currentTask = 0;
        this.pFrame = pFrame;
    }

    setMaxTask(n: number) {
        this.maxTask = n;
        return this;
    }

    setCurrentTask(n: number) {
        this.currentTask = n;
        return this;
    }

    incrementTask() {
        this.currentTask++;
        return this;
    }

    tick() {
        if (this._tick === undefined) this._tick = 0;
        else this._tick++;

        const output = [`${this.fallTask.getEndPrefix()} ${this.getAnimation(this._tick)} │`, `│ (${this.currentTask}/${this.maxTask}) ${this.text}`];
        const prefixLength = output.reduce((acc, str) => acc + str.length, 0);

        this.app.getProcess().stdout.write(`\r${output.join(this.getProgressBar(prefixLength))}`);
        return this;
    }

    getProgressBar(prefixLength: number) {
        let maxLength = (this.app.getProcess().stdout.columns - prefixLength) > ProgressTask.MaxLength
            ? ProgressTask.MaxLength
            : this.app.getProcess().stdout.columns - prefixLength;
        let progress = Math.floor((this.currentTask / this.maxTask) * maxLength);
        return (this.getPFrame(true)).repeat(progress) + (this.getPFrame(false)).repeat(maxLength - progress);
    }

    getPFrame(active: boolean) {
        return ProgressTask.ProgressBarFrames[this.pFrame][active ? "active" : "inactive"];
    }

    log(message: string) {
        this.clearLine(message);
        this.fallTask.step("");
        return this;
    }
}

export class FallTask {
    static LoadingTask = LoadingTask;

    static fall(app: App, tasks: string[]) {
        const fall = new FallTask(app, App.createLogger(app));
        tasks.forEach((task, i) => {
            if (i === 0) fall.start(task);
            else if (i === tasks.length - 1) fall.end(task);
            else fall.step(task);
        });
    }

    constructor(protected app: App, protected logger: Logger) {
    }

    start(str: string) {
        this.logger.raw(`${this.getHeaderPrefix()} ${str}`);
        return this;
    }

    step(str: string, steps = 0, space = 0) {
        for (let i = 0; i < steps; i++) {
            this.logger.raw(`${this.getPrefix()}`);
        }
        let o = str.split("\n")
            .map((line) => line.length > this.app.getProcess().stdout.columns - (this.getPrefix().length + 2)
                ? sliceString(line, this.app.getProcess().stdout.columns - (this.getPrefix().length + 2))
                : line
            )
            .map((line) => " ".repeat(space) + line);
        o.forEach((line) => {
            this.logger.raw(`${this.getPrefix()} ${line}`);
        });
        return this;
    }

    waitForLoading<T>(
        handler: (resolve: (value: T) => void, reject: (message: string) => void, setText: (text: string) => void) => Promise<void> | void,
        str: string,
        frame: keyof typeof LoadingTask.Frames = 0
    ) {
        const loadingTask = new LoadingTask(this.app, this, frame);
        loadingTask.start(chalk.gray(str));
        return new Promise<T>((resolve, reject) => {
            handler(
                (value: T) => {
                    this.resetPrefix();
                    loadingTask.end("");
                    resolve(value);
                },
                (message: string) => {
                    this.resetPrefix();
                    loadingTask.end();
                    this.error(message);
                    reject(message);
                },
                (text: string) => loadingTask.setText(chalk.gray(text))
            );
        });
    }

    waitForProgress<T>(
        str: string,
        maxTask: number,
        handler: (resolve: (value: T) => void, reject: (message: string) => void, progress: ProgressTask) => Promise<void> | void,
        frame: keyof typeof LoadingTask.Frames = 0,
        pFrame: keyof typeof ProgressTask.ProgressBarFrames = 0
    ) {
        const progressTask = new ProgressTask(this.app, this, frame, pFrame);
        progressTask.start(chalk.gray(str)).setMaxTask(maxTask);
        return new Promise<T>((resolve, reject) => {
            handler(
                (value: T) => {
                    progressTask.end("\n");
                    resolve(value);
                },
                (message: string) => {
                    progressTask.end();
                    this.error(message);
                    reject(message);
                },
                progressTask
            );
        });
    }

    end(str: string) {
        this.resetPrefix();
        this.logger.raw(`${this.getEndPrefix()} ${str}`);
        return this;
    }

    error(str: string) {
        str.split("\n").forEach((line) => {
            this.step(chalk.red(line));
        });
        return this;
    }

    getPrefix() {
        return chalk.gray("│ ");
    }

    getEndPrefix() {
        return chalk.gray("╰─");
    }

    getHeaderPrefix() {
        return chalk.gray("╭─");
    }

    async input(prompt: string): Promise<string> {
        const answer = await input(prompt, {
            prefix: this.getEndPrefix()
        });
        this.resetPrefix();
        return answer;
    }

    async confirm(prompt: string): Promise<boolean> {
        const answer = await confirm(prompt, {
            prefix: this.getEndPrefix(),
        });
        this.resetPrefix();
        return answer;
    }

    resetPrefix() {
        this.app.getProcess().stdout.cursorTo(0);
        this.app.getProcess().stdout.moveCursor(0, -1);
        this.app.getProcess().stdout.write(`\r${this.getPrefix()}`);
        this.app.getProcess().stdout.moveCursor(-this.getPrefix().length, 1);
    }
}


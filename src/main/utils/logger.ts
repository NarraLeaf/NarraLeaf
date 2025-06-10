
export class Logger {
    constructor(private readonly name: string) {}

    public info(message: string) {
        console.log(`[${this.name}] ${message}`);
    }

    public error(message: string) {
        console.error(`[${this.name}] ${message}`);
    }

    public warn(message: string) {
        console.warn(`[${this.name}] ${message}`);
    }

    public debug(message: string) {
        console.debug(`[${this.name}] ${message}`);
    }

    public trace(message: string) {
        console.trace(`[${this.name}] ${message}`);
    }
}

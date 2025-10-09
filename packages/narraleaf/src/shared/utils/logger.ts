
type MessageContent = string | number | null | undefined | Array<any> | object | unknown;

export class Logger {
    constructor(private readonly name: string) {}

    public info(...content: MessageContent[]) {
        const message = this.formatMessage(content);
        console.log(`[${this.name}] ${message}`);
    }

    public error(...content: MessageContent[]) {
        const message = this.formatMessage(content);
        console.error(`[${this.name}] ${message}`);
    }

    public warn(...content: MessageContent[]) {
        const message = this.formatMessage(content);
        console.warn(`[${this.name}] ${message}`);
    }

    public debug(...content: MessageContent[]) {
        const message = this.formatMessage(content);
        console.debug(`[${this.name}] ${message}`);
    }

    public trace(...content: MessageContent[]) {
        const message = this.formatMessage(content);
        console.trace(`[${this.name}] ${message}`);
    }

    private formatMessage(content: MessageContent[]): string {
        return content.map((c) => this.messageToString(c)).join(" ");
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
}

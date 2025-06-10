import { IPCEventType } from "@core/ipc/events";
import { IPCMessageType } from "@core/ipc/ipc";
import { IPCHandler } from "./handler/IPCHandler";
import { Logger } from "@/main/utils/logger";

export class WindowUserHandlers {
    private handlers: Record<string, (data: any) => Promise<any> | any> = {};

    constructor(private readonly logger: Logger) {}

    public handle<Request = any, Response = any>(event: string, handler: (data: Request) => Promise<Response> | Response): void {
        if (this.handlers[event]) {
            this.logger.warn(`Handler for event ${event} already exists, overriding`);
        }
        this.handlers[event] = handler;
    }

    public isHandled(event: string): boolean {
        return this.handlers[event] !== undefined;
    }

    public off(event: string): void {
        delete this.handlers[event];
    }

    public async invoke<Request = any, Response = any>(event: string, data: Request): Promise<Response> {
        if (!this.handlers[event]) {
            this.logger.error(`Handler for event ${event} not found`);
            return null as Response;
        }
        return this.handlers[event](data);
    }
}

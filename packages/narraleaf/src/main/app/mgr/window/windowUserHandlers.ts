import { Logger } from "@/shared/utils/logger";

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

    /**
     * Looks up and invokes the handler in one step (avoids check-then-invoke races with `off()`).
     */
    public async invoke<Request = any, Response = any>(
        event: string,
        payload: Request
    ): Promise<{ ok: true; data: Response } | { ok: false; reason: "not_registered" }> {
        const handler = this.handlers[event];
        if (!handler) {
            this.logger.error(`Handler for event ${event} not found`);
            return { ok: false, reason: "not_registered" };
        }
        return { ok: true, data: await handler(payload) };
    }
}

import { EventEmitter } from "events";
import { AppEventToken } from "../../types";
import { StringKeyOf } from "narraleaf-react/dist/util/data";

type WindowEventTypes = {
    close: [];
    "render-process-gone": [reason: string, detail: string];
};

export class WindowEventManager {
    private events: EventEmitter<WindowEventTypes> = new EventEmitter<WindowEventTypes>();

    public onClose(fn: () => void): AppEventToken {
        const handler = () => {
            fn();
        };
        this.events.on("close", handler);
        return {
            cancel: () => {
                this.events.removeListener("close", handler);
            }
        };
    }

    public onEvent<Request, Response>(event: string, fn: (payload: Request) => Promise<Response> | Response): AppEventToken {
        const handler = (payload: Request) => {
            const result = fn(payload);
            if (result instanceof Promise) {
                return result;
            }
            return Promise.resolve(result);
        };

        this.events.on(event as any, handler);
        return {
            cancel: () => {
                this.events.removeListener(event as any, handler);
            }
        };
    }

    public emit<K extends StringKeyOf<WindowEventTypes>>(event: K, ...args: WindowEventTypes[K]): void {
        this.events.emit(event, ...args as any);
    }

    public onRenderProcessGone(fn: (reason: string, detail: string) => void): AppEventToken {
        const handler = (reason: string, detail: string) => {
            fn(reason, detail);
        };
        this.events.on("render-process-gone", handler);
        return {
            cancel: () => {
                this.events.removeListener("render-process-gone", handler);
            }
        };
    }
} 
import { IPCEvents, IPCEventType, RequestStatus } from "@shared/types/ipcEvents";
import { WindowProxy } from "../windowProxy";

export type EventResponse<T extends IPCEventType> = IPCEvents[T] extends { response: infer R } ? R : never;
export type IPCHandlerProps<T extends IPCEventType> = IPCEvents[T]["data"];

export abstract class IPCHandler<T extends IPCEventType> {
    abstract readonly name: T;
    abstract readonly type: IPCEvents[T]["type"];
    public abstract handle(window: WindowProxy, data: IPCEvents[T]["data"]): Promise<RequestStatus<EventResponse<T>>> | RequestStatus<EventResponse<T>>;

    protected failed(err: unknown): {
        success: false;
        data?: never;
        error?: string;
    } {
        return {
            success: false,
            error: err instanceof Error ? err.message : String(err),
        };
    }

    protected success<T>(data: T): RequestStatus<T>;
    protected success(): RequestStatus<void>;
    protected success<T = undefined>(data?: T extends undefined ? never : T): RequestStatus<T extends undefined ? void : T> {
        if (data !== undefined) {
            return {
                success: true,
                data,
            };
        }
        return {
            success: true,
            data: undefined as any,
        };
    }

    protected async tryUse<T>(exec: () => T | Promise<T>): Promise<RequestStatus<T>> {
        try {
            const data = await exec();
            return this.success(data);
        } catch (err) {
            return this.failed(err);
        }
    }
}

import { NarraLeaf } from "@narraleaf/shared";

const api = window[NarraLeaf];

/**
 * Escape-hatch RPC to the main process (`app.event.requestMain`): string event name + loosely typed payload/response.
 *
 * Prefer {@link invokeMainEvent} once events are registered on {@link MainProcessEventMap}.
 *
 * @throws {Error} When the IPC layer reports `success: false`.
 *
 * @example
 * ```ts
 * const value = await requestMain<{ id: string }, string>("legacy:lookup", { id: "x" });
 * ```
 */
export const requestMain = async <Request, Response>(event: string, ...args: Response extends void ? [payload?: Request] : [payload: Request]): Promise<Response> => {
    const response = await api.app.requestMain<Request, Response>(event, ...args);
    if (response.success) {
        return response.data;
    }
    throw new Error(response.error);
};

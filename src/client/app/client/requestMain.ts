import { NarraLeafMainWorldProperty } from "@/core/build/constants";

const api = window[NarraLeafMainWorldProperty];

/**
 * Request a main event from the main process.
 * @param event - The event to request.
 * @param payload - The payload to send to the main process.
 * @returns The response from the main process.
 * @throws An error if the request fails.
 */
export const requestMain = async <Request, Response>(event: string, ...args: Response extends void ? [payload?: Request] : [payload: Request]): Promise<Response> => {
    const response = await api.app.requestMain<Request, Response>(event, ...args);
    if (response.success) {
        return response.data;
    }
    throw new Error(response.error);
};

/**
 * Request a main event from the main process using the global IPC function.
 * @param event - The event to request (will be prefixed with 'narraleaf:').
 * @param payload - The payload to send to the main process.
 * @returns The response from the main process.
 * @throws An error if the request fails or if request_ipc is not available.
 */
export const requestMain = async <Request, Response>(event: string, ...args: Response extends void ? [payload?: Request] : [payload: Request]): Promise<Response> => {
    // Ensure the global request_ipc function is available
    if (!window.request_ipc) {
        throw new Error("request_ipc function is not available. NarraLeaf plugin may not be initialized.");
    }

    // Prefix event with narraleaf: namespace for security
    const namespacedEvent = event.startsWith('narraleaf:') ? event : `narraleaf:${event}`;

    // Extract payload from args
    const payload = args.length > 0 ? args[0] : {};

    // Call the global request_ipc function
    const response = await window.request_ipc(namespacedEvent, payload);

    return response as Response;
};

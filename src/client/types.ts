
// Global type declarations for NarraLeaf IPC
declare global {
    interface Window {
        /**
         * Global IPC function for communicating with the main process
         * This is injected by the NarraLeaf Tauri plugin and provides
         * secure communication without exposing Tauri APIs directly
         *
         * @param requestType - The type of request (must start with 'narraleaf:')
         * @param payload - The request payload
         * @returns Promise that resolves with the response data
         */
        request_ipc: (requestType: string, payload?: any) => Promise<any>;
    }
}

export * from "./app/app.types";
export * from "./components/components.types";
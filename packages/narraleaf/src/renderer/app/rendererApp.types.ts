import type { App } from "./app";

/**
 * Application handle exposed to renderer UI code via {@link useApp}.
 * Intentionally omits internal fields (e.g. event emitters) so ecosystem code can depend on a smaller contract.
 */
export type RendererApp = Pick<
    App,
    | "config"
    | "state"
    | "getCrashReport"
    | "crash"
    | "newGame"
    | "loadGame"
    | "exitGame"
    | "continueGame"
    | "listSaves"
    | "createRecovery"
    | "quit"
>;

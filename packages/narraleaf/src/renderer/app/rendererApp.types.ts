import type { App } from "./app";

/**
 * Stable subset of the renderer {@link App} class exposed through {@link useApp}.
 * Intentionally omits internal fields (for example `events`) so downstream code can depend on a smaller contract.
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

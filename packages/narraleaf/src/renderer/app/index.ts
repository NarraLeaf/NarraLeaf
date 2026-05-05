/**
 * Renderer runtime helpers re-exported from `narraleaf/renderer`: save hooks, main-process RPC wrappers, and {@link SaveType}.
 */
export {
    useCurrentSaved,
    useCurrentSavedRef,
    useSaveAction,
    useSavedGames,
    readGame,
} from "./game/save/gameSaveHooks";
export { requestMain } from "./game/requestMain";
export { invokeMainEvent } from "./game/mainBridge";
export type { RendererApp } from "./rendererApp.types";

/** Save classification aligned with `@shared/types/save` and main-process save IPC. */
export { SaveType } from "@shared/types/save";
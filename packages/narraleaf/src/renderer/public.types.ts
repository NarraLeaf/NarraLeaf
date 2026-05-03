/**
 * Stable type surface for `narraleaf/renderer` consumers (generated renderer entries,
 * extensions, and documentation). Implementation-only types stay in module-local imports
 * (e.g. `@renderer/app/app.types`) and are not re-exported from the package root.
 */
export type {
    LayoutModule,
    PageModule,
    PageModuleData,
    AppRouterModuleData,
    ProductionAppRouterModuleData,
    ProductionLayoutModuleDir,
    ProductionPageModuleData,
    LayoutModuleDir,
} from "./app/app.types";

export type { SavedGameMetaData } from "narraleaf-react";
export type { UseSaveActionResult, UseSavedGameResult } from "./app/game/save/gameSaveHooks";
export type { SavedGameMeta } from "@shared/types/save";

export type { MainProcessEventMap, MainProcessEventEntry } from "@renderer/app/game/mainBridge";

export type * from "./components/components.types";

export type {GamePlaybackState} from "./components/hooks/useGamePlayback";

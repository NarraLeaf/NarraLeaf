/**
 * Stable type-only surface for `narraleaf/renderer` consumers (generated renderer entries, extensions, docs).
 * Runtime hooks/components are exported from the same package entry via `export *` chains.
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

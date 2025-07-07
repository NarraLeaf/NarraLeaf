import { AppInfo } from "@/core/@types/global";
import { NarraLeaf } from "@/core/build/constants";
import * as NLReact from "narraleaf-react";
import { Game } from "narraleaf-react";
import React from "react";

type EventToken = {
    cancel(): void;
};
interface AppConfig {
    appInfo: AppInfo;
    router: ReturnType<typeof NLReact["useRouter"]>;
    game: Game;
    api: typeof window[typeof NarraLeaf];
};

export type LayoutModule = {
    default: React.FunctionComponent<{
        children: React.ReactNode;
    }>;
};

export type PageModule = {
    default: React.FunctionComponent;
};

type LayoutModuleData = {
    name: string;
    path: string;
    module: LayoutModule;
};

export type PageModuleData = {
    name: string;
    path: string;
    module: PageModule;
};

type LayoutModuleDir = {
    name: string;
    path: string;
    isSlug?: boolean;
    layout?: LayoutModuleData | null;
    indexHandler?: PageModuleData | null;
    children: (LayoutModuleDir | PageModuleData)[];
};

type AppRouterModuleData = {
    root: LayoutModuleDir;
    rootPath: string;
    errorHandler?: PageModuleData | null;
};

// Production types without any path information
type ProductionPageModuleData = {
    name: string;
    module: PageModule;
};

type ProductionLayoutModuleData = {
    name: string;
    path: string;
    module: LayoutModule;
};

type ProductionLayoutModuleDir = {
    name: string;
    isSlug?: boolean;
    layout?: ProductionLayoutModuleData | null;
    indexHandler?: ProductionPageModuleData | null;
    children: (ProductionLayoutModuleDir | ProductionPageModuleData)[];
};

type ProductionAppRouterModuleData = {
    root: ProductionLayoutModuleDir;
    errorHandler?: ProductionPageModuleData | null;
};

export {
    type NLReact,
};
export type {
    AppRouterModuleData,
    ProductionAppRouterModuleData,
    ProductionLayoutModuleDir,
    ProductionPageModuleData,
    LayoutModuleDir,
    EventToken,
    AppConfig,
};
export type { SavedGameMetaData } from "narraleaf-react";
export type { UseSaveActionResult, UseSavedGameResult } from "./game/save/gameSaveHooks";
export type { SavedGameMeta } from "@core/game/save";
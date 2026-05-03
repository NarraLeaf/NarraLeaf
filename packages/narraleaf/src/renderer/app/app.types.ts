import { AppInfo } from "@shared/types/global";
import { NarraLeaf } from "@narraleaf/shared";
import * as NLReact from "narraleaf-react";
import { Game } from "narraleaf-react";
import React from "react";

/** Cancellation handle returned by preference/state subscriptions (internal renderer use). */
export type EventToken = {
    cancel(): void;
};

/** Runtime wiring for {@link App}; not part of the stable `narraleaf/renderer` public type bundle. */
export interface AppConfig {
    appInfo: AppInfo;
    router: ReturnType<typeof NLReact["useRouter"]>;
    game: Game;
    api: typeof window[typeof NarraLeaf];
}

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

export type LayoutModuleDir = {
    name: string;
    path: string;
    isSlug?: boolean;
    layout?: LayoutModuleData | null;
    indexHandler?: PageModuleData | null;
    children: (LayoutModuleDir | PageModuleData)[];
};

export type AppRouterModuleData = {
    root: LayoutModuleDir;
    rootPath: string;
    errorHandler?: PageModuleData | null;
};

// Production types without any path information
export type ProductionPageModuleData = {
    name: string;
    module: PageModule;
};

type ProductionLayoutModuleData = {
    name: string;
    path: string;
    module: LayoutModule;
};

export type ProductionLayoutModuleDir = {
    name: string;
    isSlug?: boolean;
    layout?: ProductionLayoutModuleData | null;
    indexHandler?: ProductionPageModuleData | null;
    children: (ProductionLayoutModuleDir | ProductionPageModuleData)[];
};

export type ProductionAppRouterModuleData = {
    root: ProductionLayoutModuleDir;
    errorHandler?: ProductionPageModuleData | null;
};

import { AppInfo } from "@/core/@types/global";
import { NarraLeafMainWorldProperty } from "@/core/build/constants";
import * as NLReact from "narraleaf-react";
import { Game } from "narraleaf-react";

type EventToken = {
    cancel(): void;
};
interface AppConfig {
    appInfo: AppInfo;
    router: ReturnType<typeof NLReact["useRouter"]>;
    game: Game;
    api: typeof window[typeof NarraLeafMainWorldProperty];
};

type PageModuleData = {
    name: string;
    path: string;
    module: any;
};

type LayoutModuleDir = {
    name: string;
    path: string;
    isSlug: boolean;
    layout: PageModuleData | null;
    indexHandler: PageModuleData | null;
    children: (LayoutModuleDir | PageModuleData)[];
};

type AppRouterModuleData = {
    root: LayoutModuleDir;
    rootPath: string;
};

// Production types without any path information
type ProductionPageModuleData = {
    name: string;
    module: any;
};

type ProductionLayoutModuleDir = {
    name: string;
    isSlug: boolean;
    layout: ProductionPageModuleData | null;
    indexHandler: ProductionPageModuleData | null;
    children: (ProductionLayoutModuleDir | ProductionPageModuleData)[];
};

type ProductionAppRouterModuleData = {
    root: ProductionLayoutModuleDir;
};

export {
    type NLReact,
};
export type {
    AppRouterModuleData,
    ProductionAppRouterModuleData,
    EventToken,
    AppConfig,
};
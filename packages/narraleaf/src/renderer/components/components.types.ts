
import type { Story } from "narraleaf-react";
import { AppRouterModuleData, ProductionAppRouterModuleData } from "../types";

export type GameMetadata = {
    story: Story;
};

export type RendererAppRootProps = {
    renderer: { render: (children: React.ReactNode) => void; unmount: () => void };
    App: React.FunctionComponent<{ children: React.ReactNode }>;
    appRouterData: ProductionAppRouterModuleData | AppRouterModuleData;
    metadata: GameMetadata;
};

export type { ErrorFallbackProps } from "./errorHandling/errorHandling";
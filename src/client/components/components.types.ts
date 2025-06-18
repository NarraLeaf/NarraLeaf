import { AppRouterModuleData, ProductionAppRouterModuleData } from "@/client";
import type { Story } from "narraleaf-react";

export type GameMetadata = {
    story: Story;
};

export type RendererAppRootProps = {
    renderer: { render: (children: React.ReactNode) => void; unmount: () => void };
    App: React.FunctionComponent<{ children: React.ReactNode }>;
    appRouterData: ProductionAppRouterModuleData | AppRouterModuleData;
    metadata: GameMetadata;
};
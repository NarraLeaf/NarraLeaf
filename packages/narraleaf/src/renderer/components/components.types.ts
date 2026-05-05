
import type { Story } from "narraleaf-react";
import { AppRouterModuleData, ProductionAppRouterModuleData } from "../types";

/** Minimal story metadata required to boot the renderer shell. */
export type GameMetadata = {
    story: Story;
};

/**
 * Arguments for {@link render}: React root adapter, user `App` shell, router module tree, and story metadata.
 */
export type RendererAppRootProps = {
    renderer: { render: (children: React.ReactNode) => void; unmount: () => void };
    App: React.FunctionComponent<{ children: React.ReactNode }>;
    appRouterData: ProductionAppRouterModuleData | AppRouterModuleData;
    metadata: GameMetadata;
};

export type { ErrorFallbackProps } from "./errorHandling/errorHandling";
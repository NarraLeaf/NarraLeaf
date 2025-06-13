import {NarraLeafMainWorldProperty} from "@core/build/constants";
import {CriticalRendererProcessError} from "@/main/utils/error";
import React from "react";
import {AppInfo} from "@core/@types/global";
import {ErrorBoundary} from "@/client/app/errorHandling/error-boundary";
import ErrorFallback from "@/client/app/errorHandling/error-fallback";
import {AppPlayer} from "@/client";
import {GameMetadata, Meta} from "@/client/app/types";
import AppProviders from "@/client/app/providers/app-providers";
import {AppConfig} from "@/client/app/client/app";

type NarraLeafReact = typeof import("narraleaf-react");
export type Pages = {
    [key: string]: {
        name: string;
        registry: PageRegistry;
    }
};
export type PageConfig = Partial<React.ComponentProps<NarraLeafReact["Page"]>>;

interface PageRegistry {
    component: React.FunctionComponent;
    config?: PageConfig;
}

async function render(
    root: {
        render: (children: React.ReactNode) => void;
        unmount: () => void;
    },
    lib: {
        NarraLeafReact: NarraLeafReact;
        App: React.FunctionComponent<{ children: React.ReactNode }>;
        pages: Pages;
        metadata: GameMetadata;
    },
): Promise<void> {
    if (!window) {
        throw new CriticalRendererProcessError("Cannot access Window object in the renderer process");
    }
    if (!window[NarraLeafMainWorldProperty]) {
        window.close();
    }
    if (!lib.metadata.story) {
        window[NarraLeafMainWorldProperty].app.terminate(new Error("Story not found in the meta object"));
    }

    const reactMainVersion = React.version.split(".")[0];
    const appInfo: AppInfo = await window[NarraLeafMainWorldProperty].getPlatform();
    const appConfig: AppConfig = {
        appInfo,
    };

    if (reactMainVersion !== "19") {
        window[NarraLeafMainWorldProperty].app.terminate(new Error("React 19 is required to run NarraLeaf, you are using React " + reactMainVersion));
    }
    if (!appInfo.isPackaged) {
        console.log("NarraLeaf is Running in development mode");
        console.log("AppInfo received", appInfo);
    }

    root.render(
        <React.StrictMode>
            <ErrorBoundary fallback={<ErrorFallback/>} crash={appInfo.isPackaged}>
                <lib.NarraLeafReact.GameProviders>
                    <AppProviders appConfig={appConfig}>
                        <lib.App>
                            <AppPlayer
                                metadata={lib.metadata}
                                story={lib.metadata.story}
                                lib={lib.NarraLeafReact}
                                pages={lib.pages}
                            />
                        </lib.App>
                    </AppProviders>
                </lib.NarraLeafReact.GameProviders>
            </ErrorBoundary>
        </React.StrictMode>
    );
}

export {render};

import {NarraLeafMainWorldProperty} from "@core/build/constants";
import {CriticalRendererProcessError} from "@/main/error/criticalError";
import React from "react";
import {AppInfo} from "@core/@types/global";
import {ErrorBoundary} from "@/client/app/errorHandling/error-boundary";
import ErrorFallback from "@/client/app/errorHandling/error-fallback";
import {AppPlayer} from "@/client";
import {Meta} from "@/client/app/types";
import AppProviders from "@/client/app/providers/app-providers";
import {AppConfig} from "@/client/app/client/app";

type NarraLeafReact = typeof import("narraleaf-react");

async function render(
    root: {
        render: (children: React.ReactNode) => void;
        unmount: () => void;
    },
    lib: {
        NarraLeafReact: NarraLeafReact;
        App: React.ComponentClass<React.PropsWithChildren<{}>>;
        pages: React.ReactNode[];
        meta: Meta;
    },
): Promise<void> {
    if (!window) {
        throw new CriticalRendererProcessError("Cannot access Window object in the renderer process");
    }
    if (!window[NarraLeafMainWorldProperty]) {
        throw new CriticalRendererProcessError("Cannot access NarraLeaf API in the renderer process");
    }
    if (!lib.meta.story) {
        throw new Error("Story not found in the meta object");
    }

    const appInfo: AppInfo = await window[NarraLeafMainWorldProperty].getPlatform();
    const appConfig: AppConfig = {
        appInfo,
    };

    root.render(
        <React.StrictMode>
            <ErrorBoundary fallback={<ErrorFallback/>} crash={appInfo.isPackaged}>
                <lib.NarraLeafReact.GameProviders>
                    <AppProviders appConfig={appConfig}>
                        <lib.App>
                            <AppPlayer meta={lib.meta} story={lib.meta.story} lib={lib.NarraLeafReact}>
                                {...lib.pages}
                            </AppPlayer>
                        </lib.App>
                    </AppProviders>
                </lib.NarraLeafReact.GameProviders>
            </ErrorBoundary>
        </React.StrictMode>
    );
}

export {render};

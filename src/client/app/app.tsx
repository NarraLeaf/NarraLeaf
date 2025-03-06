import {NarraLeafMainWorldProperty} from "@core/build/constants";
import {CriticalRendererProcessError} from "@/main/error/criticalError";
import React from "react";
import {AppInfo} from "@core/@types/global";
import {ErrorBoundary} from "@/client/app/error-boundary";
import ErrorFallback from "@/client/app/error-fallback";
import {AppPlayer} from "@/client";

type NarraLeafReact = typeof import("narraleaf-react");

async function render(
    root: {
        render: (children: React.ReactNode) => void;
        unmount: () => void;
    },
    lib: {
        NarraLeafReact: NarraLeafReact;
        story: InstanceType<NarraLeafReact["Story"]>;
        App: React.ComponentClass<React.PropsWithChildren<{}>>;
        pages: React.ReactNode[];
    },
): Promise<void> {
    if (!window) {
        throw new CriticalRendererProcessError("Window object is not available in the renderer process");
    }
    if (!window[NarraLeafMainWorldProperty]) {
        throw new CriticalRendererProcessError("NarraLeaf API is not available in the renderer process");
    }

    const appInfo: AppInfo = await window[NarraLeafMainWorldProperty].getPlatform();

    root.render(
        <ErrorBoundary fallback={<ErrorFallback/>} crash={appInfo.isPackaged}>
            <lib.NarraLeafReact.GameProviders>
                <lib.App>
                    <AppPlayer story={lib.story} lib={lib.NarraLeafReact}>
                        {...lib.pages}
                    </AppPlayer>
                </lib.App>
            </lib.NarraLeafReact.GameProviders>
        </ErrorBoundary>
    );
}

export {render};

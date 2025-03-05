import {NarraLeafMainWorldProperty} from "@core/build/constants";
import {CriticalRendererProcessError} from "@/main/error/criticalError";
import React from "react";
import {AppInfo} from "@core/@types/global";
import {ErrorBoundary} from "@/client/app/error-boundary";
import ErrorFallback from "@/client/app/error-fallback";

async function render(root: {
    render: (children: React.ReactNode) => void;
    unmount: () => void;
}, children: React.ReactNode): Promise<void> {
    if (!window) {
        throw new CriticalRendererProcessError("Window object is not available in the renderer process");
    }
    if (!window[NarraLeafMainWorldProperty]) {
        throw new CriticalRendererProcessError("NarraLeaf API is not available in the renderer process");
    }

    const appInfo: AppInfo = await window[NarraLeafMainWorldProperty].getPlatform();
    console.log("NarraLeaf App info: ", appInfo);

    // @debug
    root.render(
        <ErrorBoundary fallback={<ErrorFallback/>} crash={true}>
            {children}
        </ErrorBoundary>
    );
}

export {render};

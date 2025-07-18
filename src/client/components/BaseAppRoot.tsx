import { NarraLeaf } from "@/core/build/constants";
import { CriticalRendererProcessError } from "@/main/utils/error";
import React from "react";
import { RendererAppRootProps } from "./components.types";
import { AppInfo } from "@/core/@types/global";
import { GameProviders } from "narraleaf-react";
import { App } from "./lib/App";
import { CriticalErrorBoundary } from "./errorHandling/CriticalErrorBoundary";
import { BaseAppErrorFallback } from "./errorHandling/BaseAppErrorFallback";

function validateEnv(): void {
    if (!window || !window[NarraLeaf] || !document) {
        throw new CriticalRendererProcessError("Invalid environment");
    }

    const reactMainVersion = React.version.split(".")[0];
    if (reactMainVersion !== "19") {
        throw new CriticalRendererProcessError("React 19 is required to run NarraLeaf, you are using React " + reactMainVersion);
    }
}

function validateConfig(config: RendererAppRootProps): void {
    if (!config.metadata.story) {
        throw new Error("Story not found in the meta object");
    }
}

async function requestAppInfo(): Promise<{ok: boolean, data: AppInfo | null, error?: Error | null}> {
    try {
        const data = await window[NarraLeaf].getPlatform();
        return {ok: true, data};
    } catch (error) {
        return {ok: false, data: null, error: error as Error};
    }
}

export async function render(config: RendererAppRootProps): Promise<void> {
    const {
        renderer,
    } = config;
    const initialTimestamp = Date.now();

    // Validate environment and config
    validateEnv();
    validateConfig(config);

    // Request app info
    const {ok, data, error} = await requestAppInfo();
    if (!ok || !data) {
        window[NarraLeaf].app.terminate(error || null);
    }

    const ErrorFallbackComponent = config.appRouterData.errorHandler?.module?.default || BaseAppErrorFallback;

    renderer.render(
        <React.StrictMode>
            <CriticalErrorBoundary appInfo={data!} initialTimestamp={initialTimestamp} fallback={ErrorFallbackComponent}>
                <GameProviders>
                    <App appInfo={data!} api={window[NarraLeaf]} config={config} />
                </GameProviders>
            </CriticalErrorBoundary>
        </React.StrictMode>
    );
}

import { NarraLeaf } from "@narraleaf/shared";
import { CriticalRendererProcessError } from "@shared/utils/error";
import React from "react";
import { RendererAppRootProps } from "./components.types";
import { AppInfo } from "@shared/types/global";
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

/**
 * Mounts the NarraLeaf renderer root under React 19 using the provided `renderer` adapter
 * (typically `createRoot` from `react-dom/client`).
 *
 * Validates `window.NarraLeaf`, document presence, `metadata.story`, and React major version.
 * Fetches {@link AppInfo} via preload; on failure terminates the host process and **returns without mounting**.
 *
 * @param config - Root props: renderer bridge, user shell, router data, story metadata.
 *
 * @example
 * ```ts
 * import { createRoot } from "react-dom/client";
 * import { render } from "narraleaf/renderer";
 * import { App } from "./App";
 *
 * const root = createRoot(document.getElementById("root")!);
 * await render({
 *   renderer: { render: (el) => root.render(el), unmount: () => root.unmount() },
 *   App,
 *   appRouterData,
 *   metadata: { story },
 * });
 * ```
 */
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
        return;
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

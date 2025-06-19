import { AppInfo } from "@/core/@types/global";
import { NarraLeaf } from "@/core/build/constants";
import { useGame, useRouter } from "narraleaf-react";
import { App as Application } from "@/client/app/app";
import { useState } from "react";
import { AppProvider } from "./providers/AppProvider";
import { RendererAppRootProps } from "../components.types";
import { AppPlayer } from "./AppPlayer";

type AppProps = {
    appInfo: AppInfo;
    config: RendererAppRootProps;
    api: typeof window[typeof NarraLeaf];
};

export function App({appInfo, api, config}: AppProps) {
    const game = useGame();
    const router = useRouter();
    const [app] = useState<Application>(() => new Application({
        appInfo,
        game,
        router,
        api,
    }));

    const AppUserEntry = config.App;

    return (
        <AppProvider app={app}>
            <AppUserEntry>
                <AppPlayer config={config} />
            </AppUserEntry>
        </AppProvider>
    );
}


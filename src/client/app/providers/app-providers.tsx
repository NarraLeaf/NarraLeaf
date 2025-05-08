import React from "react";
import {SplashScreenProvider} from "@/client/app/providers/splash-screen-provider";
import {App, AppConfig} from "@/client/app/client/app";
import {AppProvider} from "@/client/app/providers/app";
import {GamePlaybackProvider} from "@/client/app/providers/game-state-provider";

export default function AppProviders({children, appConfig}: { children: React.ReactNode; appConfig: AppConfig; }) {
    const [app] = React.useState(() => new App(appConfig));

    return (
        <>
            <AppProvider app={app}>
                <SplashScreenProvider>
                    <GamePlaybackProvider>
                        {children}
                    </GamePlaybackProvider>
                </SplashScreenProvider>
            </AppProvider>
        </>
    );
}

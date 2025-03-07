import React from "react";
import {Meta} from "@/client/app/types";
import {SplashScreen} from "@/client/app/splash-screen/splash-screen";

type NarraLeafReact = typeof import("narraleaf-react");

const AppPlayer = ({story, children, lib, meta}: {
    story: InstanceType<NarraLeafReact["Story"]>;
    children: React.ReactNode;
    lib: NarraLeafReact;
    meta: Meta;
}) => {
    const splashScreens = meta.splashScreen
        ? Array.isArray(meta.splashScreen)
            ? meta.splashScreen
            : [meta.splashScreen]
        : null;

    return (
        <>
            <SplashScreen splashScreens={splashScreens}>
                <lib.Player
                    story={story}
                    onReady={({liveGame}) => {
                        liveGame.newGame();
                    }}
                    width="100%"
                    height="100%"
                >
                    {children}
                </lib.Player>
            </SplashScreen>
        </>
    );
}

export {AppPlayer};


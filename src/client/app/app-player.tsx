import React, {useEffect, useRef} from "react";
import {Meta} from "@/client/app/types";
import {SplashScreen} from "@/client/app/splash-screen/splash-screen";
import {useApp, useCurrentSaved} from "@/client";
import {AsyncTaskQueue} from "@/utils/pure/array";
import {NarraLeafMainWorldProperty, RendererHomePage} from "@core/build/constants";
import {PageConfig, Pages} from "@/client/app/app";
import { Page, useGame, useRouter } from "narraleaf-react";
import merge from "lodash/merge";
import {useSplashScreen} from "@/client/app/providers/splash-screen-provider";
import {useGameFlow} from "@/client/app/providers/game-state-provider";
import { throttle } from "./utils/data";

type NarraLeafReact = typeof import("narraleaf-react");

const AppPlayerContent = ({story, pages, lib, meta}: {
    story: InstanceType<NarraLeafReact["Story"]>;
    pages: Pages;
    lib: NarraLeafReact;
    meta: Meta;
}) => {
    const splashScreens = meta.splashScreen
        ? Array.isArray(meta.splashScreen)
            ? meta.splashScreen
            : [meta.splashScreen]
        : null;
    const currentSaved = useCurrentSaved();
    const queue = useRef(new AsyncTaskQueue());
    const router = useRouter();
    const game = useGame();
    const {app} = useApp();
    const {isFinished} = useSplashScreen();
    const {setGameFlow} = useGameFlow();

    const pageStyles: PageConfig = {
        style: {
            position: "absolute",
            inset: 0,
        },
    };

    useEffect(() => {
        if (currentSaved) {
            const handler = () => {
                queue.current.clear().push(async () => {
                    await window[NarraLeafMainWorldProperty].game.save.createRecovery(currentSaved);
                });
            };
            const throttledHandler = throttle(handler, app.appInfo.config.recoveryCreationInterval);

            throttledHandler();
            return () => throttledHandler.cleanup();
        }
    }, [currentSaved]);

    useEffect(() => {
        router.push(RendererHomePage);
    }, []);

    useEffect(() => {
        app.setGameStateCallback((state) => {
            setGameFlow(state);
        });
    }, [app, setGameFlow]);

    // Get layout component if it exists
    const layoutPage = pages["layout"];
    const LayoutComponent = layoutPage?.registry.component as React.ComponentType<{ children: React.ReactNode }> | undefined;

    const playerContent = (
        <lib.Player
            story={story}
            onReady={() => {
                app.setRouter(router);
                app.setGame(game);
            }}
            onEnd={() => {
                app.setGamePlaying(false);
            }}
            width="100%"
            height="100%"
        >
            {Object.entries(pages).map(([key, page]) => {
                if (key === "layout") return null;
                const PageComponent = page.registry.component;
                return (
                    <Page
                        key={key}
                        id={key}
                        {...merge({}, pageStyles, page.registry.config || {})}
                    >
                        <PageComponent />
                    </Page>
                );
            })}
        </lib.Player>
    );

    const content = LayoutComponent && isFinished ? (
        <LayoutComponent>
            {playerContent}
        </LayoutComponent>
    ) : playerContent;

    return (
        <>
            <SplashScreen splashScreens={splashScreens}>
                {content}
            </SplashScreen>
        </>
    );
}

const AppPlayer = (props: {
    story: InstanceType<NarraLeafReact["Story"]>;
    pages: Pages;
    lib: NarraLeafReact;
    meta: Meta;
}) => {
    return (
        <AppPlayerContent {...props} />
    );
}

export {AppPlayer};


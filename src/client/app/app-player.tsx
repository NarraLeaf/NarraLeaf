import React, {useEffect, useRef} from "react";
import {Meta} from "@/client/app/types";
import {SplashScreen} from "@/client/app/splash-screen/splash-screen";
import {useApp, useCurrentSaved} from "@/client";
import {AsyncTaskQueue} from "@/utils/pure/array";
import {NarraLeafMainWorldProperty, RendererHomePage} from "@core/build/constants";
import {PageConfig, Pages} from "@/client/app/app";
import { Page, useGame, useRouter } from "narraleaf-react";
import merge from "lodash/merge";

type NarraLeafReact = typeof import("narraleaf-react");

const AppPlayer = ({story, pages, lib, meta}: {
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

    const pageStyles: PageConfig = {
        style: {
            position: "absolute",
            inset: 0,
        },
    };

    useEffect(() => {
        if (currentSaved) {
            queue.current.clear().push(async () => {
                await window[NarraLeafMainWorldProperty].game.save.createRecovery(currentSaved);
            });
        }
    }, [currentSaved]);

    useEffect(() => {
        router.push(RendererHomePage);
    }, []);

    return (
        <>
            <SplashScreen splashScreens={splashScreens}>
                <lib.Player
                    story={story}
                    onReady={() => {
                        app.setRouter(router);
                        app.setGame(game);
                    }}
                    width="100%"
                    height="100%"
                >
                    {Object.entries(pages).map(([key, page]) => {
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
            </SplashScreen>
        </>
    );
}

export {AppPlayer};


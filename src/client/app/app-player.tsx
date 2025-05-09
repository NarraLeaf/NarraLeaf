import React, { useEffect, useRef } from "react";
import { GameMetadata } from "@/client/app/types";
import { SplashScreen } from "@/client/app/splash-screen/splash-screen";
import { useApp, useCurrentSaved } from "@/client";
import { AsyncTaskQueue } from "@/utils/pure/array";
import { NarraLeafMainWorldProperty, RendererHomePage } from "@core/build/constants";
import { PageConfig, Pages } from "@/client/app/app";
import { Page, Stage, useGame, useRouter } from "narraleaf-react";
import merge from "lodash/merge";
import { useSplashScreen } from "@/client/app/providers/splash-screen-provider";
import { useGamePlayback } from "@/client/app/providers/game-state-provider";
import { isValidImageUrl, throttle } from "./utils/data";

type NarraLeafReact = typeof import("narraleaf-react");

const GameStageProxy = ({ backgroundImage, children }: { backgroundImage: string | undefined, children: React.ReactNode }) => {
    const { isPlaying } = useGamePlayback();

    console.debug("[NarraLeaf Client] GameStageProxy", isPlaying);

    if (isPlaying) {
        return (
            <>
                {children}
            </>
        )
    }

    return (
        <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat w-full h-full"
            style={{ backgroundImage: backgroundImage ? `url('${backgroundImage}')` : undefined }}
        >
            {children}
        </div>
    );
}

const AppPlayerContent = ({ story, pages, lib, metadata }: {
    story: InstanceType<NarraLeafReact["Story"]>;
    pages: Pages;
    lib: NarraLeafReact;
    metadata: GameMetadata;
}) => {
    const splashScreens = metadata.splashScreen
        ? Array.isArray(metadata.splashScreen)
            ? metadata.splashScreen
            : [metadata.splashScreen]
        : null;
    const currentSaved = useCurrentSaved();
    const queue = useRef(new AsyncTaskQueue());
    const router = useRouter();
    const game = useGame();
    const app = useApp();
    const { isPlaying } = useGamePlayback();
    const { isFinished } = useSplashScreen();

    const pageStyles: PageConfig = {
        style: {
            position: "absolute",
            inset: 0,
        },
    };

    // Get layout component if it exists
    const { layout, ...stagePages } = pages;
    const LayoutComponent = layout?.registry.component as React.ComponentType<{ children: React.ReactNode }> | undefined;

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

        console.debug("[NarraLeaf Client] stagePages", stagePages);
    }, []);

    useEffect(() => {
        if (metadata.backgroundImage && !isValidImageUrl(metadata.backgroundImage)) {
            console.error(`Invalid background image URL: ${metadata.backgroundImage}`);
        }
        const backgroundImage = metadata.backgroundImage && isValidImageUrl(metadata.backgroundImage)
            ? metadata.backgroundImage
            : undefined;

        game.configure({
            stage: (
                <Stage className="inset-0 w-full h-full" key="stage">
                    <GameStageProxy backgroundImage={backgroundImage}>
                        {metadata.stage}
                    </GameStageProxy>
                </Stage>
            ),
        });
    }, [isPlaying]);

    const handleEnd = () => {
        app.dispatchState({ isPlaying: false });
    };
    const handleReady = () => {
        app.setRouter(router);
        app.setGame(game);
    };

    const playerContent = (
        <lib.Player
            story={story}
            onReady={handleReady}
            onEnd={handleEnd}
            width="100%"
            height="100%"
        >
            {Object.entries(stagePages).map(([key, page]) => {
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
    metadata: GameMetadata;
}) => {
    return (
        <AppPlayerContent {...props} />
    );
}

export { AppPlayer };


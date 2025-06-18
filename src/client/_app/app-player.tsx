import React, { useCallback, useEffect, useRef, useState } from "react";
import { GameMetadata } from "@/client/_app/types";
import { SplashScreen } from "@/client/_app/splash-screen/splash-screen";
import { useApp, useCurrentSaved } from "@/client";
import { AsyncTaskQueue } from "@/utils/pure/array";
import { NarraLeafMainWorldProperty, RendererHomePage } from "@core/build/constants";
import { PageConfig, Pages } from "@/client/_app/app";
import { Page, SavedGame, Stage, useGame, useRouter } from "narraleaf-react";
import merge from "lodash/merge";
import { useSplashScreen } from "@/client/_app/providers/splash-screen-provider";
import { useGamePlayback } from "@/client/_app/providers/game-state-provider";
import { isValidImageUrl, throttle } from "./utils/data";

// Add new hook for background image preloading
const useBackgroundImagePreload = (backgroundImage: string | undefined) => {
    const imageCache = useRef<Map<string, HTMLImageElement>>(new Map());

    useEffect(() => {
        if (!backgroundImage || !isValidImageUrl(backgroundImage)) {
            return;
        }

        // Check if image is already in cache
        if (imageCache.current.has(backgroundImage)) {
            return;
        }

        // Preload image
        const img = new Image();
        img.src = backgroundImage;
        
        img.onload = () => {
            imageCache.current.set(backgroundImage, img);
        };
        
        img.onerror = () => {
            console.error(`Failed to preload background image: ${backgroundImage}`);
            imageCache.current.delete(backgroundImage);
        };

        return () => {
            img.onload = null;
            img.onerror = null;
        };
    }, [backgroundImage]);

    return imageCache;
};

type NarraLeafReact = typeof import("narraleaf-react");

const GameStageProxy = ({ backgroundImage, children }: { backgroundImage: string | undefined, children: React.ReactNode }) => {
    const { isPlaying } = useGamePlayback();
    const [isImageLoaded, setIsImageLoaded] = useState(false);
    const [imageError, setImageError] = useState(false);
    const imageCache = useBackgroundImagePreload(backgroundImage);

    useEffect(() => {
        if (!backgroundImage) {
            setIsImageLoaded(false);
            setImageError(false);
            return;
        }

        // Check if image is already in cache
        const cachedImage = imageCache.current.get(backgroundImage);
        if (cachedImage) {
            setIsImageLoaded(true);
            setImageError(false);
            return;
        }

        // Create new image and cache it
        const img = new Image();
        img.src = backgroundImage;
        
        img.onload = () => {
            imageCache.current.set(backgroundImage, img);
            setIsImageLoaded(true);
            setImageError(false);
        };
        
        img.onerror = () => {
            console.error(`Failed to load background image: ${backgroundImage}`);
            setImageError(true);
            setIsImageLoaded(false);
            imageCache.current.delete(backgroundImage);
        };

        // Cleanup function
        return () => {
            img.onload = null;
            img.onerror = null;
        };
    }, [backgroundImage]);

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
            style={{ 
                backgroundImage: backgroundImage && !imageError ? `url('${backgroundImage}')` : undefined,
                opacity: isImageLoaded ? 1 : 0
            }}
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

    // Start preloading background image during splash screen
    const backgroundImage = metadata.backgroundImage && isValidImageUrl(metadata.backgroundImage)
        ? metadata.backgroundImage
        : undefined;
    useBackgroundImagePreload(backgroundImage);

    const pageStyles: PageConfig = {
        style: {
            position: "absolute",
            inset: 0,
        },
    };

    const [throttledSaveHandler] = useState(() => 
        throttle(async (savedGame: SavedGame) => {
            queue.current.clear().push(async () => {
                await window[NarraLeafMainWorldProperty].game.save.createRecovery(savedGame);
            });
        }, app.appInfo.config.recoveryCreationInterval)
    );

    const createRecovery = useCallback((savedGame: SavedGame) => {
        throttledSaveHandler(savedGame);
    }, [throttledSaveHandler]);

    // Get layout component if it exists
    const { layout, ...stagePages } = pages;
    const LayoutComponent = layout?.registry.component as React.ComponentType<{ children: React.ReactNode }> | undefined;

    useEffect(() => {
        if (currentSaved) {
            createRecovery(currentSaved);
        }
    }, [currentSaved]);

    useEffect(() => {
        // router.push(RendererHomePage);

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
        // router.push(RendererHomePage);
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
                return (void 0
                    // <Page
                    //     key={key}
                    //     id={key}
                    //     {...merge({}, pageStyles, page.registry.config || {})}
                    // >
                    //     <PageComponent />
                    // </Page>
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


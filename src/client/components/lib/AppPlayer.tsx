import { RecoveryAnnouncer } from "@/client/components/Announcers/Recovery";
import { ErrorInfo, useCallback, useEffect } from "react";
import { useApp } from "./providers/AppProvider";
import { RendererAppRootProps } from "../components.types";
import { Player, useGame } from "narraleaf-react";
import { RootPages } from "./pages/Pages";

export function AppPlayer({config}: {config: RendererAppRootProps}) {
    const app = useApp();
    const game = useGame();

    useEffect(() => {
        console.log("AppPlayer mounted");
        
        app.state.set("isPlaying", false);
    }, []);

    const handleReady = useCallback(() => {
        console.log("AppPlayer ready");
    }, []);

    const handleEnd = useCallback(() => {
        console.log("AppPlayer end");

        app.state.set("isPlaying", false);
    }, []);

    const handleError = (error: Error, errorInfo: ErrorInfo) => {
        console.error("AppPlayer error handler");
        console.error(error, errorInfo);

        // Throws the error again and bubbles up to the parent error boundary.
        // Used to force NarraLeaf to take over error handling.
        throw error;
    };

    return (
        <>
            <RecoveryAnnouncer />
            <Player
                story={config.metadata.story}
                onReady={handleReady}
                onEnd={handleEnd}
                onError={handleError}
                width="100%"
                height="100%"
            >
                <RootPages appRouterData={config.appRouterData} />
            </Player>
        </>
    );
}

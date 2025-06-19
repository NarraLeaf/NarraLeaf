import { useCurrentSaved } from "@/client/app/game/save/gameSaveHooks";
import { throttle } from "@/client/app/utils/data";
import { useApp } from "@/client/components/lib/providers/AppProvider";
import { AsyncTaskQueue } from "@/utils/pure/array";
import { SavedGame } from "narraleaf-react";
import { useCallback, useEffect, useRef, useState } from "react";

export function RecoveryAnnouncer() {
    const currentSaved = useCurrentSaved();
    const queue = useRef(new AsyncTaskQueue());
    const app = useApp();

    const [throttledSaveHandler] = useState(() => 
        throttle(async (savedGame: SavedGame) => {
            queue.current.clear().push(async () => {
                await app.createRecovery(savedGame);
            });
        }, app.config.appInfo.config.recoveryCreationInterval)
    );

    const createRecovery = useCallback((savedGame: SavedGame) => {
        throttledSaveHandler(savedGame);
    }, [throttledSaveHandler]);

    useEffect(() => {
        if (currentSaved) {
            createRecovery(currentSaved);
        }
    }, [currentSaved]);

    return null;
}

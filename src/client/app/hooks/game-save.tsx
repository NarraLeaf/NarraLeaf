import {SavedGame, SavedGameMetadata} from "@core/game/save";
import {useFlush} from "@/client/app/utils/flush";
import {LiveGame, useGame} from "narraleaf-react";
import React, {useEffect} from "react";
import {NarraLeafMainWorldProperty} from "@core/build/constants";
import {safeClone} from "@/utils/pure/object";

export type UseSaveActionResult = {
    save: (id: string) => Promise<void>;
    quickSave: () => Promise<void>;
};

export type UseSavedGameResult = {
    results: SavedGameMetadata[] | [],
    error: Error | null,
    isLoading: boolean,
    refetch: () => void,
};

export function useCurrentSaved(): SavedGame | null {
    const [flush] = useFlush();
    const game = useGame();

    const liveGame = game.getLiveGame();

    useEffect(() => {
        return liveGame.events.depends([
            liveGame.events.on(LiveGame.EventTypes["event:menu.choose"], onStateChange),
            liveGame.events.on(LiveGame.EventTypes["event:character.prompt"], onStateChange),
        ]).cancel;
    }, [liveGame]);

    function onStateChange() {
        flush();
    }

    function getSavedGame(): SavedGame | null {
        try {
            return safeClone(liveGame.serialize());
        } catch (e) {
            return null;
        }
    }

    return getSavedGame();
}

export function useCurrentSavedRef(): React.RefObject<SavedGame | null> {
    const game = useGame();
    const liveGame = game.getLiveGame();
    const ref = React.useRef<SavedGame | null>(null);

    useEffect(() => {
        return liveGame.events.depends([
            liveGame.events.on(LiveGame.EventTypes["event:menu.choose"], onStateChange),
            liveGame.events.on(LiveGame.EventTypes["event:character.prompt"], onStateChange),
        ]).cancel;
    }, [liveGame]);

    function onStateChange() {
        ref.current = getSavedGame();
    }

    function getSavedGame(): SavedGame | null {
        try {
            return safeClone(liveGame.serialize());
        } catch (e) {
            return null;
        }
    }

    return ref;
}

export function useSaveAction(): UseSaveActionResult {
    const game = useGame();
    const currentSaved = useCurrentSavedRef();

    async function save(name: string): Promise<void> {
        if (currentSaved.current) {
            let preview: undefined | string = undefined;
            try {
                preview = await game.getLiveGame().capturePng()
            } catch (e) {
                console.error(e);
            }
            await window[NarraLeafMainWorldProperty].game.save.save(currentSaved.current, name, preview);
        }
    }

    async function quickSave(): Promise<void> {
        if (currentSaved.current) {
            await window[NarraLeafMainWorldProperty].game.save.quickSave(currentSaved.current);
        }
    }

    return {
        save,
        quickSave,
    };
}

export function useSavedGames(deps: React.DependencyList = []): UseSavedGameResult | null {
    const [results, setResults] = React.useState<SavedGameMetadata[]>([]);
    const [error, setError] = React.useState<Error | null>(null);
    const [isLoading, setLoading] = React.useState<boolean>(false);

    const taskRef = React.useRef<Promise<void> | null>(null);

    const load = async () => {
        setLoading(true);
        setError(null);

        const res = await window[NarraLeafMainWorldProperty].game.save.list()
        if (!res.success) {
            throw new Error(res.error);
        }

        setResults(res.data);
    };

    const refetch = () => {
        const currentTask = taskRef.current ?? Promise.resolve();
        const nextTask = currentTask.then(() => load());

        taskRef.current = nextTask;
        return nextTask;
    };

    React.useEffect(() => {
        refetch()
    }, deps);

    return {
        results,
        error,
        isLoading,
        refetch,
    }
}


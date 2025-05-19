import { SavedGame, SavedGameMetadata } from "@/client/app/types";
import { useFlush } from "@/client/app/utils/flush";
import { LiveGame, useGame } from "narraleaf-react";
import React, { useEffect } from "react";
import { NarraLeafMainWorldProperty, QuickSaveId } from "@core/build/constants";
import { safeClone } from "@/utils/pure/object";

export type UseSaveActionResult = {
    save: (id: string) => Promise<void>;
    read: (id: string) => Promise<SavedGame>;
    quickSave: () => Promise<void>;
    quickRead: () => Promise<SavedGame>;
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

    async function save(name: string): Promise<void> {
        const data = game.getLiveGame().serialize();

        let preview: undefined | string = undefined;
        try {
            preview = await game.getLiveGame().capturePng()
        } catch (e) {
            console.error(e);
        }
        await window[NarraLeafMainWorldProperty].game.save.save(data, name, preview);
    }

    async function read(id: string): Promise<SavedGame> {
        const res = await window[NarraLeafMainWorldProperty].game.save.read(id);
        if (!res.success) {
            throw new Error(res.error);
        }
        return res.data;
    }

    async function quickSave(): Promise<void> {
        const data = game.getLiveGame().serialize();
        await window[NarraLeafMainWorldProperty].game.save.quickSave(data);
    }

    async function quickRead(): Promise<SavedGame> {
        const res = await window[NarraLeafMainWorldProperty].game.save.read(QuickSaveId);
        if (!res.success) {
            throw new Error(res.error);
        }
        return res.data;
    }

    return {
        save,
        read,
        quickSave,
        quickRead,
    };
}

export function useSavedGames(deps: React.DependencyList = []): UseSavedGameResult {
    const [results, setResults] = React.useState<SavedGameMetadata[]>([]);
    const [error, setError] = React.useState<Error | null>(null);
    const [isLoading, setLoading] = React.useState<boolean>(false);

    const taskRef = React.useRef<Promise<void> | null>(null);

    const load = async () => {
        setLoading(true);
        setError(null);

        const res = await window[NarraLeafMainWorldProperty].game.save.list()
        if (!res.success) {
            setLoading(false);
            setError(new Error(res.error));
            return;
        }

        setResults(res.data);
        setLoading(false);
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

export async function readGame(id: string): Promise<SavedGame> {
    const res = await window[NarraLeafMainWorldProperty].game.save.read(id);
    if (!res.success) {
        throw new Error(res.error);
    }
    return res.data;
}

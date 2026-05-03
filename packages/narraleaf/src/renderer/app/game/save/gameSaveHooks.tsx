import { useFlush } from "@renderer/components/lib/utils/flush";
import { LiveGame, SavedGame, useGame } from "narraleaf-react";
import React, { useCallback, useEffect } from "react";
import { NarraLeaf, QuickSaveId } from "@narraleaf/shared";
import { safeClone } from "@shared/utils/object";
import { SavedGameMeta } from "@shared/types/save";

export type UseSaveActionResult = {
    save: (id: string) => Promise<void>;
    read: (id: string) => Promise<SavedGame | null>;
    quickSave: () => Promise<void>;
    quickRead: () => Promise<SavedGame | null>;
};

export type UseSavedGameResult = {
    results: SavedGameMeta[] | [],
    error: Error | null,
    isLoading: boolean,
    refetch: () => Promise<void>,
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
            preview = await game.getLiveGame().captureJpeg()
        } catch (e) {
            console.error(e);
        }
        const res = await window[NarraLeaf].game.save.save(data, name, preview);
        if (!res.success) {
            throw new Error(res.error ?? "Save failed");
        }
    }

    async function read(id: string): Promise<SavedGame | null> {
        const res = await window[NarraLeaf].game.save.read(id);
        if (!res.success) {
            throw new Error(res.error);
        }
        if (!res.data || !("savedGame" in res.data)) {
            return null;
        }
        return res.data.savedGame;
    }

    async function quickSave(): Promise<void> {
        const data = game.getLiveGame().serialize();
        const res = await window[NarraLeaf].game.save.quickSave(data);
        if (!res.success) {
            throw new Error(res.error ?? "Quick save failed");
        }
    }

    async function quickRead(): Promise<SavedGame | null> {
        const res = await window[NarraLeaf].game.save.read(QuickSaveId);
        if (!res.success) {
            throw new Error(res.error ?? "Quick read failed");
        }
        if (!res.data || !("savedGame" in res.data)) {
            return null;
        }
        return res.data.savedGame;
    }

    return {
        save,
        read,
        quickSave,
        quickRead,
    };
}

export function useSavedGames(deps: React.DependencyList = []): UseSavedGameResult {
    const [results, setResults] = React.useState<SavedGameMeta[]>([]);
    const [error, setError] = React.useState<Error | null>(null);
    const [isLoading, setLoading] = React.useState<boolean>(false);

    const taskRef = React.useRef<Promise<void> | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);

        const res = await window[NarraLeaf].game.save.list()
        if (!res.success) {
            setLoading(false);
            setError(new Error(res.error));
            return;
        }

        setResults(res.data);
        setLoading(false);
    }, []);

    const refetch = useCallback((): Promise<void> => {
        const previous = taskRef.current ?? Promise.resolve();
        const next = previous
            .catch(() => {
                /* Serialized refetch must survive a failed load. */
            })
            .then(() => load());
        taskRef.current = next;
        return next;
    }, [load]);

    React.useEffect(() => {
        void refetch();
    }, [...deps, refetch]);

    return {
        results,
        error,
        isLoading,
        refetch,
    }
}

export async function readGame(id: string): Promise<SavedGame | null> {
    const res = await window[NarraLeaf].game.save.read(id);
    if (!res.success) {
        throw new Error(res.error);
    }
    if (!res.data || !("savedGame" in res.data)) {
        return null;
    }
    return res.data.savedGame;
}

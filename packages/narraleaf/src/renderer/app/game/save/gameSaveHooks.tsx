import { useFlush } from "@renderer/components/lib/utils/flush";
import { LiveGame, SavedGame, useGame } from "narraleaf-react";
import React, { useCallback, useEffect } from "react";
import { NarraLeaf, QuickSaveId } from "@narraleaf/shared";
import { safeClone } from "@shared/utils/object";
import { SavedGameMeta } from "@shared/types/save";

/** Return shape of {@link useSaveAction}: imperative save/load helpers backed by preload IPC. */
export type UseSaveActionResult = {
    save: (id: string) => Promise<void>;
    read: (id: string) => Promise<SavedGame | null>;
    quickSave: () => Promise<void>;
    quickRead: () => Promise<SavedGame | null>;
};

/** Return shape of {@link useSavedGames}: async list state with serialized `refetch`. */
export type UseSavedGameResult = {
    results: SavedGameMeta[] | [],
    error: Error | null,
    isLoading: boolean,
    refetch: () => Promise<void>,
};

/**
 * Serializes the current {@link LiveGame} snapshot for menus / previews. Returns `null` when serialization fails.
 */
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

/**
 * Like {@link useCurrentSaved}, but keeps the latest snapshot in a ref (useful for callbacks without re-rendering).
 */
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

/**
 * Imperative save/load helpers for the active game session.
 *
 * **Errors:** `save`, `quickSave`, and bridge failures **throw** (they do not return soft failures).
 *
 * @example
 * ```ts
 * const { save, read, quickSave } = useSaveAction();
 * await save("chapter-2");
 * ```
 */
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

/**
 * Lists save metadata from the main process with loading/error state.
 *
 * `refetch` is serialized: failures do not block later refreshes, and the returned promise always settles.
 */
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

/**
 * Non-hook read helper for a save slot by `id` (throws on IPC failure; returns `null` when missing/corrupt).
 */
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

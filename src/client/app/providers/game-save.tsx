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
    result: SavedGameMetadata[] | [],
    error: Error | null,
    isLoading: boolean,
    refetch: () => void,
};

export function useCurrentSaved(): SavedGame | null {
    const [flush] = useFlush();
    const {game} = useGame();

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
    const {game} = useGame();
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
    const currentSaved = useCurrentSavedRef();

    async function save(name: string): Promise<void> {
        if (currentSaved.current) {
            await window[NarraLeafMainWorldProperty].game.save.save(currentSaved.current, name);
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
    return null;
}


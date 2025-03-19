import {SavedGame} from "@core/game/save";
import {useFlush} from "@/client/app/utils/flush";
import {LiveGame, useGame} from "narraleaf-react";
import {useEffect} from "react";
import {NarraLeafMainWorldProperty} from "@core/build/constants";
import {safeClone} from "@/utils/pure/object";

export type UseSaveResult = {
    save: (name: string) => Promise<void>;
    quickSave: () => Promise<void>;
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

export function useSave(): UseSaveResult {
    const currentSaved = useCurrentSaved();

    async function save(name: string): Promise<void> {
        if (currentSaved) {
            await window[NarraLeafMainWorldProperty].game.save.save(currentSaved, name);
        }
    }

    async function quickSave(): Promise<void> {
        if (currentSaved) {
            await window[NarraLeafMainWorldProperty].game.save.quickSave(currentSaved);
        }
    }

    return {
        save,
        quickSave,
    };
}


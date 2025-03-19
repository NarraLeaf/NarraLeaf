import {SavedGame} from "@core/game/save";
import {useFlush} from "@/client/app/utils/flush";
import {LiveGame, useGame} from "narraleaf-react";
import {useEffect} from "react";

export function useCurrentSaved(): SavedGame | null {
    const [flush] = useFlush();
    const {game} = useGame();

    const liveGame = game.getLiveGame();

    useEffect(() => {
        return liveGame.events.depends([
            liveGame.events.on(LiveGame.EventTypes["event:menu.choose"], onStateChange),
            liveGame.events.on(LiveGame.EventTypes["event:character.prompt"], onStateChange),
        ]).cancel;
    }, []);

    function onStateChange() {
        flush();
    }

    function getSavedGame(): SavedGame | null {
        try {
            return liveGame.serialize();
        } catch (e) {
            return null;
        }
    }

    return getSavedGame();
}


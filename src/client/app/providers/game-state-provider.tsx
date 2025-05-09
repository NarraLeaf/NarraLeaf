import { useEffect, useState } from "react";
import { useApp } from "./app";

export interface GamePlaybackState {
    isPlaying: boolean;
}

export function useGamePlayback(): GamePlaybackState {
    const app = useApp();
    const [state, setState] = useState(app.getState());

    useEffect(() => {
        return app.onStateChanged(() => {
            setState(app.getState());
        }).cancel;
    }, [app]);

    return state;
} 
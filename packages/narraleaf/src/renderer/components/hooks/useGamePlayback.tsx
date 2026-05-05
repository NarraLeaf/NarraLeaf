import { useApp } from "../lib/providers/AppProvider";
import { useAppState } from "./useAppState";


/** Read-only view of high-level playback state derived from {@link useAppState}. */
export interface GamePlaybackState {
    isPlaying: boolean;
}

/** Convenience selector over `useAppState("isPlaying")` for UI that only needs in-game vs idle. */
export function useGamePlayback(): GamePlaybackState {
    const app = useApp();
    const [isPlaying] = useAppState("isPlaying");

    return {
        isPlaying,
    };
} 
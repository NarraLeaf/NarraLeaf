import { useEffect, useState } from "react";
import { useApp } from "../lib/providers/AppProvider";
import { useAppState } from "./useAppState";


export interface GamePlaybackState {
    isPlaying: boolean;
}

export function useGamePlayback(): GamePlaybackState {
    const app = useApp();
    const [isPlaying] = useAppState("isPlaying");

    return {
        isPlaying,
    };
} 
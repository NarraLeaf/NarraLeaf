import React, {createContext, useContext, useState} from "react";

export interface GamePlaybackState {
    isPlaying: boolean;
}

type GamePlaybackContextType = {
    gamePlaybackState: GamePlaybackState;
    setGamePlaybackState: (state: GamePlaybackState | ((prevState: GamePlaybackState) => GamePlaybackState)) => void;
};

const GamePlaybackContext = createContext<GamePlaybackContextType | null>(null);

export function GamePlaybackProvider({children}: { children: React.ReactNode }) {
    const [gamePlaybackState, setGamePlaybackState] = useState<GamePlaybackState>({
        isPlaying: false
    });

    return (
        <GamePlaybackContext.Provider value={{gamePlaybackState, setGamePlaybackState}}>
            {children}
        </GamePlaybackContext.Provider>
    );
}

export function useGamePlayback() {
    const context = useContext(GamePlaybackContext);
    if (!context) {
        throw new Error("useGamePlayback must be used within a GamePlaybackProvider");
    }
    return context;
} 
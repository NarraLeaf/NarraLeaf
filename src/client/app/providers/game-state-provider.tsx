import React, {createContext, useContext, useState} from "react";

interface GameFlow {
    isPlaying: boolean;
}

interface GameFlowContextType {
    gameFlow: GameFlow;
    setGameFlow: (flow: GameFlow) => void;
}

const GameFlowContext = createContext<GameFlowContextType | null>(null);

export function GameFlowProvider({children}: { children: React.ReactNode }) {
    const [gameFlow, setGameFlow] = useState<GameFlow>({
        isPlaying: false
    });

    return (
        <GameFlowContext.Provider value={{gameFlow, setGameFlow}}>
            {children}
        </GameFlowContext.Provider>
    );
}

export function useGameFlow() {
    const context = useContext(GameFlowContext);
    if (!context) {
        throw new Error("useGameFlow must be used within a GameFlowProvider");
    }
    return context;
} 